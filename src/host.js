// Instructor Control Room. The host page is authoritative: it runs the engine, then publishes
// the public payload and each team's private view through the transport.
import * as D from '../engine/data.js';
import { EVENTS } from '../engine/cards.js';
import { createGame, assignRegions, resolveRound, rankings } from '../engine/engine.js';
import { PROFILES, BOT_NAMES } from '../engine/bots.js';
import { botPicks, picksToDecision } from '../engine/deck.js';
import { h, icon, money, timerMs, mmss, ROUND_TITLES, logo, hexEmblem } from './ui.js';
import { makeNet, withLocal } from './transport.js';
import { buildPublic, buildViews, roundNews } from './publish.js';

const net = makeNet(), root = document.getElementById('app');
const q = new URLSearchParams(location.search);
let lastPrev = null, addedInfo = null, lastJson = '', token = null, code = null, V = null, busy = false, selTeam = null, started = false;
const QP = new URLSearchParams(location.search);
const opt = { autoTimer: true, autoAll: true, dur: Number(QP.get('dur')) || 300, brk: Number(QP.get('break')) || 45, fill: 4, seed: 1 };
let autoPaused = false, opening = false;     // emergency pause of the automatic flow (break or timer)
const save = () => { try { localStorage.setItem('sys:host:last', JSON.stringify({ code, token })); } catch { /* */ } };
const status = () => V.session.status, round = () => V.session.round;

async function login() {
  const want = (q.get('code') || '').toUpperCase();
  if (q.get('new')) { try { localStorage.removeItem('sys:host:last'); } catch { /* */ } return false; }
  try {
    const last = JSON.parse(localStorage.getItem('sys:host:last'));
    if (last && (!want || last.code === want)) { token = last.token; code = last.code; await net.hostGet(code, token); return true; }
  } catch { token = null; }
  return false;
}
function loginScreen() {
  const pin = h('input', { class: 'field', placeholder: 'Choose a PIN (4 or more)', 'aria-label': 'PIN', style: { textAlign: 'center' } });
  const err = h('div', { class: 'err' });
  root.replaceChildren(h('div', { class: 'center', style: { minHeight: '100vh' } }, h('div', { class: 'glass joinbox' }, logo(300), h('h2', { style: { textAlign: 'center' } }, 'Instructor'),
    pin, h('button', { class: 'btn gold big', id: 'create', style: { justifyContent: 'center' }, onclick: async () => {
      try { const r = await net.createSession(pin.value || '0000'); token = r.hostToken; code = r.code; save(); start(); } catch (e) { err.textContent = e.message; }
    } }, 'Create session'), err)));
}

async function start() {
  if (!started) { started = true; net.subscribe(code, load); setInterval(tick, 500); setInterval(load, 2500); }
  await load();
}
async function load() {
  if (busy) return;
  let nv;
  try { nv = await net.hostGet(code, token); }
  catch (e) { if (V && !/not authorized/i.test(e.message)) return; V = null; return loginScreen(); }   // a slow or dropped request must not throw the console back to login
  const changed = JSON.stringify(nv) !== lastJson; lastJson = JSON.stringify(nv); V = nv;
  await syncSubmitted();
  await syncRoster();
  if (!changed && root.firstChild) return;      // keep the DOM steady so buttons stay clickable
  if (document.activeElement?.tagName === 'INPUT' && document.activeElement.type === 'number') return;
  render();
}
const act = fn => async (...a) => { try { await fn(...a); } catch (e) { alert(e.message); } lastJson = ''; await load(); };

// ---------- roster and publishing ----------
const humans = () => V.teams;                                  // [{id,name}] from the transport
const entry = id => V.public?.teams?.find(t => t.id === id);
const roster = () => [
  ...humans().map(t => ({ id: t.id, name: t.name, region: entry(t.id)?.region || null, bot: null })),
  ...(V.public?.teams || []).filter(t => t.bot).map(t => ({ id: t.id, name: t.name, region: t.region, bot: t.profile || 'analyzer' })),
];
const submittedMap = () => Object.fromEntries(Object.keys(V.decisions || {}).map(k => [k, true]));
function pub(st, over = {}) {
  return buildPublic({ status: st, round: round(), state: V.state, roster: V.state ? [] : roster(), timer: V.public?.timer || null, submitted: submittedMap(), rankings: V.public?.final?.rankings || null, news: V.public?.news || null, nextAt: V.public?.nextAt || null, ...over });
}
async function syncRoster() {
  if (!V || status() !== 'lobby') return;
  const have = (V.public?.teams || []).map(t => t.id).sort().join(), want = humans().map(t => t.id).sort().join();
  if (have !== want) { await setRoster(roster().filter(t => !t.bot || false).map(t => t)); V = await net.hostGet(code, token); lastJson = ''; }
}
async function syncSubmitted() {
  if (!V || status() !== 'open' || !V.state) return;
  const was = Object.fromEntries((V.public?.teams || []).filter(t => t.submitted).map(t => [t.id, true]));
  const now = submittedMap();
  if (Object.keys(was).sort().join() !== Object.keys(now).sort().join()) {
    await net.hostPublish(code, token, 'open', pub('open'));
    V.public = (await net.hostGet(code, token)).public;
  }
}
async function setRoster(list) { await net.hostPublish(code, token, 'lobby', buildPublic({ status: 'lobby', round: 1, roster: list })); }

// bots keep their profile in the public roster entry via `bot` (profile name)
async function startGame() {
  const hs = roster().filter(t => !t.bot);
  if (!hs.length) throw new Error('No teams have joined yet.');
  const seed = Math.floor(Math.random() * 1e6) + 1, regs = assignRegions(hs.length, seed);   // balanced across the four, random order
  const r = hs.map((t, i) => ({ ...t, region: regs[i] }));
  const counts = Object.fromEntries(D.REGION_IDS.map(x => [x, r.filter(t => t.region === x).length]));
  let k = 0;
  for (const reg of D.REGION_IDS) while (counts[reg] < opt.fill) { r.push({ id: 'bot' + (k + 1), name: BOT_NAMES[(k + seed) % BOT_NAMES.length], region: reg, bot: PROFILES[(k + seed) % PROFILES.length] }); counts[reg]++; k++; }
  const state = createGame({ seed, teams: r.map(t => ({ id: t.id, name: t.name, region: t.region, bot: t.bot || null })) });
  V.state = state; V.public = { ...(V.public || {}), nextAt: null };
  await net.hostPublish(code, token, 'locked', buildPublic({ status: 'locked', round: 1, state }), state, buildViews(state, humans().map(t => t.id)));
  autoPaused = false;
  await openRound();
}
async function openRound() {
  const g0 = await net.hostGet(code, token);   // never reopen a finished game or a round that is already open
  if (g0.session.status !== 'locked' || !g0.state || g0.state.phase === 'done') return;
  V = g0;   // publish from the fresh copy
  const ms = opt.dur * 1000;
  const timer = { endsAt: Date.now() + ms, paused: false, remainingMs: ms, durationMs: ms };
  await net.hostPublish(code, token, 'open', pub('open', { timer, nextAt: null }));
}
async function timerOp(op) {
  const t = { ...(V.public.timer || {}) }, now = Date.now();
  if (op.add) { if (t.paused) t.remainingMs += op.add * 1000; else t.endsAt += op.add * 1000; t.durationMs += op.add * 1000; }
  if (op.pause && !t.paused) { t.remainingMs = Math.max(0, t.endsAt - now); t.paused = true; }
  if (op.resume && t.paused) { t.endsAt = now + t.remainingMs; t.paused = false; }
  await net.hostPublish(code, token, status(), pub(status(), { timer: t }));
}
async function resolve() {
  if (busy) return; busy = true;
  try {
    const g0 = await net.hostGet(code, token);   // the cached copy can be stale on a slow network: only resolve a round that is really open
    if (g0.session.status !== 'open') return;
    await net.hostPublish(code, token, 'locked', pub('locked'));   // closes submissions
    const g = await net.hostGet(code, token), s = g.state, r = g.session.round, decisions = {};
    for (const [id, t] of Object.entries(s.teams)) decisions[id] = t.bot ? picksToDecision(s, id, botPicks(s, id, t.bot, s.seed)) : g.decisions[id];
    const ns = resolveRound(s, decisions), done = ns.phase === 'done';
    const rk = done ? rankings(ns) : null;
    lastPrev = s;
    await net.commitRound(code, token, r, ns, buildPublic({ status: done ? 'done' : 'locked', round: ns.round, state: ns, rankings: rk, news: roundNews(s, ns), nextAt: done ? null : Date.now() + opt.brk * 1000 }), buildViews(ns, g.teams.map(t => t.id), s), done);
  } finally { busy = false; await load(); }
}
async function overrideEvent(rid, id) {
  if (status() !== 'locked' || V.state?.phase === 'done') return;   // only during the break, never while a round is open
  const ns = JSON.parse(JSON.stringify(V.state));
  if (id) ns.regions[rid].events[round()] = id; else delete ns.regions[rid].events[round()];
  await net.hostPublish(code, token, 'locked', pub('locked', { state: ns, news: V.public?.news || null }), ns, buildViews(ns, humans().map(t => t.id), lastPrev && lastPrev.round === ns.round - 1 ? lastPrev : null));
}
async function restart() {
  if (!confirm('Restart the game? Teams stay, bots are removed.')) return;
  await net.hostReset(code, token);
  await setRoster(humans().map(t => ({ id: t.id, name: t.name, region: entry(t.id)?.region || null, bot: null })));
}
window.__host = { get V() { return V; }, get paused() { return autoPaused; }, get busy() { return busy; } };   // test hook
// The whole round loop: open when the break ends, resolve on time or when every human is in.
function tick() {
  if (!V || busy) return;
  const now = Date.now();
  if (status() === 'locked' && V.state && V.state.phase !== 'done' && V.public?.nextAt) {
    if (!autoPaused && !opening && now >= V.public.nextAt) { opening = true; openRound().catch(e => console.error(e)).finally(() => { opening = false; load(); }); }
    const el = document.getElementById('hostclock'); if (el) el.textContent = 'Next ' + mmss(Math.max(0, V.public.nextAt - now));
    return;
  }
  if (status() !== 'open') return;
  const hs = humans(), subs = hs.filter(t => V.decisions?.[t.id]).length, tm = V.public?.timer;
  const ms = tm ? timerMs(tm) : null;
  if (!autoPaused && opt.autoTimer && tm && !tm.paused && ms === 0) resolve();
  else if (!autoPaused && opt.autoAll && hs.length && subs === hs.length) resolve();
  const el = document.getElementById('hostclock');
  if (el && tm) el.textContent = mmss(timerMs(tm));
}

// ---------- screens ----------
function render() {
  if (!V) return loginScreen();
  const side = h('div', { class: 'side' }), main = h('div', { class: 'main' });
  side.append(h('div', { class: 'glass card' }, h('div', { class: 'muted' }, 'Join code'), h('div', { class: 'codebig', id: 'joincode' }, code),
    h('div', { class: 'muted', style: { textAlign: 'center', marginTop: '8px', wordBreak: 'break-all' } }, location.origin + location.pathname.replace('host.html', 'index.html')),
    h('div', { class: 'row', style: { marginTop: '12px', justifyContent: 'center' } },
      h('button', { class: 'btn', onclick: () => window.open(withLocal('projector.html?code=' + code), 'sys-projector') }, icon('pin', 18), 'Open projector'),
      h('button', { class: 'btn', onclick: () => window.open(withLocal('index.html?code=' + code), '_blank') }, 'Join as team'))));
  if (status() === 'lobby') lobby(side, main); else running(side, main);
  root.replaceChildren(h('div', { class: 'host' }, side, main));
}

function regionSel(t, list) {
  return h('select', { 'aria-label': 'Region for ' + t.name, onchange: act(async e => { const r = roster(); r.find(x => x.id === t.id).region = e.target.value || null; await setRoster(r); }) },
    h('option', { value: '' }, 'Not set'), D.REGION_IDS.map(r => h('option', { value: r, selected: t.region === r }, D.REGIONS[r].name)));
}
function lobby(side, main) {
  const ts = roster();
  side.append(h('div', { class: 'glass card' }, h('h3', {}, 'Start'),
    h('div', { class: 'muted', style: { marginBottom: '10px' } }, 'Students open team.html, type this code and a team name. Press Start when they are in. Regions are assigned at random and bots fill every region to four.'),
    h('button', { class: 'btn gold big', id: 'startgame', disabled: !ts.length, onclick: act(startGame) }, 'Start game'),
    h('div', { class: 'muted', style: { marginTop: '8px' } }, 'Keep this tab open: it runs the rounds.')));
  main.append(h('div', { class: 'glass card' }, h('h3', {}, `Teams joined (${ts.length})`), ts.length ? h('div', { class: 'joined hostjoined' }, ts.map(t => h('span', { class: 'jchip small' }, hexEmblem(t.name, null, 28), t.name))) : h('div', { class: 'muted' }, 'Waiting for teams to join...')));
}

function running(side, main) {
  const s = V.state, r = round(), st = status(), done = st === 'done';
  const hs = humans(), subs = hs.filter(t => V.decisions?.[t.id]).length;
  const tm = V.public?.timer, ms = tm ? timerMs(tm) : null;
  const ctl = h('div', { class: 'glass card' }, h('h3', {}, done ? 'Game over' : `Round ${r}: ${ROUND_TITLES[r - 1]}`),
    h('div', { class: 'row' }, h('span', { class: 'chip', id: 'hoststatus' }, st), h('span', { class: 'chip' }, `${subs} of ${hs.length} teams in`)));
  const nx = V.public?.nextAt;
  if (st === 'open') ctl.append(h('div', { class: 'serif', id: 'hostclock', style: { fontSize: '64px', margin: '8px 0' } }, ms != null ? mmss(ms) : 'Open'));
  else if (st === 'locked' && !done) ctl.append(h('div', { class: 'serif', id: 'hostclock', style: { fontSize: '48px', margin: '8px 0' } }, nx ? 'Next ' + mmss(Math.max(0, nx - Date.now())) : 'Ready'));
  if (!done) ctl.append(h('div', { class: 'muted' }, autoPaused ? 'Automatic flow is paused.' : 'Runs by itself. Keep this tab open.'));
  if (!done) ctl.append(h('div', { class: 'row emerg', style: { marginTop: '10px' } },
    autoPaused || tm?.paused ? h('button', { class: 'btn', id: 'resumebtn', onclick: act(async () => { autoPaused = false; if (tm?.paused) await timerOp({ resume: true }); }) }, 'Resume')
      : h('button', { class: 'btn', id: 'pausebtn', onclick: act(async () => { autoPaused = true; if (st === 'open') await timerOp({ pause: true }); }) }, 'Pause'),
    st === 'open' ? h('button', { class: 'btn', onclick: act(() => timerOp({ add: 60 })) }, 'Extend +1 min') : null,
    h('button', { class: 'btn red', id: 'skip', onclick: act(async () => { autoPaused = false; if (st === 'open') await resolve(); else if (st === 'locked') await openRound(); }) }, st === 'open' ? 'Skip: resolve now' : 'Skip: open now')));
  ctl.append(h('div', { class: 'row', style: { marginTop: '12px' } }, h('button', { class: 'btn', onclick: act(restart) }, 'Reset'), h('button', { class: 'btn', id: 'newgame', onclick: () => { try { localStorage.removeItem('sys:host:last'); } catch { /* */ } location.href = location.pathname + '?new=1'; } }, 'New game')));
  side.append(ctl);

  // per-region submitted counts
  const rc = h('div', { class: 'glass card' }, h('h3', {}, 'Submitted by region'));
  for (const rid of D.REGION_IDS) {
    const ids = Object.values(s.teams).filter(t => t.region === rid && !t.bot).map(t => t.id), n = ids.filter(id => V.decisions?.[id]).length;
    rc.append(h('div', { class: 'row', style: { justifyContent: 'space-between', padding: '4px 0' } }, h('span', {}, h('span', { class: 'rtag', style: { background: D.REGIONS[rid].color } }), D.REGIONS[rid].name), h('span', {}, `${n} / ${ids.length}`, n === ids.length && ids.length ? ' ✓' : '')));
  }
  side.append(rc);

  if (!done && st === 'locked') {
    const ov = h('div', { class: 'glass card' }, h('h3', {}, 'Add event, round ' + r));
    for (const rid of D.REGION_IDS) {
      const cur = s.regions[rid].events[r] || '';
      ov.append(h('div', { class: 'row', style: { marginTop: '6px' } }, h('span', { style: { width: '120px' } }, D.REGIONS[rid].name),
        h('select', { 'aria-label': 'Event ' + rid, onchange: act(e => overrideEvent(rid, e.target.value)) },
          h('option', { value: '' }, 'None'), D.REGIONS[rid].events.map(id => h('option', { value: id, selected: id === cur }, EVENTS[id].title)))));
    }
    side.append(ov);
  }

  const table = h('table', { class: 't' }, h('tr', {}, ['Team', 'Region', 'Status', 'Cash', 'Share', ''].map(x => h('th', {}, x))));
  for (const [id, t] of Object.entries(s.teams)) {
    const last = t.history.at(-1), got = V.decisions?.[id];
    table.append(h('tr', {}, h('td', {}, h('span', { class: 'row', style: { gap: '8px', flexWrap: 'nowrap' } }, hexEmblem(t.name, t.region, 26, t.emblem), t.name)), h('td', {}, h('span', { class: 'rtag', style: { background: D.REGIONS[t.region].color } }), D.REGIONS[t.region].name),
      h('td', {}, t.bot ? h('span', { class: 'chip' }, t.bot) : done ? '' : got ? h('span', { class: 'chip good' }, 'Submitted') : h('span', { class: 'chip warn' }, 'Not yet')),
      h('td', {}, money(t.cash)), h('td', {}, last ? Math.round(last.marketShare * 100) + '%' : '-'), h('td', {}, h('button', { class: 'btn', style: { minHeight: '28px', padding: '2px 10px' }, onclick: () => { selTeam = id; render(); } }, 'Inspect'))));
  }
  main.append(h('div', { class: 'glass card' }, h('h3', {}, 'Teams'), table));

  if (Object.values(s.teams).some(t => t.history.length)) {
    const rk = rankings(s);
    main.append(h('div', { class: 'glass card' }, h('h3', {}, done ? 'Final standings' : 'Scores so far (host only)'),
      h('table', { class: 't' }, h('tr', {}, ['#', 'Team', 'Region', 'Fin', 'Out', 'Res', 'Total'].map(x => h('th', {}, x))),
        rk.map(x => h('tr', {}, h('td', {}, x.classRank), h('td', {}, s.teams[x.id].name), h('td', {}, D.REGIONS[x.region].name + ' #' + x.regionRank), h('td', {}, Math.round(x.financial)), h('td', {}, Math.round(x.outcomes)), h('td', {}, Math.round(x.resilience)), h('td', {}, h('b', {}, Math.round(x.total)), x.capped ? ' (capped)' : ''))))));
  }
  if (selTeam && s.teams[selTeam]) {
    const t = s.teams[selTeam];
    const view = { name: t.name, cash: t.cash, trust: t.trust, target: t.target, transitions: t.transitions, disruption: t.disruption, capacity: t.capacity, exploreStock: t.exploreStock, pilot: t.pilot, proposal: t.proposal, submittedThisRound: V.decisions?.[selTeam] || null, lastHistory: t.history.at(-1) };
    main.append(h('div', { class: 'glass card' }, h('h3', {}, 'Hidden state: ' + t.name), h('div', { class: 'pre' }, JSON.stringify(view, null, 1))));
  }
}

(async () => { if (await login()) start(); else loginScreen(); })();
