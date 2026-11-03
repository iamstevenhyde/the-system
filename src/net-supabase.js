// SupabaseNet: same async interface as LocalNet, implemented with rpc() calls from schema_sys.sql
// and a realtime subscription on sys_public. Not exercised against the live project in this build.
import { SUPA_URL, SUPA_ANON_KEY } from '../config.js';

const SB_SRC = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

export class SupabaseNet {
  constructor() { this.client = null; this.channels = new Map(); }
  async _c() {
    if (!this.client) {
      const { createClient } = await import(SB_SRC);
      this.client = createClient(SUPA_URL, SUPA_ANON_KEY, { realtime: { params: { eventsPerSecond: 10 } } });
    }
    return this.client;
  }
  async _rpc(fn, args) {
    const { data, error } = await (await this._c()).rpc(fn, args);
    if (error) throw new Error(error.message);
    return data;
  }
  createSession(pin) { return this._rpc('sys_create_session', { p_pin: pin }); }
  join(code, name, token = null) { return this._rpc('sys_join', { p_code: String(code).toUpperCase(), p_name: name, p_token: token }); }
  submit(code, teamToken, round, decision) { return this._rpc('sys_submit', { p_code: code, p_token: teamToken, p_round: round, p_decision: decision }); }
  teamView(code, teamToken) { return this._rpc('sys_team_view', { p_code: code, p_token: teamToken }); }
  hostGet(code, hostToken) { return this._rpc('sys_host_get', { p_code: code, p_token: hostToken }); }
  hostAddTeam(code, hostToken, name) { return this._rpc('sys_host_add_team', { p_code: code, p_token: hostToken, p_name: name }); }
  hostPublish(code, hostToken, status, pub, state = null, views = null) {
    return this._rpc('sys_host_publish', { p_code: code, p_token: hostToken, p_status: status, p_public: pub, p_state: state, p_views: views });
  }
  commitRound(code, hostToken, round, state, pub, views, done = false) {
    return this._rpc('sys_commit_round', { p_code: code, p_token: hostToken, p_round: round, p_state: state, p_public: pub, p_views: views, p_done: done });
  }
  hostReset(code, hostToken) { return this._rpc('sys_host_reset', { p_code: code, p_token: hostToken }); }
  async getPublic(code) {
    const { data, error } = await (await this._c()).from('sys_public').select('payload').eq('code', String(code).toUpperCase()).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('no such game');
    return data.payload;
  }
  subscribe(code, cb) {
    code = String(code).toUpperCase();
    let ch = null, dead = false;
    this._c().then(c => {
      if (dead) return;
      ch = c.channel('sys_public_' + code + '_' + Math.random().toString(36).slice(2))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sys_public', filter: `code=eq.${code}` }, () => cb())
        .subscribe();
    });
    return () => { dead = true; if (ch) this.client.removeChannel(ch); };
  }
}
