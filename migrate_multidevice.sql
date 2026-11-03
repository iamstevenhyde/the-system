-- Multi-device teams: a second device that types the same team name joins that team.
alter table sys_teams add column if not exists join_token text;

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
    if t.join_token is not null then
      return jsonb_build_object('teamId', t.id, 'teamToken', t.join_token, 'code', s.code);
    end if;
    raise exception 'name taken';
  end if;
  if s.status <> 'lobby' then raise exception 'game already started; ask the instructor to add you'; end if;
  if length(trim(p_name)) < 2 or length(p_name) > 40 then raise exception 'bad name'; end if;
  tok := encode(extensions.gen_random_bytes(18), 'hex');
  insert into sys_teams(code, name, token_hash, join_token) values (s.code, trim(p_name), sys_hash(tok), tok) returning * into t;
  return jsonb_build_object('teamId', t.id, 'teamToken', tok, 'code', s.code);
end $$;
