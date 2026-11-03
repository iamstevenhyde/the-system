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
const opt = { autoTimer: true, autoAll: false, dur: 300, fill: 4, seed: 1 };
const save = () => { try { localStorage.setItem('sys:host:last', JSON.stringify({ code, token })); } catch { /* */ } };
const status = () => V.session.status, round = () => V.session.round;

async function login() {
  const want = (q.get('code') || '').toUpperCase();
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
  try { nv = await net.hostGet(code, token); } catch (e) { V = null; return loginScreen(); }
  const changed = JSON.stringify(nv) !== lastJson; lastJson = JSON.stringify(nv); V = nv;
  await syncSubmitted();
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
  return buildPublic({ status: st, round: round(), state: V.state, roster: V.state ? [] : roster(), timer: V.public?.timer || null, submitted: submittedMap(), rankings: V.public?.final?.rankings || null, news: V.public?.news || null, ...over });
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
async function autoDistribute() {
  const r = roster(), hs = r.filter(t => !t.bot), regs = assignRegions(hs.length, opt.seed);
  hs.forEach((t, i) => (t.region = regs[i]));
  await setRoster(r);
}
async function fillBots() {
  const r = roster();
  const counts = Object.fromEntries(D.REGION_IDS.map(x => [x, r.filter(t => t.region === x).length]));
  let k = r.filter(t => t.bot).length;
  for (const reg of D.REGION_IDS) while (counts[reg] < opt.fill) { r.push({ id: 'bot' + (k + 1), name: BOT_NAMES[k % BOT_NAMES.length], region: reg, bot: PROFILES[(k + opt.seed) % PROFILES.length] }); counts[reg]++; k++; }
  await setRoster(r);
}
async function startGame() {
  const r = roster();
  const state = createGame({ seed: opt.seed, teams: r.map(t => ({ id: t.id, name: t.name, region: t.region, bot: t.bot || null })) });
  V.state = state;
  await net.hostPublish(code, token, 'locked', buildPublic({ status: 'locked', round: 1, state }), state, buildViews(state, humans().map(t => t.id)));
}
async function openRound() {
  const ms = opt.dur * 1000;
  const timer = { endsAt: Date.now() + ms, paused: false, remainingMs: ms, durationMs: ms };
  await net.hostPublish(code, token, 'open', pub('open', { timer }));
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
    await net.hostPublish(code, token, 'locked', pub('locked'));   // closes submissions
    const g = await net.hostGet(code, token), s = g.state, r = g.session.round, decisions = {};
    for (const [id, t] of Object.entries(s.teams)) decisions[id] = t.bot ? picksToDecision(s, id, botPicks(s, id, t.bot, s.seed)) : g.decisions[id];
    const ns = resolveRound(s, decisions), done = ns.phase === 'done';
    const rk = done ? rankings(ns) : null;
    lastPrev = s;
    await net.commitRound(code, token, r, ns, buildPublic({ status: done ? 'done' : 'locked', round: ns.round, state: ns, rankings: rk, news: roundNews(s, ns) }), buildViews(ns, g.teams.map(t => t.id), s), done);
  } finally { busy = false; await load(); }
}
async function overrideEvent(rid, id) {
  const ns = JSON.parse(JSON.stringify(V.state));
  if (id) ns.regions[rid].events[round()] = id; else delete ns.regions[rid].events[round()];
  await net.hostPublish(code, token, 'locked', pub('locked', { state: ns, news: V.public?.news || null }), ns, buildViews(ns, humans().map(t => t.id), lastPrev && lastPrev.round === ns.round - 1 ? lastPrev : null));
}
async function restart() {
  if (!confirm('Restart the game? Teams stay, bots are removed.')) return;
  await net.hostReset(code, token);
  await setRoster(humans().map(t => ({ id: t.id, name: t.name, region: entry(t.id)?.region || null, bot: null })));
}
function tick() {
  if (!V || status() !== 'open' || busy) return;
  const hs = humans(), subs = hs.filter(t => V.decisions?.[t.id]).length, tm = V.public?.timer;
  const ms = tm ? timerMs(tm) : null;
  if (opt.autoTimer && tm && !tm.paused && ms === 0) resolve();
  else if (opt.autoAll && hs.length && subs === hs.length) resolve();
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
  side.append(h('div', { class: 'glass card' }, h('h3', {}, 'Setup'),
    h('div', { class: 'row' }, h('button', { class: 'btn', id: 'dist', onclick: act(autoDistribute) }, 'Auto-distribute regions')),
    h('div', { class: 'row', style: { marginTop: '10px' } }, h('span', {}, 'Fill each region to'), h('select', { id: 'fill', onchange: e => (opt.fill = Number(e.target.value)) }, [3, 4].map(n => h('option', { value: n, selected: opt.fill === n }, n + ' networks'))),
      h('button', { class: 'btn', id: 'fillbtn', onclick: act(fillBots) }, 'Add bots')),
    h('div', { class: 'row', style: { marginTop: '10px' } }, h('span', {}, 'Seed'), h('input', { class: 'inp', type: 'number', value: opt.seed, style: { width: '80px' }, onchange: e => (opt.seed = Number(e.target.value) || 1) })),
    h('div', { class: 'row', style: { marginTop: '14px' } }, h('button', { class: 'btn gold big', id: 'startgame', disabled: !ts.length || ts.some(t => !t.region), onclick: act(startGame) }, 'Start game')),
    ts.some(t => !t.region) ? h('div', { class: 'muted', style: { marginTop: '6px' } }, 'Every team needs a region.') : null));
  const nm = h('input', { class: 'inp', id: 'addname', placeholder: 'Team name', 'aria-label': 'Late team name', style: { flex: 1 } });
  side.append(h('div', { class: 'card' }, h('h3', {}, 'Add a team'),
    h('div', { class: 'muted', style: { marginBottom: '6px' } }, 'For a late arrival. Give them the rejoin link.'),
    h('div', { class: 'row' }, nm, h('button', { class: 'btn', id: 'addteam', onclick: act(async () => { if (nm.value.trim().length < 2) throw new Error('Type a team name.'); const r = await net.hostAddTeam(code, token, nm.value.trim()); addedInfo = { name: nm.value.trim(), token: r.teamToken, url: location.origin + location.pathname.replace('host.html', 'team.html') + '?code=' + code + '&t=' + encodeURIComponent(r.teamToken) + (new URLSearchParams(location.search).get('local') === '1' ? '&local=1' : '') }; }) }, 'Add team')),
    addedInfo ? h('div', { id: 'addedinfo', style: { marginTop: '8px' } }, h('div', { class: 'chip good' }, addedInfo.name + ' added'), h('div', { class: 'muted', style: { fontSize: '12px', marginTop: '4px' } }, 'Rejoin code'), h('div', { class: 'serif', style: { fontSize: '22px', wordBreak: 'break-all' } }, addedInfo.token), h('a', { href: addedInfo.url, target: '_blank', style: { fontSize: '13px', wordBreak: 'break-all' } }, addedInfo.url)) : null));
  main.append(h('div', { class: 'glass card' }, h('h3', {}, `Teams (${ts.length})`), ts.length ? h('table', { class: 't' }, h('tr', {}, ['Team', 'Type', 'Region', ''].map(x => h('th', {}, x))),
    ts.map(t => h('tr', {}, h('td', {}, t.name), h('td', {}, t.bot ? 'Bot: ' + t.bot : 'Students'), h('td', {}, regionSel(t)),
      h('td', {}, t.bot ? h('button', { class: 'btn', style: { minHeight: '30px', padding: '2px 10px' }, onclick: act(async () => setRoster(roster().filter(x => x.id !== t.id))) }, 'Remove') : null)))) : h('div', { class: 'muted' }, 'Waiting for teams to join...')));
}

function running(side, main) {
  const s = V.state, r = round(), st = status(), done = st === 'done';
  const hs = humans(), subs = hs.filter(t => V.decisions?.[t.id]).length;
  const tm = V.public?.timer, ms = tm ? timerMs(tm) : null;
  const ctl = h('div', { class: 'glass card' }, h('h3', {}, done ? 'Game over' : `Round ${r}: ${ROUND_TITLES[r - 1]}`),
    h('div', { class: 'row' }, h('span', { class: 'chip', id: 'hoststatus' }, st), h('span', { class: 'chip' }, `${subs} of ${hs.length} teams in`)));
  if (st === 'open') ctl.append(h('div', { class: 'serif', id: 'hostclock', style: { fontSize: '64px', margin: '8px 0' } }, ms != null ? mmss(ms) : 'Open'));
  if (st === 'locked' && !done) ctl.append(h('div', { class: 'row', style: { margin: '10px 0' } }, h('select', { id: 'dur', onchange: e => (opt.dur = Number(e.target.value)) },
    [[600, '10 min'], [300, '5 min'], [240, '4 min'], [180, '3 min'], [120, '2 min'], [60, '1 min'], [20, '20 s (fast test)']].map(([v, l]) => h('option', { value: v, selected: opt.dur === v }, l))),
    h('button', { class: 'btn gold big', id: 'openround', onclick: act(openRound) }, 'Open round ' + r)));
  if (st === 'open') ctl.append(h('div', { class: 'row' },
    h('button', { class: 'btn', onclick: act(() => timerOp({ add: 60 })) }, 'Extend +1 min'),
    tm?.paused ? h('button', { class: 'btn', onclick: act(() => timerOp({ resume: true })) }, 'Resume') : h('button', { class: 'btn', onclick: act(() => timerOp({ pause: true })) }, 'Pause'),
    h('button', { class: 'btn red', id: 'resolve', onclick: act(resolve) }, 'Advance (resolve now)')));
  if (!done) ctl.append(h('label', { class: 'row', style: { marginTop: '10px' } }, h('input', { type: 'checkbox', checked: opt.autoTimer, onchange: e => (opt.autoTimer = e.target.checked) }), 'Resolve when the timer ends'),
    h('label', { class: 'row' }, h('input', { type: 'checkbox', checked: opt.autoAll, onchange: e => (opt.autoAll = e.target.checked) }), 'Resolve when every team is in'));
  ctl.append(h('div', { class: 'row', style: { marginTop: '12px' } }, h('button', { class: 'btn', onclick: act(restart) }, 'Reset')));
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
