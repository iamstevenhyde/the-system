// The System v2: card-driven mechanics read by resolveRound. Raids, county
// contracts, fit lock, exec seat, strike vote, inertia, telegraph planning.
// Kept out of engine.js so engine numeric literals stay pinned by bounds-check.
import * as D from './data.js';
import { DK, OPTION_FX, FORCED_PROPOSALS, CHIEF_GROUP, SLOTS } from './deckdata.js';
import { DIALS, FORECAST_BONUS } from './deck5data.js';
import { weightedTrust } from './engine.js';

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const r2 = x => Math.round(x * 100) / 100;
const clean = (s, n) => (typeof s === 'string' ? s.replace(/[<>]/g, '').trim().slice(0, n) : '');

let planner = null;
export function registerPlanner(fn) { planner = fn; }
export function plan(state) {
  if (!planner) return;
  for (const [id, t] of Object.entries(state.teams)) if (t.bot) t.telegraph = planner(state, id);
}

export function newTeamExtras(emblem) {
  return { emblem, flags: { execSeat: null, county: 0, pilotNext: false }, picks: {}, telegraph: null, lastChange: 1 };
}
function ensure(t) {
  t.flags ||= { execSeat: null, county: 0, pilotNext: false };
  t.picks ||= {};
}

export function inertia(state, id) {
  const t = id && state.teams[id];
  if (!t) return 1;
  const since = state.round - (t.lastChange ?? 1);
  return Math.min(DK.INERTIA_MAX, 1 + DK.INERTIA_STEP * Math.max(0, since - 1));
}
export const forcedBonus = (state, pid) => (FORCED_PROPOSALS[state.round] === pid ? DK.FORCED_BONUS : 0);
export function attractBonus(team, market, round) {
  const c = team.flags?.county;
  return c && round - c <= DK.COUNTY_SPAN ? DK.COUNTY_LOCK * team.share[market] : 0;
}
export const fitScale = (d, market) => (d.fit && d.fit.market === market ? d.fit.strength : 1);
export const movesCost = d => SLOTS.reduce((s, k) => s + (OPTION_FX[d.moves?.[k]]?.fx.cost || 0), 0);

export function defaultTarget(state, id) {
  const t = state.teams[id];
  const rivals = state.regions[t.region].teams.filter(o => o !== id);
  rivals.sort((a, b) => state.teams[b].capacity.specialty - state.teams[a].capacity.specialty || (a < b ? -1 : 1));
  return rivals[0] || null;
}
export function isLocked(t, optId) {
  const o = OPTION_FX[optId];
  return !!(o?.needSeat && t.flags?.execSeat !== 'seat');
}

// Called from validateDecision. Never trusts the client.
export function sanitize(state, id, raw, d, t) {
  ensure(t);
  if (state.round === 1) { d.displayName = clean(raw?.displayName, 30) || undefined; d.emblem = clean(raw?.emblem, 8) || undefined; }
  else { delete d.displayName; delete d.emblem; }
  const mv = {};
  for (const slot of SLOTS) {
    const oid = raw?.moves?.[slot];
    const o = OPTION_FX[oid];
    if (o && o.slot === slot && o.round === state.round && !isLocked(t, oid)) mv[slot] = oid;
  }
  if (OPTION_FX[mv.market]?.raid) {
    let tgt = raw.moves.target;
    if (!(tgt !== id && state.teams[tgt]?.region === t.region)) tgt = defaultTarget(state, id);
    if (tgt) mv.target = tgt; else delete mv.market;
  }
  mv.dial = DIALS.includes(raw?.moves?.dial) ? raw.moves.dial : 'steady';
  const fc = raw?.moves?.forecast;
  if (fc && state.teams[fc]?.region === t.region) mv.forecast = fc;
  d.moves = mv;
}

// Fit lock, county contracts, raids. Runs before anyone's capacity is touched.
export function prePass(state, raw, validate, capabilities) {
  const ids = Object.keys(state.teams).sort();
  const vd = {};
  for (const id of ids) { ensure(state.teams[id]); vd[id] = validate(state, id, raw?.[id]); }
  const r = state.round;
  state.moveLog ||= {};
  const log = (state.moveLog[r] = []);
  for (const id of ids) {
    const d = vd[id], t = state.teams[id], mo = OPTION_FX[d.moves.market];
    d.fit = null;
    if (mo?.fit) {
      const have = capabilities(t, t.region)[mo.fit.cap];
      d.fit = { ...mo.fit, have, strength: r2(clamp(have / mo.fit.need, DK.FIT_MIN, DK.FIT_MAX)) };
    }
    if (mo?.county) { t.flags.county = r; log.push({ kind: 'county', team: id }); }
  }
  for (const id of ids) {
    const d = vd[id], t = state.teams[id];
    if (!OPTION_FX[d.moves.market]?.raid) continue;
    const tg = state.teams[d.moves.target];
    const blocked = !!tg.flags.county && r - tg.flags.county <= DK.COUNTY_SPAN;
    let taken = 0, gained = 0;
    if (!blocked) {
      taken = r2(DK.RAID_FRACTION * tg.capacity.specialty * (d.fit?.strength ?? 1));
      gained = r2(taken * DK.RAID_GAIN);
      tg.capacity.specialty = r2(tg.capacity.specialty - taken);
      t.capacity.specialty = r2(t.capacity.specialty + gained);
      tg.trust.physicians = clamp(tg.trust.physicians - DK.RAID_TRUST, 0, 100);
    }
    log.push({ kind: 'raid', from: id, to: tg.id, taken, gained, blocked });
  }
  return vd;
}

export function applyOptions(team, d, state, notes, applyEffects) {
  const r = state.round;
  const out = { results: [], strike: null, gate: 0 };
  if (r === 1) { if (d.displayName) team.name = d.displayName; if (d.emblem) team.emblem = d.emblem; }
  team.picks[r] = { ...d.moves };
  for (const slot of SLOTS) {
    const o = OPTION_FX[d.moves[slot]];
    if (!o) continue;
    out.results.push(applyEffects(team, o.fx, notes));
    if (o.chief) {
      const g = CHIEF_GROUP[team.archetype];
      team.trust[g] = clamp(team.trust[g] + o.chief.trust, 0, 100);
      team.influenceBonus[g] = (team.influenceBonus[g] || 0) + o.chief.influence;
      team.flags.chiefGroup = g;
    }
    if (o.flag) Object.assign(team.flags, o.flag);
    if (o.listen) team.listening = 2;
    if (o.pilotNext) team.flags.pilotNext = true;
    if (o.trustGate) out.gate = o.trustGate;
    if (o.strike) out.strike = { choice: o.strike, bonus: o.bonus || 0 };
  }
  return out;
}

function hit(fx, mult) { for (const m of D.MARKETS) fx.capMult[m] = (fx.capMult[m] || 1) * mult; }

// Strike vote (round 4 for every team) and the "press on" trust gate.
export function strikeCheck(state, team, opt, notes, fx) {
  const out = { strike: null, gated: false };
  if (state.round === DK.STRIKE_ROUND) {
    const meter = weightedTrust(team) + (opt.strike?.bonus || 0);
    const struck = meter < DK.STRIKE_THRESHOLD;
    if (struck) { team.disruption += DK.STRIKE_DISRUPTION; hit(fx, DK.STRIKE_CAP); notes.push('Walkout: units ran short.'); }
    else notes.push('Staff stayed at work.');
    out.strike = { choice: opt.strike?.choice || 'hold', meter: r2(meter), threshold: DK.STRIKE_THRESHOLD, struck };
  }
  if (opt.gate && weightedTrust(team) < opt.gate) { hit(fx, DK.GATE_CAP); out.gated = true; notes.push('Staff were not ready to press on.'); }
  return out;
}

export function histExtras(state, id, sk) {
  const log = state.moveLog?.[state.round] || [];
  return {
    strike: sk?.strike || null, gated: !!sk?.gated,
    raid: { out: log.filter(x => x.kind === 'raid' && x.from === id), in: log.filter(x => x.kind === 'raid' && x.to === id) },
  };
}

// Who gained the most revenue share in each region this round, and who called it.
export function scoreForecasts(state) {
  const r = state.round;
  const log = (state.moveLog[r] ||= []);
  for (const reg of Object.values(state.regions)) {
    if (reg.teams.length < 2) continue;
    let winner = null, best = -Infinity;
    for (const id of reg.teams) {
      const h = state.teams[id].history;
      const gain = h.at(-1).marketShare - (h.length > 1 ? h.at(-2).marketShare : 1 / reg.teams.length);
      if (gain > best) { best = gain; winner = id; }
    }
    for (const id of reg.teams) {
      const t = state.teams[id], pick = t.history.at(-1).decision.moves?.forecast;
      if (!pick) continue;
      const right = pick === winner;
      if (right) t.capBonus.adaptability = clamp((t.capBonus.adaptability || 0) + FORECAST_BONUS, -15, 15);
      const res = { round: r, pick, winner, right };
      (t.forecasts ||= {})[r] = res;
      t.history.at(-1).forecast = res;
      log.push({ kind: 'forecast', team: id, ...res });
    }
  }
}
