// Drives the net layer (RPC-shaped contract) + engine for a 15-team game through 5 rounds.
//   node tools/smoke-ui.mjs
import assert from 'node:assert/strict';
import * as D from '../engine/data.js';
import { createGame, assignRegions, resolveRound, rankings, defaultDecision, forecast } from '../engine/engine.js';
import { botDecision, PROFILES, BOT_NAMES } from '../engine/bots.js';
import { LocalNet, MemoryStorage } from '../src/net.js';
import { buildPublic, buildViews } from '../src/publish.js';

const net = new LocalNet({ storage: new MemoryStorage(), channel: false });
let ok = 0; const chk = (c, m) => { assert.ok(c, m); ok++; };
const bad = async (p, re) => { await assert.rejects(p, re); ok++; };

await bad(net.createSession('12'), /pin too short`?|pin/);
const { code, hostToken } = await net.createSession('1234');
chk(/^[A-Z]{5}$/.test(code), 'session code');
await bad(net.hostGet(code, 'wrong'), /not authorized/);

// 6 human teams; rejoin needs the saved token
const humans = [];
for (let i = 0; i < 6; i++) humans.push(await net.join(code, 'Team ' + (i + 1)));
await bad(net.join(code, 'team 1'), /name taken/);
chk((await net.join(code, 'team 1', humans[0].teamToken)).teamId === humans[0].teamId, 'rejoin with token');
await bad(net.submit(code, humans[0].teamToken, 1, {}), /locked/);
await bad(net.teamView(code, 'nope'), /not authorized/);

// roster in the lobby public payload: regions for humans, bots to 15 teams
const regs = assignRegions(6, 3);
const roster = humans.map((h, i) => ({ id: h.teamId, name: 'Team ' + (i + 1), region: regs[i], bot: null }));
const counts = Object.fromEntries(D.REGION_IDS.map(r => [r, roster.filter(t => t.region === r).length]));
let k = 0;
while (roster.length < 15) {
  const r = D.REGION_IDS.slice().sort((a, b) => counts[a] - counts[b])[0]; counts[r]++;
  roster.push({ id: 'bot' + (k + 1), name: BOT_NAMES[k % BOT_NAMES.length], region: r, bot: PROFILES[k % PROFILES.length] }); k++;
}
await net.hostPublish(code, hostToken, 'lobby', buildPublic({ status: 'lobby', round: 1, roster }));
let g = await net.hostGet(code, hostToken);
chk(g.teams.length === 6 && g.public.teams.length === 15, 'hostGet shows 6 humans, 15 in roster');
chk(g.teams.every(t => t.token === undefined && t.token_hash === undefined), 'hostGet hides tokens');
await bad(net.hostPublish(code, hostToken, 'weird', {}), /bad status/);

let state = createGame({ seed: 7, teams: roster.map(t => ({ id: t.id, name: t.name, region: t.region, bot: t.bot })) });
const hids = humans.map(h => h.teamId);
await net.hostPublish(code, hostToken, 'locked', buildPublic({ status: 'locked', round: 1, state }), state, buildViews(state, hids));
await bad(net.join(code, 'Latecomer'), /already started/);
const tv = await net.teamView(code, humans[0].teamToken);
chk(tv.view.state && tv.public.status === 'locked' && tv.draft === null, 'team view after start');

const SECRET = '"invest"';
for (let round = 1; round <= 5; round++) {
  let pub = buildPublic({ status: 'open', round, state, timer: { endsAt: Date.now() + 60000, paused: false, remainingMs: 60000, durationMs: 60000 } });
  await net.hostPublish(code, hostToken, 'open', pub);
  for (let i = 0; i < 4; i++) {
    const d = { archetype: ['access', 'excellence', 'integrated'][i % 3], focus: { primary: 50, specialty: 30, chronic: 20 }, invest: { primary: 3, specialty: 1, chronic: 2 }, price: 'standard', explore: 1, changes: round > 1 ? { rewards: 2 } : {}, approach: 'consult', response: 'accept', pilot: round >= D.PILOT_ROUND };
    await net.submit(code, humans[i].teamToken, round, d);
  }
  await bad(net.submit(code, humans[0].teamToken, round + 1, {}), /locked/);   // wrong round
  await net.submit(code, humans[0].teamToken, round, { ...defaultDecision(state, humans[0].teamId), focus: { primary: 20, specialty: 20, chronic: 60 } });   // revise
  g = await net.hostGet(code, hostToken);
  const submitted = Object.fromEntries(Object.keys(g.decisions).map(x => [x, true]));
  chk(Object.keys(submitted).length === 4, 'host sees 4 decisions');
  pub = buildPublic({ status: 'open', round, state, submitted });
  await net.hostPublish(code, hostToken, 'open', pub);
  const anon = await net.getPublic(code);
  chk(!JSON.stringify(anon).includes(SECRET) && !JSON.stringify(anon).includes('"focus"') && !JSON.stringify(anon).includes('"decision'), `round ${round} public has no decisions`);
  chk(anon.teams.filter(t => t.submitted).length === 4, 'public shows submitted flags only');
  const tv0 = await net.teamView(code, humans[0].teamToken), me = tv0.view.state.teams[humans[0].teamId];
  chk(tv0.draft.focus.chronic === 60, 'team sees own revised decision');
  chk(Object.values(tv0.view.state.teams).every(t => t.region === me.region), 'team view limited to own region');
  for (const t of Object.values(tv0.view.state.teams)) if (t.id !== me.id) chk(t.history.every(x => !('decision' in x) && !('notes' in x)) && !t.proposal, 'rival stubs carry no decisions');
  chk(forecast(tv0.view.state, humans[0].teamId, tv0.draft).revenue !== undefined, 'forecast runs on scoped state');

  // host resolves
  await net.hostPublish(code, hostToken, 'locked', buildPublic({ status: 'locked', round, state, submitted }));
  await bad(net.submit(code, humans[5].teamToken, round, {}), /locked/);
  g = await net.hostGet(code, hostToken);
  const decisions = {};
  for (const [id, t] of Object.entries(g.state.teams)) decisions[id] = t.bot ? botDecision(g.state, id, t.bot, g.state.seed) : g.decisions[id];
  const ns = resolveRound(g.state, decisions), done = ns.phase === 'done';
  const rk = done ? rankings(ns) : null;
  const first = await net.commitRound(code, hostToken, round, ns, buildPublic({ status: done ? 'done' : 'locked', round: ns.round, state: ns, rankings: rk }), buildViews(ns, hids), done);
  chk(first.ok, 'commit ok');
  const dup = await net.commitRound(code, hostToken, round, resolveRound(g.state, {}), buildPublic({ status: 'locked', round: ns.round, state: g.state }), buildViews(g.state, hids), false);
  chk(!dup.ok && dup.reason === 'already committed', 'duplicate commit refused');
  g = await net.hostGet(code, hostToken);
  chk(JSON.stringify(g.state) === JSON.stringify(ns), 'stored state is the first commit');
  chk(g.session.round === round + 1, 'round advanced once');
  state = ns;
  const lastHist = id => state.teams[id].history.at(-1);
  chk(lastHist(humans[4].teamId).missing && lastHist(humans[5].teamId).missing, 'missing teams used defaults');
  const anon2 = await net.getPublic(code);
  chk(!JSON.stringify(anon2).includes(SECRET) && anon2.teams.every(t => t.hist.length === round), 'post-round public clean, history length');
  chk((await net.teamView(code, humans[0].teamToken)).view.state.round === round + 1, 'team view moved to next round');
}
const fin = await net.getPublic(code);
chk(fin.status === 'done' && fin.final.rankings.length === 15 && fin.final.rankings[0].classRank === 1, 'final rankings public');
await net.hostReset(code, hostToken);
chk((await net.hostGet(code, hostToken)).session.status === 'lobby', 'reset to lobby');
console.log(`OK: ${ok} checks passed`);
