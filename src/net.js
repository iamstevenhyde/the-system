// Transport contract. LocalNet mirrors the Supabase RPCs in schema_sys.sql one to one:
//   createSession(pin) -> {code, hostToken}
//   join(code, name, token?) -> {teamId, teamToken, code}     (rejoin needs the saved token)
//   submit(code, teamToken, round, decision)                  (only while status 'open' and round matches)
//   teamView(code, teamToken) -> {teamId, name, view, draft, public}
//   hostGet(code, hostToken) -> {session, state, teams, decisions, public}
//   hostAddTeam(code, hostToken, name) -> {teamId, teamToken}
//   hostPublish(code, hostToken, status, public, state?, views?)
//   commitRound(code, hostToken, round, state, public, views, done) -> {ok} | {ok:false, reason:'already committed'}
//   hostReset(code, hostToken)
//   getPublic(code) -> public payload     (anon select on sys_public, used by the projector)
//   subscribe(code, cb) -> unsubscribe     (fires when the public payload changes)
// Status values: lobby | open | locked | done. Team and host tokens are stored, never returned by reads.
// Decisions and full state are never in the public payload or a team view.

export class MemoryStorage {
  constructor() { this.m = new Map(); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}
const clone = o => (o === undefined || o === null ? o : JSON.parse(JSON.stringify(o)));
const rid = n => Array.from({ length: n }, () => 'abcdefghjkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 31)]).join('');
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const newCode = () => Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

export class LocalNet {
  constructor({ storage, channel = true } = {}) {
    this.st = storage || globalThis.localStorage || new MemoryStorage();
    this.bc = channel && typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('the-system') : null;
    this.subs = new Set();
    if (this.bc) this.bc.onmessage = e => this._fire(e.data.code);
    if (typeof addEventListener === 'function' && this.st === globalThis.localStorage) addEventListener('storage', e => { if (e.key?.startsWith('sys:s:')) this._fire(e.key.slice(6)); });
  }
  _fire(code) { for (const [c, cb] of this.subs) if (c === code) { try { cb(); } catch (e) { console.error(e); } } }
  _load(code) { const raw = this.st.getItem('sys:s:' + String(code || '').toUpperCase()); return raw ? JSON.parse(raw) : null; }
  _save(s, notify = true) {
    this.st.setItem('sys:s:' + s.code, JSON.stringify(s));
    if (notify) { this.bc?.postMessage({ code: s.code }); this._fire(s.code); }
  }
  _host(code, token) {
    const s = this._load(code);
    if (!s || s.hostToken !== token) throw new Error('not authorized');
    return s;
  }
  _team(code, token) {
    const s = this._load(code);
    const t = s && Object.values(s.teams).find(x => x.token === token);
    if (!t) throw new Error('not authorized');
    return { s, t };
  }

  async createSession(pin) {
    if (String(pin || '').length < 4) throw new Error('pin too short');
    let code = newCode();
    while (this._load(code)) code = newCode();
    const hostToken = rid(36) + pin;
    this._save({ code, hostToken, status: 'lobby', round: 1, version: 0, teams: {}, decisions: {}, state: null, public: { status: 'lobby', round: 1, teams: [] }, seq: 0 });
    return { code, hostToken };
  }
  async join(code, name, token = null) {
    const s = this._load(code);
    if (!s) throw new Error('no such game');
    name = String(name || '').trim();
    const same = Object.values(s.teams).find(t => t.name.toLowerCase() === name.toLowerCase());
    if (same) {
      if (token && same.token === token) return { teamId: same.id, teamToken: token, code: s.code };
      throw new Error('name taken');
    }
    if (s.status !== 'lobby') throw new Error('game already started; ask the instructor to add you');
    if (name.length < 2 || name.length > 40) throw new Error('bad name');
    const id = 't' + (++s.seq), teamToken = rid(24);
    s.teams[id] = { id, name, token: teamToken, view: null };
    this._save(s, false);
    return { teamId: id, teamToken, code: s.code };
  }
  async submit(code, teamToken, round, decision) {
    const { s, t } = this._team(code, teamToken);
    if (s.status !== 'open' || s.round !== round) throw new Error('round is locked');
    if (JSON.stringify(decision).length > 8000) throw new Error('decision too large');
    (s.decisions[round] ||= {})[t.id] = clone(decision);
    this._save(s);
    return { ok: true, round };
  }
  async teamView(code, teamToken) {
    const { s, t } = this._team(code, teamToken);
    return clone({ teamId: t.id, name: t.name, view: t.view, draft: s.decisions[s.round]?.[t.id] || null, public: s.public });
  }
  async getPublic(code) {                       // anon read of sys_public
    const s = this._load(code);
    if (!s) throw new Error('no such game');
    return clone(s.public);
  }
  async hostGet(code, hostToken) {
    const s = this._host(code, hostToken);
    return clone({
      session: { code: s.code, status: s.status, round: s.round, version: s.version }, state: s.state,
      teams: Object.values(s.teams).map(t => ({ id: t.id, name: t.name })), decisions: s.decisions[s.round] || {}, public: s.public,
    });
  }
  async hostAddTeam(code, hostToken, name) {
    const s = this._host(code, hostToken);
    const id = 't' + (++s.seq), teamToken = rid(24);
    s.teams[id] = { id, name: String(name).trim(), token: teamToken, view: null };
    this._save(s);
    return { teamId: id, teamToken };
  }
  _apply(s, status, pub, state, views) {
    s.status = status; s.version++;
    s.public = clone(pub);
    if (state != null) s.state = clone(state);
    if (views) for (const [id, v] of Object.entries(views)) if (s.teams[id]) s.teams[id].view = clone(v);
  }
  async hostPublish(code, hostToken, status, pub, state = null, views = null) {
    const s = this._host(code, hostToken);
    if (!['lobby', 'open', 'locked', 'done'].includes(status)) throw new Error('bad status');
    this._apply(s, status, pub, state, views);
    this._save(s);
    return { ok: true };
  }
  async commitRound(code, hostToken, round, state, pub, views, done = false) {
    const s = this._host(code, hostToken);
    if (s.round !== round) return { ok: false, reason: 'already committed', round: s.round };
    s.round = round + 1;
    this._apply(s, done ? 'done' : 'locked', pub, state, views);
    this._save(s);
    return { ok: true, round: s.round };
  }
  async hostReset(code, hostToken) {
    const s = this._host(code, hostToken);
    s.decisions = {}; s.round = 1; s.status = 'lobby'; s.version++; s.state = null;
    for (const t of Object.values(s.teams)) t.view = null;
    this._save(s);
    return { ok: true };
  }
  subscribe(code, cb) {
    const entry = [String(code).toUpperCase(), cb];
    this.subs.add(entry);
    return () => this.subs.delete(entry);
  }
}
