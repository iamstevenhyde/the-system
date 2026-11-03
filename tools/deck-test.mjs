// Unit tests for the v2 deck layer. Run: node tools/deck-test.mjs
import assert from 'node:assert/strict';
import * as E from '../engine/engine.js';
import * as D from '../engine/data.js';
import { roundDeck, picksToDecision, roundNews, revealFor, botPicks } from '../engine/deck.js';
import { OPTION_FX, DK } from '../engine/deckdata.js';
import { collisionsFor, REGION_PROBLEM } from '../engine/deck5data.js';

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok', name); };
const mkGame = (seed = 3, regions = ['metro', 'metro', 'metro', 'lakes']) => E.createGame({ seed, teams: regions.map((r, i) => ({ id: 't' + i, name: 'Team' + i, region: r, archetype: ['access', 'excellence', 'integrated'][i % 3], bot: ['defender', 'prospector', 'analyzer', 'adaptive'][i % 4] })) });
const botsAll = (s, seed = 3) => Object.fromEntries(Object.keys(s.teams).map(id => [id, picksToDecision(s, id, botPicks(s, id, s.teams[id].bot, seed))]));

t('every round returns 3 cards with 2+ options, JSON-safe, no em-dashes', () => {
  let s = mkGame();
  for (let r = 1; r <= 5; r++) {
    for (const id of Object.keys(s.teams)) {
      const deck = roundDeck(s, id);
      assert.equal(deck.round, r);
      assert.equal(deck.cards.length, 3);
      assert.deepEqual(deck.cards.map(c => c.slot), ['market', 'org', 'people']);
      for (const c of deck.cards) {
        assert(c.options.length >= 2, `${c.id} options`);
        assert(c.options.some(o => !o.locked), `${c.id} has an open option`);
        for (const o of c.options) assert(OPTION_FX[o.id] && OPTION_FX[o.id].round === r, o.id);
      }
      const txt = JSON.stringify(deck);
      assert(!txt.includes('—') && !/Theory [EO]/.test(txt), 'text rules');
      assert.deepEqual(JSON.parse(txt), deck);
    }
    s = E.resolveRound(s, botsAll(s));
  }
});

t('picksToDecision gives legal decisions that validate and resolve', () => {
  let s = mkGame(5);
  for (let r = 1; r <= 5; r++) {
    for (const id of Object.keys(s.teams)) {
      const d = picksToDecision(s, id, { market: 'nope', org: undefined, people: 'r9_x', approach: 'bogus' });
      const v = E.validateDecision(s, id, d);
      assert(Math.abs(Object.values(v.focus).reduce((a, b) => a + b, 0) - 100) < 1e-6);
      assert(Object.keys(v.changes).length <= (r === 1 ? 5 : D.MAX_CHANGES));
      assert.equal(Object.keys(v.moves).filter(k => !['target', 'dial', 'forecast'].includes(k)).length, 3, 'fallback picks fill all slots');
    }
    s = E.resolveRound(s, Object.fromEntries(Object.keys(s.teams).map(id => [id, picksToDecision(s, id, {})])));
  }
  assert.equal(s.phase, 'done');
});

t('fit lock math: strength = clamp(have/need, 0.5, 1) and scales build', () => {
  let s = mkGame(7, ['metro', 'metro']);
  s = E.resolveRound(s, botsAll(s));
  s = E.resolveRound(s, botsAll(s));          // now round 3
  const id = 't0';
  const card = roundDeck(s, id).cards[0];
  const chase = card.options.find(o => o.id === 'r3_chase');
  assert(chase.fit && chase.fit.cap === 'coordination' && chase.fit.need === 60);
  const have = E.capabilities(s.teams[id], 'metro').coordination;
  assert.equal(chase.fit.strength, Math.round(Math.max(0.5, Math.min(1, have / 60)) * 100) / 100);
  assert(chase.fit.why.includes(String(chase.fit.have)));
  // force a weak team: strength floors at 0.5 and a full team caps at 1
  const weak = JSON.parse(JSON.stringify(s)); weak.teams[id].capBonus.coordination = -15; weak.teams[id].w.process = [1, 0, 0]; weak.teams[id].w.rewards = [1, 0, 0]; weak.teams[id].w.structure = [1, 0, 0];
  const wf = roundDeck(weak, id).cards[0].options.find(o => o.id === 'r3_chase').fit;
  assert(wf.strength >= 0.5 && wf.strength < 1);
  const strong = JSON.parse(JSON.stringify(s)); strong.teams[id].capBonus.coordination = 15; for (const p of D.POINTS) strong.teams[id].w[p] = [0, 0, 1];
  assert.equal(roundDeck(strong, id).cards[0].options.find(o => o.id === 'r3_chase').fit.strength, 1);
  // strength scales the capacity built: same invest, weak team builds less
  const pick = { market: 'r3_chase', org: 'r3_pilot', people: 'r3_council_reject' };
  const run = st => { const dec = Object.fromEntries(Object.keys(st.teams).map(i => [i, picksToDecision(st, i, pick)])); const out = E.resolveRound(st, dec); return { out, pend: out.teams[id].pendingBuild.chronic, fit: out.teams[id].history.at(-1).decision.fit }; };
  const a = run(strong), b = run(weak);
  assert(b.fit.strength < a.fit.strength);
  assert(b.pend < a.pend, `weak builds less ${b.pend} < ${a.pend}`);
});

t('raid moves real capacity; county contract blocks it', () => {
  const base = mkGame(9, ['metro', 'metro']);
  let s = E.resolveRound(base, botsAll(base));   // round 2
  s.teams.t0.capBonus.expertise = 15; for (const p of D.POINTS) s.teams.t0.w[p] = [0, 1, 0];
  const before = { a: s.teams.t0.capacity.specialty, b: s.teams.t1.capacity.specialty };
  const raid = { market: 'r2_raid', org: 'r2_leave', people: 'r2_staff_reject', target: 't1' };
  const idle = { market: 'r2_build', org: 'r2_leave', people: 'r2_staff_reject' };
  const out = E.resolveRound(s, { t0: picksToDecision(s, 't0', raid), t1: picksToDecision(s, 't1', idle) });
  const log = out.moveLog[2].find(x => x.kind === 'raid');
  assert(!log.blocked && log.taken > 0);
  const arrive = k => s.teams[k].pendingBuild.specialty + s.teams[k].lateBuild.specialty;
  assert(Math.abs(out.teams.t1.capacity.specialty - (before.b - log.taken + arrive('t1'))) < 0.01, 'target lost real capacity');
  assert(Math.abs(out.teams.t0.capacity.specialty - (before.a + log.gained + arrive('t0'))) < 0.01, 'raider gained capacity');
  assert(out.teams.t1.trust.physicians < s.teams.t1.trust.physicians);
  const county = { market: 'r2_county', org: 'r2_leave', people: 'r2_staff_reject' };
  const blocked = E.resolveRound(s, { t0: picksToDecision(s, 't0', raid), t1: picksToDecision(s, 't1', county) });
  const bl = blocked.moveLog[2].find(x => x.kind === 'raid');
  assert(bl.blocked && bl.taken === 0);
  assert(Math.abs(blocked.teams.t1.capacity.specialty - (before.b + arrive('t1'))) < 0.01);
  const rv = revealFor(s, blocked, 't0');
  assert(/failed/.test(rv.headlines[0]) && /county/.test(rv.headlines[0]) && rv.headlines[0].includes('Team1'), rv.headlines[0]);
  assert(!rv.headlines.join().includes('—'));
  const rv1 = revealFor(s, blocked, 't1');
  assert(/county contract stopped/.test(rv1.headlines[0]));
  // warning telegraphed a round early for bots
  const w = roundDeck(s, 't1').brief.warnings;
  assert(w.length === 1 && /plans to/.test(w[0].line), JSON.stringify(w));
});

t('exec seat flag, strike resolution, committee gate', () => {
  let s = mkGame(11, ['metro', 'metro']);
  const seat = { market: 'r1_spread', org: 'r1_keep', people: 'r1_seat' };
  const no = { market: 'r1_spread', org: 'r1_keep', people: 'r1_keepRights' };
  s = E.resolveRound(s, { t0: picksToDecision(s, 't0', seat), t1: picksToDecision(s, 't1', no) });
  assert.equal(s.teams.t0.flags.execSeat, 'seat'); assert.equal(s.teams.t1.flags.execSeat, 'no');
  s = E.resolveRound(s, botsAll(s)); s = E.resolveRound(s, botsAll(s));   // now round 4
  const cm = id => roundDeck(s, id).cards[2].options.find(o => o.id === 'r4_committee');
  assert(!cm('t0').locked && cm('t1').locked);
  // committee request from t1 is dropped by the engine
  assert.equal(E.validateDecision(s, 't1', { moves: { people: 'r4_committee' } }).moves.people, undefined);
  // force a low and a high meter
  const lo = JSON.parse(JSON.stringify(s)), hi = JSON.parse(JSON.stringify(s));
  for (const g of D.GROUPS) { lo.teams.t0.trust[g] = 10; hi.teams.t0.trust[g] = 95; }
  const hold = { market: 'r4_defend', org: 'r4_pause', people: 'r4_hold' };
  const a = E.resolveRound(lo, { t0: picksToDecision(lo, 't0', hold), t1: picksToDecision(lo, 't1', hold) });
  const b = E.resolveRound(hi, { t0: picksToDecision(hi, 't0', hold), t1: picksToDecision(hi, 't1', hold) });
  assert(a.teams.t0.history.at(-1).strike.struck && !b.teams.t0.history.at(-1).strike.struck);
  assert(a.teams.t0.history.at(-1).effCap.chronic < a.teams.t0.history.at(-1).capacity.chronic, 'walkout cut capacity');
  // committee adds to the meter
  const c = E.resolveRound(lo, { t0: picksToDecision(lo, 't0', { ...hold, people: 'r4_committee' }) });
  assert.equal(c.teams.t0.history.at(-1).strike.choice, 'committee');
  const news = roundNews(lo, a);
  assert(news.strike.teams.find(x => x.teamId === 't0').struck);
});

t('callbacks fire from earlier choices', () => {
  let s = mkGame(13, ['metro', 'metro']);
  s = E.resolveRound(s, { t0: picksToDecision(s, 't0', { market: 'r1_claim', org: 'r1_keep', people: 'r1_seat' }), t1: picksToDecision(s, 't1', { people: 'r1_keepRights' }) });
  const c0 = roundDeck(s, 't0').brief.callbacks, c1 = roundDeck(s, 't1').brief.callbacks;
  assert(c0.length === 1 && /seat/.test(c0[0].line) && c0[0].person);
  assert(c1.length === 1 && /decision rights/.test(c1[0].line));
});

t('inertia scales change cost, rival moves become news and reveal', () => {
  let s = mkGame(15, ['metro', 'metro', 'metro']);
  s = E.resolveRound(s, botsAll(s));
  const d = { changes: { rewards: 2 }, approach: 'consult' };
  const c2 = E.changeCost(s, d, 't0');
  s = E.resolveRound(s, Object.fromEntries(Object.keys(s.teams).map(id => [id, picksToDecision(s, id, { org: 'r2_leave' })])));
  s.teams.t0.lastChange = 1;
  assert(E.changeCost(s, d, 't0') > c2, 'cost grows with quiet rounds');
  const prev = s;
  s = E.resolveRound(s, botsAll(s));
  const news = roundNews(prev, s);
  assert(Object.values(news.regions).flat().length >= 3);
  const rv = revealFor(prev, s, 't0');
  assert.equal(rv.headlines.length, 2);
  for (const m of D.MARKETS) assert.equal(rv.tug[m].filter(x => x.mine).length, 1);
  for (const k of ['cash', 'outcomes', 'trust', 'share']) assert(typeof rv.causes[k] === 'string' && rv.causes[k].length);
  assert(!JSON.stringify(rv).includes('—'));
});

t('botPicks valid for every profile and round, telegraph matches play', () => {
  for (const profile of ['defender', 'prospector', 'analyzer', 'adaptive', 'reactor']) {
    let s = mkGame(17);
    for (let r = 1; r <= 5; r++) {
      const id = 't1';
      const p = botPicks(s, id, profile, 17);
      const deck = roundDeck(s, id);
      for (const c of deck.cards) { const o = c.options.find(x => x.id === p[c.slot]); assert(o && !o.locked, `${profile} r${r} ${c.slot}`); }
      const tg = s.teams[id].telegraph;
      if (r > 1 && s.teams[id].bot) assert(tg && tg.round === r, 'telegraph stored');
      s = E.resolveRound(s, Object.fromEntries(Object.keys(s.teams).map(i => [i, picksToDecision(s, i, botPicks(s, i, s.teams[i].bot || profile, 17))])));
    }
  }
});

t('state stays JSON-serializable', () => {
  let s = mkGame(19);
  for (let r = 1; r <= 5; r++) s = E.resolveRound(s, botsAll(s));
  assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
});


t('commitment dial scales focus, invest and cost; steady equals no dial', () => {
  const s = mkGame(21, ['metro', 'metro']);
  const base = { market: 'r1_claim', org: 'r1_keep', people: 'r1_seat', archetype: 'excellence' };
  const dl = k => picksToDecision(s, 't0', { ...base, dial: k });
  const none = picksToDecision(s, 't0', base), st = dl('steady'), lo = dl('light'), hi = dl('all');
  assert.deepEqual({ ...st, moves: 0 }, { ...none, moves: 0 });
  const sp = d => Object.values(d.invest).reduce((a, b) => a + b, 0), pk = d => Math.max(...Object.values(d.focus));
  assert(sp(lo) < sp(st) && sp(st) < sp(hi) && pk(lo) < pk(st) && pk(st) < pk(hi));
  assert.equal(E.validateDecision(s, 't0', hi).moves.dial, 'all');
  const card = roundDeck(s, 't0').cards[0].options[0];
  assert(card.dials.light.cost < card.dials.steady.cost && card.dials.steady.cost < card.dials.all.cost);
  assert.equal(E.validateDecision(s, 't0', { ...st, moves: { ...st.moves, dial: 'bogus' } }).moves.dial, 'steady');
  assert(['light', 'steady', 'all'].includes(botPicks(s, 't1', 'prospector', 21).dial));
});

t('forecast scored, stored, bonus, exposed in reveal and news', () => {
  let s = mkGame(23, ['metro', 'metro', 'metro']);
  s = E.resolveRound(s, botsAll(s));
  const prev = s;
  const dec = botsAll(s);
  for (const id of ['t0', 't1', 't2']) dec[id].moves.forecast = id;
  s = E.resolveRound(s, dec);
  const log = s.moveLog[2].filter(x => x.kind === 'forecast');
  assert.equal(log.length, 3);
  const winners = new Set(log.map(x => x.winner)); assert.equal(winners.size, 1);
  const w = [...winners][0];
  for (const x of log) { assert.equal(x.right, x.team === w); assert.equal(s.teams[x.team].forecasts[2].right, x.right); }
  const other = ['t0', 't1', 't2'].find(i => i !== w);
  assert(revealFor(prev, s, w).forecast.right && /called it/.test(revealFor(prev, s, w).forecast.line));
  assert.equal(revealFor(prev, s, other).forecast.right, false);
  const nw = roundNews(prev, s);
  assert.equal(nw.forecast.made, 3); assert.equal(nw.forecast.called.length, 1); assert.equal(nw.forecast.called[0].teamId, w);
  const s2 = E.resolveRound(prev, botsAll(prev));
  assert.equal(s2.moveLog[2].filter(x => x.kind === 'forecast').length, 0);
  assert.equal(revealFor(prev, s2, 't0').forecast, null);
  // the bonus is exactly +1 adaptability when right
  const base = E.resolveRound(prev, botsAll(prev));
  assert(Math.abs(s.teams[w].capBonus.adaptability - base.teams[w].capBonus.adaptability - 1) < 1e-9);
});

t('rival intel and region problem in the brief', () => {
  let s = mkGame(25, ['metro', 'metro', 'metro', 'metro']);
  s = E.resolveRound(s, botsAll(s));
  const b = roundDeck(s, 't0').brief;
  assert.equal(b.rivals.length, 3);
  for (const x of b.rivals) { assert(x.emblem !== undefined && x.lastCard && typeof x.shareMove === 'number'); assert(x.profileWord); }
  assert.equal(b.region.problem, REGION_PROBLEM.metro);
  s.teams.t1.bot = null;
  assert.equal(roundDeck(s, 't0').brief.rivals.find(x => x.teamId === 't1').profileWord, null);
  assert(!JSON.stringify(b).includes('\u2014'));
});

t('collisions return amber text only', () => {
  assert.deepEqual(collisionsFor({ market: 'r3_chase', org: 'r3_pilot', people: 'r3_council_accept' }), []);
  const c = collisionsFor({ market: 'r3_chase', org: 'r3_consult', people: 'r3_council_accept' });
  assert.equal(c.length, 1);
  assert.equal(collisionsFor({ market: 'r4_press', org: 'r4_push', people: 'r4_hold' }).length, 2);
  assert.equal(collisionsFor({ market: 'r1_undercut', org: 'r1_tighten' }).length, 1);
  for (const line of [...c, ...collisionsFor({ market: 'r2_raid', org: 'r2_townhall' })]) assert(!/\u2014|smart|best|score/i.test(line));
});


t('chosen star points honored, invalid fall back, count enforced', () => {
  let s = mkGame(27, ['metro', 'metro']);
  s = E.resolveRound(s, botsAll(s)); s = E.resolveRound(s, botsAll(s));   // round 3
  const id = 't0', tg = s.teams[id].target;
  const org = (o, extra) => picksToDecision(s, id, { org: o, ...extra });
  const def = org('r3_redesign').changes;
  assert.equal(Object.keys(def).length, 2);
  const card = roundDeck(s, id).cards[1].options.find(o => o.id === 'r3_redesign');
  assert.deepEqual(card.defaultPoints.map(x => x.point).sort(), Object.keys(def).sort());
  assert.equal(card.pointChoices.length, 5);
  for (const pc of card.pointChoices) { assert(pc.label && pc.toLabel && typeof pc.fitHint === 'string'); assert.equal(pc.choices.length, 2); assert(pc.choices.every(c => c.to !== pc.current)); }
  assert.deepEqual(card.pointChoices.filter(p => p.selected).map(p => p.point).sort(), Object.keys(def).sort());
  // custom: two points of my choosing
  const pts = ['people', 'strategy'].map(p => ({ point: p, to: (tg[p] + 1) % 3 }));
  const custom = org('r3_redesign', { points: pts }).changes;
  assert.deepEqual(custom, Object.fromEntries(pts.map(x => [x.point, x.to])));
  assert(E.validateDecision(s, id, org('r3_redesign', { points: pts })).changes.people !== undefined);
  // wrong count, same-as-current, unknown point, duplicate: all fall back to the default
  assert.deepEqual(org('r3_redesign', { points: [pts[0]] }).changes, def);
  assert.deepEqual(org('r3_redesign', { points: [{ point: 'people', to: tg.people }, pts[1]] }).changes, def);
  assert.deepEqual(org('r3_redesign', { points: [{ point: 'bogus', to: 1 }, pts[1]] }).changes, def);
  assert.deepEqual(org('r3_redesign', { points: [pts[0], pts[0]] }).changes, def);
  assert.deepEqual(org('r3_redesign', { points: 'x' }).changes, def);
  // one-point options need exactly one
  const one = org('r3_consult', { points: [pts[0]] }).changes;
  assert.deepEqual(one, { [pts[0].point]: pts[0].to });
  assert.deepEqual(org('r3_consult', { points: pts }).changes, Object.fromEntries(Object.entries(def).slice(0, 1)));
  // r1 loosen
  const s1 = mkGame(27, ['metro', 'metro']);
  const l = picksToDecision(s1, 't1', { org: 'r1_loosen', archetype: 'excellence', points: [{ point: 'structure', to: 2 }] });
  assert.deepEqual(l.changes, { structure: 2 });
  assert.equal(picksToDecision(s1, 't1', { org: 'r1_loosen', archetype: 'excellence' }).changes.rewards, 2);
  // brief star view and a neutral hint
  const st = roundDeck(s, id).brief.star;
  assert.equal(Object.keys(st.points).length, 5); assert(Array.isArray(st.mismatches));
  const w = JSON.parse(JSON.stringify(s)); w.teams[id].w.structure = [0, 0, 1]; w.teams[id].w.process = [0, 1, 0]; w.teams[id].w.rewards = [0, 1, 0]; w.teams[id].target = { ...w.teams[id].target, structure: 2, process: 1, rewards: 1 };
  assert(roundDeck(w, id).brief.star.mismatches.includes('two bosses and clinician silos'));
  const fixes = roundDeck(w, id).cards[1].options.find(o => o.id === 'r3_consult').pointChoices.find(p => p.point === 'process').choices.find(c => c.to === 2).fitHint;
  assert(/two bosses/.test(fixes) && !/\d/.test(fixes), fixes);
  assert.deepEqual(JSON.parse(JSON.stringify(roundDeck(w, id))), roundDeck(w, id));
  assert(!JSON.stringify(roundDeck(w, id)).includes('\u2014'));
});

console.log(`\n${n} tests passed`);
