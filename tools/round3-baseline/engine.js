// The System: deterministic simulation engine. Pure functions over plain JSON
// state; no DOM, no network. resolveRound(state, decisions) returns a new state.
import * as D from './data.js';
import { EVENTS, PROPOSALS } from './cards.js';

// ---------- utilities ----------
export function rng(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(...parts) {
  let h = 2166136261;
  for (const ch of parts.join('|')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const r2 = x => Math.round(x * 100) / 100;
const clone = o => JSON.parse(JSON.stringify(o));
const onehot = i => [0, 1, 2].map(j => (j === i ? 1 : 0));
const lerp = (a, b, p) => a.map((v, i) => v * (1 - p) + b[i] * p);
const sum = arr => arr.reduce((s, v) => s + v, 0);

// ---------- setup ----------
// Spread n teams across the four regions as evenly as possible.
export function assignRegions(n, seed = 1) {
  const order = [...D.REGION_IDS];
  const rand = rng(seed);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  return Array.from({ length: n }, (_, i) => order[i % order.length]);
}

export function createGame({ seed = 1, teams }) {
  const state = { version: 1, seed, round: 1, phase: 'decide', regions: {}, teams: {}, log: [] };
  const rand = rng(hash(seed, 'events'));
  for (const rid of D.REGION_IDS) {
    const pool = [...D.REGIONS[rid].events];
    const events = {};
    for (const r of [2, 4, 5]) events[r] = pool.splice(Math.floor(rand() * pool.length), 1)[0];
    state.regions[rid] = { teams: [], growth: 1, events };
  }
  for (const t of teams) {
    state.teams[t.id] = newTeam(t);
    state.regions[t.region].teams.push(t.id);
  }
  for (const id of Object.keys(state.teams)) state.teams[id].proposal = pickProposal(state, id);
  return state;
}

function newTeam({ id, name, region, archetype = 'access', bot = null }) {
  const a = D.ARCHETYPES[archetype];
  const w = {};
  for (const p of D.POINTS) w[p] = onehot(a.star[p]);
  return {
    id, name, region, archetype, bot,
    target: { ...a.star }, w, transitions: {},
    capacity: { ...a.capacity }, pendingBuild: { primary: 0, specialty: 0, chronic: 0 }, lateBuild: { primary: 0, specialty: 0, chronic: 0 },
    cash: D.START_CASH, trust: { ...a.trust }, influenceBonus: {}, capBonus: {},
    exploreStock: 0, pilot: null, listening: 0, mandates: 0,
    share: { primary: 0, specialty: 0, chronic: 0 }, reputation: { primary: 55, specialty: 55, chronic: 55 },
    disruption: 0, usedProposals: [], proposal: null, history: [], lastDecision: null,
  };
}

// ---------- capabilities ----------
export function influence(team) {
  const out = {};
  for (const g of D.GROUPS) {
    const spec = D.INFLUENCE[g];
    let v = spec.base + (team.influenceBonus[g] || 0);
    for (const p of ['structure', 'people', 'process']) if (spec[p]) v += sum(team.w[p].map((x, i) => x * spec[p][i]));
    out[g] = Math.max(0.05, v);
  }
  const tot = sum(Object.values(out));
  for (const g of D.GROUPS) out[g] /= tot;
  return out;
}

export function interactionsActive(team) {
  return D.INTERACTIONS.map(ix => {
    let s = 1;
    for (const [p, o] of Object.entries(ix.need)) s *= team.w[p][o];
    return { id: ix.id, note: ix.note, strength: r2(s) };
  }).filter(x => x.strength > 0.05);
}

export function capabilities(team, regionId, { disruption = team.disruption } = {}) {
  const cap = {};
  for (const k of D.CAPS) cap[k] = D.CAP_BASE;
  for (const p of D.POINTS) team.w[p].forEach((wt, o) => { for (const k of D.CAPS) cap[k] += wt * D.CONTRIB[p][o][k]; });
  for (const ix of D.INTERACTIONS) {
    let s = 1;
    for (const [p, o] of Object.entries(ix.need)) s *= team.w[p][o];
    for (const k of D.CAPS) cap[k] += s * ix.fx[k];
  }
  for (const k of D.CAPS) cap[k] += team.capBonus[k] || 0;
  for (const g of D.GROUPS) cap[D.TRUST_CAP[g]] += ((team.trust[g] - 50) / 50) * 8;
  cap.adaptability += Math.min(20, team.exploreStock);
  cap.efficiency -= disruption * 0.7;
  cap.coordination -= disruption * 0.8;
  cap.responsiveness -= disruption * 0.5;
  for (const k of D.CAPS) cap[k] = r2(clamp(cap[k], 5, 95));
  return cap;
}

function laborMult(team, region, ev) {
  const out = {};
  const turnover = 1 + Math.max(0, 50 - avgTrust(team)) / 150;
  for (const m of D.MARKETS) {
    let v = region.labor * turnover * (ev?.labor || 1);
    for (const ix of D.INTERACTIONS) if (ix.labor) {
      let s = 1;
      for (const [p, o] of Object.entries(ix.need)) s *= team.w[p][o];
      v *= 1 + s * ix.labor[m];
    }
    out[m] = v;
  }
  return out;
}
export const avgTrust = team => sum(D.GROUPS.map(g => team.trust[g])) / D.GROUPS.length;
export function weightedTrust(team) {
  const inf = influence(team);
  return sum(D.GROUPS.map(g => team.trust[g] * inf[g]));
}

// ---------- decisions ----------
export function defaultDecision(state, id) {
  const t = state.teams[id];
  const prev = t.lastDecision;
  return {
    archetype: t.archetype,
    focus: prev ? { ...prev.focus } : { primary: 34, specialty: 33, chronic: 33 },
    invest: { primary: 0, specialty: 0, chronic: 0 },
    price: prev ? prev.price : 'standard',
    explore: 0, changes: {}, approach: 'consult', response: 'reject', pilot: !!t.pilot,
    missing: true,
  };
}

// Clamp a raw decision into a legal one. Never trusts the client.
export function validateDecision(state, id, raw) {
  const t = state.teams[id];
  const d = { ...defaultDecision(state, id), ...(raw || {}), missing: !raw };
  if (state.round !== 1 || !D.ARCHETYPES[d.archetype]) d.archetype = t.archetype;
  const f = {};
  for (const m of D.MARKETS) f[m] = Math.max(0, Number(d.focus?.[m]) || 0);
  const ft = sum(Object.values(f)) || 1;
  for (const m of D.MARKETS) f[m] = (f[m] / ft) * 100;
  d.focus = f;
  if (!D.PRICE[d.price]) d.price = 'standard';
  if (!D.APPROACHES[d.approach]) d.approach = 'consult';
  if (!['accept', 'reject', 'counter'].includes(d.response)) d.response = 'reject';
  d.pilot = state.round >= D.PILOT_ROUND && !!d.pilot;
  const ch = {};
  const base = state.round === 1 ? D.ARCHETYPES[d.archetype].star : t.target;
  for (const p of D.POINTS) {
    const o = d.changes?.[p];
    if (Number.isInteger(o) && o >= 0 && o <= 2 && o !== base[p]) ch[p] = o;
  }
  if (state.round > 1) {
    const keys = Object.keys(ch).slice(0, D.MAX_CHANGES);
    for (const k of Object.keys(ch)) if (!keys.includes(k)) delete ch[k];
  }
  d.changes = ch;
  const inv = {};
  for (const m of D.MARKETS) inv[m] = clamp(Number(d.invest?.[m]) || 0, 0, 30);
  d.explore = clamp(Number(d.explore) || 0, 0, 8);
  // Spending cannot exceed cash plus the credit line.
  const fixedSpend = changeCost(state, d) + (d.pilot ? D.PILOT_COST : 0) + proposalCost(t, d.response);
  const room = Math.max(0, t.cash + D.CREDIT_LINE - fixedSpend);
  const want = sum(Object.values(inv)) + d.explore;
  const scale = want > room ? room / want : 1;
  for (const m of D.MARKETS) inv[m] = r2(inv[m] * scale);
  d.explore = r2(d.explore * scale);
  d.invest = inv;
  return d;
}

export function changeCost(state, d) {
  if (state.round === 1) return 0;
  const n = Object.keys(d.changes || {}).length;
  return n ? n * D.CHANGE_COST + D.APPROACHES[d.approach].cost : 0;
}
function proposalCost(t, response) {
  const card = PROPOSALS.find(p => p.id === t.proposal?.id);
  return card?.[response]?.cost || 0;
}

// ---------- proposals ----------
function proposalContext(state, team) {
  const last = team.history[team.history.length - 1];
  const totalCap = sum(D.MARKETS.map(m => team.capacity[m]));
  const served = last ? sum(D.MARKETS.map(m => last.served[m])) : totalCap * 0.85;
  const market = {};
  const f = team.lastDecision?.focus || { primary: 34, specialty: 33, chronic: 33 };
  for (const m of D.MARKETS) market[m] = f[m] / 100;
  return {
    util: totalCap ? served / totalCap : 0, cap: capabilities(team, team.region), w: team.w, region: team.region, market,
    changing: p => !!team.transitions[p], activeChanges: Object.keys(team.transitions).length, disruption: team.disruption,
  };
}
function pickProposal(state, id) {
  const team = state.teams[id];
  if (state.round === 1) return null;   // founding round: no proposal yet
  const x = proposalContext(state, team);
  const rand = rng(hash(state.seed, id, state.round, 'prop'));
  let best = null, bestScore = 0;
  for (const p of PROPOSALS) {
    if (team.usedProposals.includes(p.id)) continue;
    const s = p.trigger(team, x) + rand() * 0.8;
    if (s > bestScore) { best = p; bestScore = s; }
  }
  if (!best) return null;
  const genuine = !!best.genuine(team, x);
  // Listening (recent consultation or joint redesign) reveals whether the floor data backs the ask.
  const evidence = team.listening > 0 ? (genuine ? 'strong' : 'weak') : null;
  return { id: best.id, group: best.group, title: best.title, line: best.line, genuine, evidence };
}

function applyEffects(team, fx, notes) {
  if (!fx) return { capMult: {}, quality: {}, cost: 0, disruption: 0 };
  for (const [g, v] of Object.entries(fx.trust || {})) team.trust[g] = clamp(team.trust[g] + v, 0, 100);
  for (const [k, v] of Object.entries(fx.capBonus || {})) team.capBonus[k] = clamp((team.capBonus[k] || 0) + v, -15, 15);
  for (const [g, v] of Object.entries(fx.influence || {})) team.influenceBonus[g] = (team.influenceBonus[g] || 0) + v;
  for (const [p, v] of Object.entries(fx.progress || {})) if (team.transitions[p]) team.transitions[p].progress = Math.max(0, team.transitions[p].progress + v);
  if (fx.pauseOne) {
    const ps = Object.keys(team.transitions);
    if (ps.length) { team.transitions[ps[ps.length - 1]].paused = 1; notes.push('One change paused.'); }
  }
  return { capMult: fx.capMult || {}, quality: fx.quality || {}, cost: fx.cost || 0, disruption: fx.disruption || 0 };
}
function mergeFx(a, b) {
  const out = { capMult: { ...a.capMult }, quality: { ...a.quality }, cost: a.cost + b.cost, disruption: a.disruption + b.disruption };
  for (const [m, v] of Object.entries(b.capMult)) out.capMult[m] = (out.capMult[m] || 1) * v;
  for (const [m, v] of Object.entries(b.quality)) out.quality[m] = (out.quality[m] || 0) + v;
  return out;
}

// ---------- change ----------
function applyChanges(state, team, d, notes) {
  const r = state.round;
  if (r === 1) {
    // Founding: pick archetype then free configuration.
    const a = D.ARCHETYPES[d.archetype];
    if (d.archetype !== team.archetype) {
      team.archetype = d.archetype;
      team.capacity = { ...a.capacity };
      team.trust = { ...a.trust };
    }
    for (const p of D.POINTS) {
      const o = d.changes[p] ?? a.star[p];
      team.target[p] = o; team.w[p] = onehot(o);
    }
    return;
  }
  const ap = D.APPROACHES[d.approach];
  const inf = influence(team);
  const changed = Object.entries(d.changes);
  if (!changed.length) return;
  if (d.approach === 'mandate') team.mandates += 1;
  const memory = 1 + 0.25 * Math.max(0, team.mandates - 1);   // repeated mandates hurt more
  for (const [p, o] of changed) {
    const threat = D.THREAT[p][o];
    for (const [g, s] of Object.entries(threat)) {
      const hit = ap.trustHit * s * (1 + inf[g]) * (d.approach === 'mandate' ? memory : 1);
      team.trust[g] = clamp(team.trust[g] - hit, 0, 100);
    }
    team.transitions[p] = { from: [...team.w[p]], to: o, progress: 0, approach: d.approach, started: r };
    team.target[p] = o;
    if (ap.authority) for (const g of Object.keys(threat)) team.influenceBonus[g] = (team.influenceBonus[g] || 0) + 0.04;
    notes.push(`${p}: ${D.OPTIONS[p][o]} (${d.approach})`);
  }
  if (ap.knowledge) team.listening = 2;
}

function advanceTransitions(team, cap) {
  const active = Object.keys(team.transitions);
  const n = active.length;
  if (!n) return { disruption: 0, completed: [] };
  const crowd = Math.sqrt(n);
  const capacity = 1 + (cap.adaptability - 40) / 200;
  const completed = [];
  let disruption = 0;
  for (const p of active) {
    const tr = team.transitions[p];
    const ap = D.APPROACHES[tr.approach];
    if (tr.paused) { tr.paused = 0; disruption += D.DISRUPTION_PER_CHANGE * 0.3; continue; }
    const affected = Object.keys(D.THREAT[p][tr.to]);
    const tAff = affected.length ? sum(affected.map(g => team.trust[g])) / affected.length : 60;
    // Consultation and joint redesign surface floor knowledge: later rounds go faster.
    const learned = ap.knowledge && tr.progress > 0 ? 0.15 : 0;
    const speed = (ap.speed + learned) * (0.5 + tAff / 100) * capacity / crowd;
    tr.progress = Math.min(1, tr.progress + speed);
    team.w[p] = lerp(tr.from, onehot(tr.to), tr.progress);
    disruption += D.DISRUPTION_PER_CHANGE * (ap.knowledge ? 0.6 : 1) * (1.4 - tAff / 100) * (1 - tr.progress * 0.5);
    if (tr.progress >= 1) {
      completed.push(p);
      if (tr.approach === 'joint') team.capBonus.coordination = clamp((team.capBonus.coordination || 0) + 3, -15, 15);
      delete team.transitions[p];
    }
  }
  return { disruption, completed };
}

// ---------- market ----------
function attractiveness(team, regionId, market, cap, d, quality) {
  const reg = D.REGIONS[regionId];
  let a = 0;
  for (const k of D.CAPS) a += (D.MARKET_WEIGHTS[market][k] + (reg.weightShift[k] || 0)) * cap[k] / 100;
  a += D.FOCUS_ATTRACT * d.focus[market] / 100;
  a += D.PRICE[d.price].attract * (market === 'specialty' ? 0.5 : 1);
  a += D.LOYALTY * team.share[market];
  a += (team.reputation[market] - 55) / 100;
  if (market === 'primary') {
    const perTeam = D.DEMAND_PER_TEAM.primary * reg.demand.primary;
    a += (regionId === 'mountain' ? 0.35 : 0.15) * Math.log(Math.max(0.2, team.capacity.primary / perTeam));
  }
  return a;
}

// Allocate a shared pool of demand under capacity limits. Pure and exported for tests.
export function allocate(demand, utils, caps, outsideUtil) {
  const n = utils.length;
  const e = utils.map(u => Math.exp(D.LOGIT_K * u));
  const e0 = Math.exp(D.LOGIT_K * outsideUtil);
  const tot = sum(e) + e0;
  const want = e.map(x => (demand * x) / tot);
  const served = want.map((w, i) => Math.min(w, caps[i]));
  let spill = sum(want.map((w, i) => w - served[i]));
  for (let it = 0; it < 4 && spill > 1e-9; it++) {
    const open = served.map((s, i) => caps[i] - s > 1e-9 ? e[i] : 0);
    const ot = sum(open) + e0;   // some spillover always leaves to outside providers
    let moved = 0;
    for (let i = 0; i < n; i++) {
      if (!open[i]) continue;
      const add = Math.min(caps[i] - served[i], (spill * open[i]) / ot);
      served[i] += add; moved += add;
    }
    spill -= moved;
    if (moved < 1e-9) break;
  }
  return { served, outside: demand - sum(served) };
}

// ---------- round resolution ----------
export function resolveRound(prev, rawDecisions) {
  if (prev.phase === 'done') throw new Error('game over');
  const state = clone(prev);
  const r = state.round;
  const rand = rng(hash(state.seed, r, 'resolve'));
  const out = { round: r, regions: {}, teams: {} };
  const ctx = {};

  // 1. decisions, proposals, changes, transitions, builds
  for (const id of Object.keys(state.teams)) {
    const team = state.teams[id];
    const d = validateDecision(state, id, rawDecisions?.[id]);
    const notes = [];
    const region = state.regions[team.region];
    const evId = region.events[r];
    const ev = evId ? EVENTS[evId] : null;

    let fx = { capMult: {}, quality: {}, cost: 0, disruption: 0 };
    const card = PROPOSALS.find(p => p.id === team.proposal?.id);
    if (card) {
      fx = mergeFx(fx, applyEffects(team, card[d.response], notes));
      if (d.response === 'reject' && team.proposal.genuine) fx = mergeFx(fx, applyEffects(team, card.rejectIfGenuine, notes));
      if (d.response === 'accept' && !team.proposal.genuine) fx = mergeFx(fx, applyEffects(team, card.acceptIfFake, notes));
      team.usedProposals.push(card.id);
    }
    const chCost = changeCost(state, d);
    applyChanges(state, team, d, notes);
    const pre = capabilities(team, team.region, { disruption: 0 });
    const tr = advanceTransitions(team, pre);
    const fatigue = team.history.slice(-2).reduce((s, h) => s + h.changes, 0) * 1.5;
    team.disruption = Math.max(0, tr.disruption + fatigue + fx.disruption - Math.min(6, team.exploreStock / 3));
    if (ev?.trust) for (const [g, v] of Object.entries(ev.trust)) team.trust[g] = clamp(team.trust[g] + v, 0, 100);
    if (ev?.strike) {
      const wt = weightedTrust(team);
      if (wt < ev.strike + 15) { team.disruption += 8; notes.push('Strike: units ran short.'); fx.capMult = { ...fx.capMult, primary: (fx.capMult.primary || 1) * 0.9, chronic: (fx.capMult.chronic || 1) * 0.9 }; }
      else notes.push('Staff voted no strike.');
    }

    // exploration
    let explored = 0;
    if (d.explore > 0) {
      const ok = rand() < 0.55 + pre.adaptability / 250;
      if (ok) { explored = d.explore * D.EXPLORE_RETURN; team.exploreStock += explored; }
      notes.push(ok ? 'Exploration paid off.' : 'Exploration did not pan out this round.');
    }
    // pilot unit (structural ambidexterity)
    if (d.pilot && !team.pilot) {
      const ok = rand() < 0.5 + pre.adaptability / 200 + team.exploreStock / 60;
      team.pilot = { started: r, success: ok };
      notes.push(ok ? 'Pilot unit launched and is working.' : 'Pilot unit is struggling.');
    } else if (!d.pilot && team.pilot) team.pilot = null;

    // capacity: last round's builds arrive; new builds queue
    const staffing = D.REGIONS[team.region].staffing * (0.75 + pre.scalability / 200);
    for (const m of D.MARKETS) {
      team.capacity[m] += team.pendingBuild[m] + team.lateBuild[m];
      team.lateBuild[m] = 0;
      const built = d.invest[m] * D.BUILD_K_PER_M[m] * staffing;
      const delay = ev?.buildDelay || 0;
      team.pendingBuild[m] = built * (1 - delay);
      team.lateBuild[m] = built * delay;
    }

    const cap = capabilities(team, team.region);
    if (team.pilot?.success) cap.adaptability = clamp(cap.adaptability + 6, 5, 95);
    const effCap = {};
    for (const m of D.MARKETS) {
      let c = team.capacity[m] * (fx.capMult[m] || 1);
      if (ev?.capLoss?.[m]) {
        const sh = ev.shield ? clamp(cap[ev.shield.cap] / ev.shield.at, 0, 1) : 0;
        c *= 1 - ev.capLoss[m] * (1 - 0.7 * sh);
      }
      if (m === 'chronic' && team.pilot) c *= 1 + (team.pilot.success ? D.PILOT_CHRONIC_CAP : D.PILOT_CHRONIC_CAP / 3);
      effCap[m] = c;
    }
    ctx[id] = { d, notes, ev, fx, cap, effCap, chCost, completed: tr.completed, explored };
    team.lastDecision = { focus: d.focus, price: d.price };
  }

  // 2. markets per region
  for (const rid of D.REGION_IDS) {
    const region = state.regions[rid];
    const reg = D.REGIONS[rid];
    const ids = region.teams;
    if (!ids.length) continue;
    const evId = region.events[r];
    const ev = evId ? EVENTS[evId] : null;
    if (r > 1) region.growth *= 1 + reg.growth;
    const ro = { event: evId, demand: {}, outside: {}, served: {} };
    for (const m of D.MARKETS) {
      const demand = D.DEMAND_PER_TEAM[m] * ids.length * reg.demand[m] * region.growth * (ev?.demand?.[m] || 1);
      const utils = ids.map(id => attractiveness(state.teams[id], rid, m, ctx[id].cap, ctx[id].d));
      const caps = ids.map(id => ctx[id].effCap[m]);
      const { served, outside } = allocate(demand, utils, caps, D.OUTSIDE_ATTRACT[m]);
      ro.demand[m] = r2(demand); ro.outside[m] = r2(outside);
      ids.forEach((id, i) => { ctx[id].served = ctx[id].served || {}; ctx[id].served[m] = served[i]; ctx[id].share = ctx[id].share || {}; ctx[id].share[m] = served[i] / demand; });
    }
    out.regions[rid] = ro;
  }

  // 3. quality, finance, trust, history
  for (const id of Object.keys(state.teams)) {
    const team = state.teams[id];
    const { d, cap, effCap, served, share, ev, fx, notes } = ctx[id];
    const reg = D.REGIONS[team.region];
    const labor = laborMult(team, reg, ev);
    const quality = {}, util = {};
    for (const m of D.MARKETS) {
      let q = 12;
      for (const k of D.CAPS) q += D.QUALITY_WEIGHTS[m][k] * cap[k] * 0.95;
      if (m === 'chronic' && team.pilot?.success) q += D.PILOT_COORD * D.QUALITY_WEIGHTS.chronic.coordination;
      util[m] = effCap[m] ? served[m] / effCap[m] : 0;
      if (util[m] > 0.9) q -= (util[m] - 0.9) * 120;
      q += fx.quality[m] || 0;
      if (ev?.qualityHit) q -= ev.qualityHit * (1 - clamp(cap[ev.shield.cap] / ev.shield.at, 0, 1));
      q += ((team.trust.nurses - 50) / 50) * 4;
      quality[m] = r2(clamp(q, 5, 98));
    }
    const rev = {}, varc = {}, fixed = {};
    const reform = r >= D.REFORM_ROUND;
    for (const m of D.MARKETS) {
      let rate = D.RATES[m] * D.PRICE[d.price].rate * (ev?.rate?.[m] || 1);
      if (reform) { const ramp = D.REFORM_RAMP[r] ?? 1; rate *= (1 + (reg.reform[m] - 1) * ramp) * (1 + ramp * D.REFORM_QUALITY_SLOPE * (quality[m] - 60)); }
      rev[m] = served[m] * rate;
      varc[m] = served[m] * D.RATES[m] * D.VAR_COST[m] * labor[m] * (1.15 - cap.efficiency / 250);
      fixed[m] = team.capacity[m] * D.FIXED_PER_K[m] * reg.fixed * (ev?.fixed || 1);
    }
    const w = team.w;
    const overhead = 2 + 2.2 * w.structure[2] + 1.2 * w.structure[1] + 0.5 * w.structure[0]
      + D.INTERACTIONS.find(x => x.id === 'flex_bench').training * w.people[2]
      + (team.pilot ? D.PILOT_COST : 0) + fx.cost;
    const interest = team.cash < 0 ? -team.cash * D.DEBT_RATE : 0;
    const revenue = sum(Object.values(rev));
    const opCost = sum(Object.values(varc)) + sum(Object.values(fixed)) + overhead + interest;
    const operating = revenue - opCost;
    const investment = sum(Object.values(d.invest)) + d.explore + ctx[id].chCost;
    const startCash = team.cash;
    team.cash = startCash + operating - investment;

    // reputation and share memory
    for (const m of D.MARKETS) {
      team.reputation[m] = r2(team.reputation[m] * 0.6 + quality[m] * 0.4);
      team.share[m] = share[m];
    }
    // trust drifts toward a neutral 55; overwork wears on nurses
    for (const g of D.GROUPS) team.trust[g] = clamp(team.trust[g] + (55 - team.trust[g]) * 0.08, 0, 100);
    const avgUtil = sum(D.MARKETS.map(m => served[m])) / Math.max(1, sum(D.MARKETS.map(m => effCap[m])));
    if (avgUtil > 0.92) team.trust.nurses = clamp(team.trust.nurses - (avgUtil - 0.92) * 60, 0, 100);
    if (team.listening > 0) team.listening -= 1;

    const servedTot = sum(Object.values(served));
    const outcome = servedTot ? sum(D.MARKETS.map(m => quality[m] * served[m])) / servedTot : 0;
    const revShareDen = sum(state.regions[team.region].teams.map(o => sum(D.MARKETS.map(m => ctx[o].served[m] * D.RATES[m]))));
    const hist = {
      round: r, served: mapR(served), share: mapR(share, 4), quality, util: mapR(util, 3), capacity: mapR(team.capacity), effCap: mapR(effCap),
      capabilities: cap, revenue: r2(revenue), rev: mapR(rev), varCost: r2(sum(Object.values(varc))), fixedCost: r2(sum(Object.values(fixed))),
      overhead: r2(overhead), interest: r2(interest), operating: r2(operating), investment: r2(investment), changeCost: r2(ctx[id].chCost),
      startCash: r2(startCash), cash: r2(team.cash), outcome: r2(outcome), trust: mapR(team.trust), workforceTrust: r2(weightedTrust(team)),
      marketShare: r2(revShareDen ? sum(D.MARKETS.map(m => served[m] * D.RATES[m])) / revShareDen : 0),
      disruption: r2(team.disruption), changes: Object.keys(d.changes).length * (r === 1 ? 0 : 1), approach: d.approach,
      completed: ctx[id].completed, transitions: Object.fromEntries(Object.entries(team.transitions).map(([p, t]) => [p, r2(t.progress)])),
      proposal: team.proposal ? { id: team.proposal.id, response: d.response, genuine: team.proposal.genuine } : null,
      event: ev ? state.regions[team.region].events[r] : null, missing: d.missing, notes, decision: d,
    };
    team.history.push(hist);
    out.teams[id] = hist;
  }

  state.log.push({ round: r, regions: out.regions });
  if (r >= D.ROUNDS) { state.phase = 'done'; state.round = r + 1; }
  else {
    state.round = r + 1;
    for (const id of Object.keys(state.teams)) state.teams[id].proposal = pickProposal(state, id);
  }
  state.version += 1;
  return state;
}
const mapR = (o, k = 2) => Object.fromEntries(Object.entries(o).map(([a, v]) => [a, Math.round(v * 10 ** k) / 10 ** k]));

// ---------- what a team sees before deciding ----------
export function brief(state, id) {
  const team = state.teams[id];
  const r = state.round;
  const region = state.regions[team.region];
  const ev = region.events[r];
  const next = region.events[r + 1];
  return {
    round: r, region: team.region,
    event: ev ? { id: ev, ...pickText(EVENTS[ev]) } : null,
    warning: r + 1 === D.REFORM_ROUND ? { id: 'reform', line: 'Washington is debating paying for outcomes, not visits.' }
      : next ? { id: next, line: EVENTS[next].warn } : null,
    reform: r >= D.REFORM_ROUND,
    proposal: team.proposal ? { ...team.proposal, genuine: undefined } : null,
    capabilities: capabilities(team, team.region),
    interactions: interactionsActive(team),
    influence: influence(team),
  };
}
const pickText = e => ({ title: e.title, line: e.line, icon: e.icon });

// Rough forecast for the UI. It is an estimate: it holds rivals at last round.
export function forecast(state, id, raw) {
  const sim = clone(state);
  const decisions = {};
  for (const o of Object.keys(sim.teams)) decisions[o] = o === id ? raw : sim.teams[o].lastDecision ? { ...sim.teams[o].lastDecision, changes: {}, invest: { primary: 0, specialty: 0, chronic: 0 } } : null;
  const after = resolveRound(sim, decisions);
  const h = after.teams[id].history.at(-1);
  return { revenue: h.revenue, operating: h.operating, cash: h.cash, outcome: h.outcome, workforceTrust: h.workforceTrust, marketShare: h.marketShare, capabilities: h.capabilities, disruption: h.disruption };
}

// ---------- scoring ----------
export function benchmarkRevenue(regionId) {
  const reg = D.REGIONS[regionId];
  return sum(D.MARKETS.map(m => D.DEMAND_PER_TEAM[m] * reg.demand[m] * D.RATES[m]));
}
export function score(state, id) {
  const t = state.teams[id];
  const h = t.history;
  if (!h.length) return null;
  const bench = benchmarkRevenue(t.region) * h.length;
  const cashGain = t.cash - D.START_CASH;
  const negRounds = h.filter(x => x.cash < 0).length;
  const financial = clamp(50 + 250 * cashGain / bench - 8 * negRounds, 0, 100);
  const wts = h.map((_, i) => (i >= 3 ? 1.5 : 1));
  const outcomeAvg = sum(h.map((x, i) => x.outcome * wts[i])) / sum(wts);
  const outcomes = clamp((outcomeAvg - 30) * 100 / 55, 0, 100);
  const last = h[h.length - 1];
  const capsSorted = Object.values(last.capabilities).sort((a, b) => b - a);
  const capScore = clamp((sum(capsSorted.slice(0, 4)) / 4 - 30) * 100 / 55, 0, 100);
  const tried = h.reduce((s, x) => s + x.changes, 0);
  const done = h.reduce((s, x) => s + x.completed.length, 0);
  const avgDis = sum(h.map(x => x.disruption)) / h.length;
  const change = clamp((tried ? 60 * done / tried + 40 : 70) - avgDis * 1.5, 0, 100);
  const minTrust = Math.min(...D.GROUPS.map(g => t.trust[g]));
  const resilience = clamp(0.5 * capScore + 0.3 * change + 0.2 * clamp((minTrust - 20) * 100 / 60, 0, 100), 0, 100);
  let total = D.SCORE_WEIGHTS.financial * financial + D.SCORE_WEIGHTS.outcomes * outcomes + D.SCORE_WEIGHTS.resilience * resilience;
  const capped = last.outcome < D.QUALITY_FLOOR;
  if (capped) total = Math.min(total, D.QUALITY_CAP_SCORE);
  return { id, region: t.region, financial: r2(financial), outcomes: r2(outcomes), resilience: r2(resilience), total: r2(total), capped,
    parts: { cashGain: r2(cashGain), bench: r2(bench), negRounds, outcomeAvg: r2(outcomeAvg), capScore: r2(capScore), change: r2(change), minTrust: r2(minTrust) } };
}
export function rankings(state) {
  const all = Object.keys(state.teams).map(id => score(state, id)).filter(Boolean).sort((a, b) => b.total - a.total);
  all.forEach((s, i) => (s.classRank = i + 1));
  for (const rid of D.REGION_IDS) all.filter(s => s.region === rid).forEach((s, i) => (s.regionRank = i + 1));
  return all;
}

// Short plain diagnosis for the debrief, built from the actual history.
export function diagnosis(state, id) {
  const t = state.teams[id];
  const s = score(state, id);
  const h = t.history;
  const last = h.at(-1);
  const caps = Object.entries(last.capabilities).sort((a, b) => b[1] - a[1]);
  const lines = [];
  lines.push(`Strongest: ${caps[0][0]}, ${caps[1][0]}. Weakest: ${caps.at(-1)[0]}.`);
  const mandates = h.filter(x => x.changes && x.approach === 'mandate').length;
  const talks = h.filter(x => x.changes && x.approach !== 'mandate').length;
  if (mandates + talks === 0) lines.push('Never redesigned the organization.');
  else lines.push(`Redesigns: ${mandates} by mandate, ${talks} with staff.`);
  const low = D.GROUPS.filter(g => t.trust[g] < 40);
  if (low.length) lines.push(`Lost the ${low.join(' and ')}.`);
  const peakDis = Math.max(...h.map(x => x.disruption));
  if (peakDis > 15) lines.push(`Change disruption peaked at ${Math.round(peakDis)} in round ${h.find(x => x.disruption === peakDis).round}.`);
  const unfinished = Object.keys(t.transitions);
  if (unfinished.length) lines.push(`Still mid-change at the end: ${unfinished.join(', ')}.`);
  if (s.capped) lines.push('Patient outcomes fell below the safety floor, so the score was capped.');
  const fit = interactionsActive(t).filter(x => x.strength > 0.5).map(x => x.note);
  return { score: s, lines, fit };
}
