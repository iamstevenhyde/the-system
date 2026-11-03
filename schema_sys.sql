-- The System: Supabase schema. Paste once into the SQL editor of project
-- ziszzyvlevgsjiazgogr. Touches only sys_* objects; inh_* and Parent Trap
-- tables are untouched. Safe to re-run.
--
-- Security model:
--  * Every table has RLS on. Only sys_public is readable by anon (it holds
--    nothing private: names, regions, shares, timer, submitted flags).
--  * All writes go through SECURITY DEFINER functions that check a host token
--    or a team token server-side. Tokens are stored as sha256 hashes.
--  * Decisions and full game state are never readable by anon directly.
--  * sys_commit_round locks the session row and refuses a second commit for
--    the same round, so resolution is atomic and idempotent.

create extension if not exists pgcrypto with schema extensions;

create table if not exists sys_sessions (
  code text primary key,
  host_hash text not null,
  status text not null default 'lobby',     -- lobby | open | locked | done
  round int not null default 1,
  version int not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists sys_state (
  code text primary key references sys_sessions(code) on delete cascade,
  state jsonb
);
create table if not exists sys_teams (
  id uuid primary key default gen_random_uuid(),
  code text not null references sys_sessions(code) on delete cascade,
  name text not null,
  token_hash text not null,
  view jsonb,                                -- this team's private slice, written by the host at commit
  created_at timestamptz not null default now(),
  unique (code, name)
);
create table if not exists sys_decisions (
  code text not null references sys_sessions(code) on delete cascade,
  team_id uuid not null references sys_teams(id) on delete cascade,
  round int not null,
  decision jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (team_id, round)
);
create table if not exists sys_public (
  code text primary key references sys_sessions(code) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  version int not null default 0
);

alter table sys_sessions enable row level security;
alter table sys_state enable row level security;
alter table sys_teams enable row level security;
alter table sys_decisions enable row level security;
alter table sys_public enable row level security;
drop policy if exists sys_public_read on sys_public;
create policy sys_public_read on sys_public for select to anon, authenticated using (true);
-- no other policies: anon cannot read or write the other tables directly.

do $$ begin
  alter publication supabase_realtime add table sys_public;
exception when duplicate_object then null; end $$;

create or replace function sys_hash(t text) returns text language sql immutable as
$$ select encode(extensions.digest(t, 'sha256'), 'hex') $$;

create or replace function sys_check_host(p_code text, p_token text) returns sys_sessions
language plpgsql security definer set search_path = public as $$
declare s sys_sessions;
begin
  select * into s from sys_sessions where code = p_code;
  if s.code is null or s.host_hash <> sys_hash(p_token) then raise exception 'not authorized'; end if;
  return s;
end $$;

-- Create a session. Returns the join code and a host token (shown once).
create or replace function sys_create_session(p_pin text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c text; tok text;
begin
  if coalesce(length(p_pin), 0) < 4 then raise exception 'pin too short'; end if;
  loop
    c := upper(substr(translate(encode(extensions.gen_random_bytes(6), 'base64'), '+/=0O1IL', 'XYZ'), 1, 5));
    exit when length(c) = 5 and not exists (select 1 from sys_sessions where code = c);
  end loop;
  tok := encode(extensions.gen_random_bytes(18), 'hex') || p_pin;
  insert into sys_sessions(code, host_hash) values (c, sys_hash(tok));
  insert into sys_state(code, state) values (c, null);
  insert into sys_public(code, payload) values (c, jsonb_build_object('status', 'lobby', 'round', 1, 'teams', '[]'::jsonb));
  return jsonb_build_object('code', c, 'hostToken', tok);
end $$;

-- Join or rejoin a team. A rejoin must present the stored team token, so a
-- name alone cannot hijack a team. Joining is closed once the game starts,
-- except for rejoin with a valid token.
create or replace function sys_join(p_code text, p_name text, p_token text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sys_sessions; t sys_teams; tok text;
begin
  select * into s from sys_sessions where code = upper(p_code);
  if s.code is null then raise exception 'no such game'; end if;
  select * into t from sys_teams where code = s.code and lower(name) = lower(trim(p_name));
  if t.id is not null then
    if p_token is not null and t.token_hash = sys_hash(p_token) then
      return jsonb_build_object('teamId', t.id, 'teamToken', p_token, 'code', s.code);
    end if;
    raise exception 'name taken';
  end if;
  if s.status <> 'lobby' then raise exception 'game already started; ask the instructor to add you'; end if;
  if length(trim(p_name)) < 2 or length(p_name) > 40 then raise exception 'bad name'; end if;
  tok := encode(extensions.gen_random_bytes(18), 'hex');
  insert into sys_teams(code, name, token_hash) values (s.code, trim(p_name), sys_hash(tok)) returning * into t;
  return jsonb_build_object('teamId', t.id, 'teamToken', tok, 'code', s.code);
end $$;

-- A team saves (or revises) its decision for the current round while open.
create or replace function sys_submit(p_code text, p_token text, p_round int, p_decision jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sys_sessions; t sys_teams;
begin
  select * into s from sys_sessions where code = p_code;
  select * into t from sys_teams where code = p_code and token_hash = sys_hash(p_token);
  if t.id is null then raise exception 'not authorized'; end if;
  if s.status <> 'open' or s.round <> p_round then raise exception 'round is locked'; end if;
  if pg_column_size(p_decision) > 8000 then raise exception 'decision too large'; end if;
  insert into sys_decisions(code, team_id, round, decision) values (p_code, t.id, p_round, p_decision)
  on conflict (team_id, round) do update set decision = excluded.decision, updated_at = now();
  return jsonb_build_object('ok', true, 'round', p_round);
end $$;

-- A team reads its own private view plus the public payload.
create or replace function sys_team_view(p_code text, p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t sys_teams; d jsonb; s sys_sessions;
begin
  select * into t from sys_teams where code = p_code and token_hash = sys_hash(p_token);
  if t.id is null then raise exception 'not authorized'; end if;
  select * into s from sys_sessions where code = p_code;
  select decision into d from sys_decisions where team_id = t.id and round = s.round;
  return jsonb_build_object('teamId', t.id, 'name', t.name, 'view', t.view, 'draft', d,
    'public', (select payload from sys_public where code = p_code));
end $$;

-- Host: everything, including decisions for the current round.
create or replace function sys_host_get(p_code text, p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sys_sessions;
begin
  s := sys_check_host(p_code, p_token);
  return jsonb_build_object('session', to_jsonb(s) - 'host_hash',
    'state', (select state from sys_state where code = p_code),
    'teams', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name)) from sys_teams where code = p_code), '[]'::jsonb),
    'decisions', coalesce((select jsonb_object_agg(team_id, decision) from sys_decisions where code = p_code and round = s.round), '{}'::jsonb),
    'public', (select payload from sys_public where code = p_code));
end $$;

-- Host: add a team on behalf of a late arrival (returns its token for them).
create or replace function sys_host_add_team(p_code text, p_token text, p_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare tok text; t sys_teams;
begin
  perform sys_check_host(p_code, p_token);
  tok := encode(extensions.gen_random_bytes(18), 'hex');
  insert into sys_teams(code, name, token_hash) values (p_code, trim(p_name), sys_hash(tok)) returning * into t;
  return jsonb_build_object('teamId', t.id, 'teamToken', tok);
end $$;

-- Host: change status (lobby/open/locked) and publish public payload + state
-- without advancing the round (start game, timers, pause).
create or replace function sys_host_publish(p_code text, p_token text, p_status text, p_public jsonb, p_state jsonb default null, p_views jsonb default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sys_sessions; k text;
begin
  s := sys_check_host(p_code, p_token);
  if p_status not in ('lobby', 'open', 'locked', 'done') then raise exception 'bad status'; end if;
  update sys_sessions set status = p_status, version = version + 1 where code = p_code;
  update sys_public set payload = p_public, version = version + 1 where code = p_code;
  if p_state is not null then update sys_state set state = p_state where code = p_code; end if;
  if p_views is not null then
    for k in select jsonb_object_keys(p_views) loop
      update sys_teams set view = p_views -> k where code = p_code and id = k::uuid;
    end loop;
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- Host: commit a resolved round atomically. Refuses if the round was already
-- committed (idempotent) or the caller is not the host.
create or replace function sys_commit_round(p_code text, p_token text, p_round int, p_state jsonb, p_public jsonb, p_views jsonb, p_done boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sys_sessions; k text;
begin
  perform sys_check_host(p_code, p_token);
  select * into s from sys_sessions where code = p_code for update;
  if s.round <> p_round then
    return jsonb_build_object('ok', false, 'reason', 'already committed', 'round', s.round);
  end if;
  update sys_sessions set round = p_round + 1, status = case when p_done then 'done' else 'locked' end, version = version + 1 where code = p_code;
  update sys_state set state = p_state where code = p_code;
  update sys_public set payload = p_public, version = version + 1 where code = p_code;
  for k in select jsonb_object_keys(p_views) loop
    update sys_teams set view = p_views -> k where code = p_code and id = k::uuid;
  end loop;
  return jsonb_build_object('ok', true, 'round', p_round + 1);
end $$;

-- Host: wipe the session for a restart (keeps the code and teams).
create or replace function sys_host_reset(p_code text, p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform sys_check_host(p_code, p_token);
  delete from sys_decisions where code = p_code;
  update sys_sessions set round = 1, status = 'lobby', version = version + 1 where code = p_code;
  update sys_state set state = null where code = p_code;
  update sys_teams set view = null where code = p_code;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function sys_check_host(text, text) from public, anon, authenticated;
grant execute on function sys_create_session(text), sys_join(text, text, text), sys_submit(text, text, int, jsonb),
  sys_team_view(text, text), sys_host_get(text, text), sys_host_add_team(text, text, text),
  sys_host_publish(text, text, text, jsonb, jsonb, jsonb), sys_commit_round(text, text, int, jsonb, jsonb, jsonb, boolean),
  sys_host_reset(text, text) to anon, authenticated;
