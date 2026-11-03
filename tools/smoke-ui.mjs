// Drives the net layer (RPC-shaped contract) + engine for a 15-team game through 5 rounds.
//   node tools/smoke-ui.mjs
import assert from 'node:assert/strict';
import * as D from '../engine/data.js';
import { createGame, assignRegions, resolveRound, rankings } from '../engine/engine.js';
import { PROFILES, BOT_NAMES } from '../engine/bots.js';
import { roundDeck, picksToDecision, botPicks, collisionsFor } from '../engine/deck.js';
import { LocalNet, MemoryStorage } from '../src/net.js';
import { buildPublic, buildViews, roundNews } from '../src/publish.js';

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
{ const second = await net.join(code, 'team 1'); chk(second.teamId === humans[0].teamId && second.teamToken === humans[0].teamToken, 'second device with same name joins that team'); }
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
const SECRET2 = '"moves"';
for (let round = 1; round <= 5; round++) {
  let pub = buildPublic({ status: 'open', round, state, timer: { endsAt: Date.now() + 60000, paused: false, remainingMs: 60000, durationMs: 60000 } });
  await net.hostPublish(code, hostToken, 'open', pub);
  const pickFor = (view, id, salt) => {
    const dk = roundDeck(view.state, id);
    chk(dk.cards.length === 3 && dk.cards.map(c => c.slot).join() === 'market,org,people', 'deck has three cards on the scoped state');
    const picks = {};
    for (const c of dk.cards) { const open = c.options.filter(o => !o.locked); picks[c.slot] = open[salt % open.length].id; }
    chk(dk.cards[0].options.every(o => !o.dials || ['light', 'steady', 'all'].every(k => typeof o.dials[k]?.cost === 'number')), 'market options carry a cost for each dial setting');
    chk(Array.isArray(dk.brief.rivals) && dk.brief.rivals.every(r => 'lastCard' in r && 'shareMove' in r && 'profileWord' in r) && dk.brief.region?.problem, 'brief carries rival intel and the region problem');
    // custom Star points: pick an org option that changes points, then choose points other than the defaults
    const orgCard = dk.cards.find(c => c.slot === 'org'), po = orgCard.options.find(o => o.pointChoices && !o.locked);
    let custom = null;
    if (po && salt === 2 && round > 1) {
      const n = po.defaultPoints.length, defs = po.defaultPoints.map(x => x.point);
      const rows = po.pointChoices.filter(pc => !defs.includes(pc.point) || pc.choices.length > 1);
      custom = (rows.length >= n ? rows : po.pointChoices).slice(-n).map(pc => ({ point: pc.point, to: pc.choices[pc.choices.length - 1].to }));
      picks.org = po.id; picks.points = custom;
      chk(po.pointChoices.length === 5 && po.pointChoices.every(pc => 'currentLabel' in pc && 'fitHint' in pc && pc.choices.length === 2), 'org option lists all five points with current setting and fit hint');
    }
    picks.dial = ['light', 'steady', 'all'][salt % 3];
    chk(Array.isArray(collisionsFor({ market: picks.market, org: picks.org, people: picks.people })), 'collisionsFor returns a list');
    if (round === 1) { picks.archetype = ['access', 'excellence', 'integrated'][salt % 3]; picks.displayName = 'Renamed ' + salt; picks.emblem = 'e' + (salt % 6); }
    const dec = picksToDecision(view.state, id, picks);
    if (custom) chk(JSON.stringify(Object.keys(dec.changes).sort()) === JSON.stringify(custom.map(x => x.point).sort()) && custom.every(x => dec.changes[x.point] === x.to), 'custom point pick reaches the decision');
    return dec;
  };
  for (let i = 0; i < 4; i++) {
    const tvi = await net.teamView(code, humans[i].teamToken);
    await net.submit(code, humans[i].teamToken, round, pickFor(tvi.view, humans[i].teamId, i));
  }
  await bad(net.submit(code, humans[0].teamToken, round + 1, {}), /locked/);   // wrong round
  { const tv = await net.teamView(code, humans[0].teamToken); await net.submit(code, humans[0].teamToken, round, pickFor(tv.view, humans[0].teamId, 1)); }   // revise
  g = await net.hostGet(code, hostToken);
  const submitted = Object.fromEntries(Object.keys(g.decisions).map(x => [x, true]));
  chk(Object.keys(submitted).length === 4, 'host sees 4 decisions');
  pub = buildPublic({ status: 'open', round, state, submitted });
  await net.hostPublish(code, hostToken, 'open', pub);
  const anon = await net.getPublic(code);
  chk(!JSON.stringify(anon).includes(SECRET) && !JSON.stringify(anon).includes('"focus"') && !JSON.stringify(anon).includes(SECRET2) && !JSON.stringify(anon).includes('"decision'), `round ${round} public has no decisions`);
  chk(anon.teams.filter(t => t.submitted).length === 4, 'public shows submitted flags only');
  const tv0 = await net.teamView(code, humans[0].teamToken), me = tv0.view.state.teams[humans[0].teamId];
  chk(tv0.draft.moves && tv0.draft.moves.market, 'team sees own revised picks');
  chk(Object.values(tv0.view.state.teams).every(t => t.region === me.region), 'team view limited to own region');
  for (const t of Object.values(tv0.view.state.teams)) if (t.id !== me.id) chk(t.history.every(x => !('decision' in x) && !('notes' in x)) && !t.proposal, 'rival stubs carry no decisions');

  // host resolves
  await net.hostPublish(code, hostToken, 'locked', buildPublic({ status: 'locked', round, state, submitted }));
  await bad(net.submit(code, humans[5].teamToken, round, {}), /locked/);
  g = await net.hostGet(code, hostToken);
  const decisions = {};
  for (const [id, t] of Object.entries(g.state.teams)) decisions[id] = t.bot ? picksToDecision(g.state, id, botPicks(g.state, id, t.bot, g.state.seed)) : g.decisions[id];
  const ns = resolveRound(g.state, decisions), done = ns.phase === 'done';
  const rk = done ? rankings(ns) : null;
  const first = await net.commitRound(code, hostToken, round, ns, buildPublic({ status: done ? 'done' : 'locked', round: ns.round, state: ns, rankings: rk, news: roundNews(g.state, ns) }), buildViews(ns, hids, g.state), done);
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
  const tvn = await net.teamView(code, humans[0].teamToken);
  chk(tvn.view.state.round === round + 1, 'team view moved to next round');
  chk(tvn.view.reveal && tvn.view.reveal.round === round && Object.keys(tvn.view.reveal.tug).length === 3 && tvn.view.reveal.headlines.length === 2 && tvn.view.reveal.causes.cash, 'team view carries a reveal');
  chk(anon2.news && anon2.news.regions, 'public carries round news');
  if (round === 4) chk(anon2.news.strike?.teams?.length === 15, 'strike map is public after round 4');
}
const fin = await net.getPublic(code);
chk(fin.status === 'done' && fin.final.rankings.length === 15 && fin.final.rankings[0].classRank === 1 && fin.final.survivors.length === 15, 'final rankings and survivors public');
chk(state.teams[humans[0].teamId].name === 'Renamed 1' && state.teams[humans[0].teamId].emblem === 'e1', 'engine applied display name and emblem');
await net.hostReset(code, hostToken);
chk((await net.hostGet(code, hostToken)).session.status === 'lobby', 'reset to lobby');
console.log(`OK: ${ok} checks passed`);
