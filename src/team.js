import { makeNet, withLocal } from './transport.js';
import { mountTeamApp } from './teamapp.js';
const net = makeNet(), q = new URLSearchParams(location.search);
const code = (q.get('code') || '').toUpperCase();
let me = null;
try { me = q.get('t') ? { teamToken: q.get('t') } : JSON.parse(sessionStorage.getItem('sys:me:' + code)); } catch { /* none */ }
if (!code || !me) location.href = withLocal('index.html');
let round = 1;
const driver = {
  poll: true,
  load: async () => {
    const r = await net.teamView(code, me.teamToken), pub = r.public || {}, view = r.view || null;
    round = pub.round || 1;
    return {
      code, key: code, teamId: r.teamId, name: r.name, status: pub.status || 'lobby', round, timer: pub.timer || null,
      state: view?.state || null, region: view?.state?.teams?.[r.teamId]?.region || pub.teams?.find(t => t.id === r.teamId)?.region || null,
      submitted: !!r.draft, decision: r.draft, publicTeams: pub.teams || [], events: view?.events || pub.events || {}, final: pub.final || null,
    };
  },
  submit: d => net.submit(code, me.teamToken, round, d),
  subscribe: cb => net.subscribe(code, cb),
};
mountTeamApp(document.getElementById('app'), driver);
