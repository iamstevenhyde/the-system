// The System v2: the card deck. Pure and deterministic, no DOM. Builds the three
// cards a team sees each round, turns picks into a decision, and writes the
// news and reveal lines. Mechanics live in moves.js and engine.js.
import * as D from './data.js';
import { EVENTS, PROPOSALS } from './cards.js';
import * as E from './engine.js';
import { registerPlanner, defaultTarget, isLocked } from './moves.js';
import { DK, OPTION_FX, CHIEF_GROUP, PERSON, SLOTS, optionsFor } from './deckdata.js';
import { DIAL, DIALS, PROFILE_WORD, REGION_PROBLEM, collisionsFor } from './deck5data.js';

const r1 = x => Math.round(x * 10) / 10;
const sum = a => a.reduce((s, v) => s + v, 0);
const HOME = { access: 'primary', excellence: 'specialty', integrated: 'chronic' };
const MLABEL = { primary: 'primary care', specialty: 'specialty care', chronic: 'chronic care' };
const cap1 = s => s[0].toUpperCase() + s.slice(1);
const GLABEL = { physicians: 'Physician', nurses: 'Nurse', admins: 'Admin', coordinators: 'Coordinator' };
const TITLES = ['Founding', 'Expansion', 'Reform shock', 'Resistance', 'Reckoning'];
const nameOf = t => t.name || t.id;
const emblemOf = t => t.emblem || '';

// ---------- plain-language helpers ----------
const FRIENDLY = {
  strategy: ['a cost-first strategy', 'an excellence strategy', 'an integrated strategy'],
  structure: ['functional units', 'divisions', 'a matrix'],
  people: ['defined roles', 'deep experts', 'cross-training'],
  process: ['standard workflows', 'clinician-led workflows', 'team workflows'],
  rewards: ['throughput pay', 'individual pay', 'team pay'],
};
const IXNAME = { turf_war: 'two bosses and clinician silos', lean_machine: 'rigid routines', star_clinic: 'expert autonomy', care_team: 'a true care team', fast_lanes: 'divisions ignoring each other', volume_vs_teams: 'pay that skips the huddle', flex_bench: 'cross-training' };
const POINT_NAME = { strategy: 'strategy', structure: 'structure', people: 'people', process: 'process', rewards: 'rewards' };

function fxLines(fx) {
  const gains = [], hurts = [];
  if (!fx) return { gains, hurts };
  const tr = Object.entries(fx.trust || {});
  if (tr.length === D.GROUPS.length && tr.every(([, v]) => v === tr[0][1])) (tr[0][1] > 0 ? gains : hurts).push(`All staff trust ${tr[0][1] > 0 ? '+' : ''}${tr[0][1]}`);
  else for (const [g, v] of tr) (v > 0 ? gains : hurts).push(`${GLABEL[g]} trust ${v > 0 ? '+' : ''}${v}`);
  for (const [k, v] of Object.entries(fx.capBonus || {})) (v > 0 ? gains : hurts).push(`${cap1(k)} ${v > 0 ? '+' : ''}${v}`);
  for (const g of Object.keys(fx.influence || {})) gains.push(`${GLABEL[g]}s gain a say`);
  for (const [m, v] of Object.entries(fx.capMult || {})) (v >= 1 ? gains : hurts).push(`${cap1(MLABEL[m])} capacity ${v >= 1 ? '+' : ''}${Math.round((v - 1) * 100)}%`);
  for (const [m, v] of Object.entries(fx.quality || {})) (v > 0 ? gains : hurts).push(`${cap1(MLABEL[m])} quality ${v > 0 ? '+' : ''}${v}`);
  if (fx.pauseOne) gains.push('One change paused');
  if (fx.disruption > 0) hurts.push(`Disruption +${fx.disruption}`);
  return { gains, hurts };
}

function fitInfo(state, t, spec) {
  const caps = E.capabilities(t, t.region);
  const have = Math.round(caps[spec.cap]);
  const strength = Math.round(Math.max(DK.FIT_MIN, Math.min(DK.FIT_MAX, have / spec.need)) * 100) / 100;
  const drags = [];
  for (const p of D.POINTS) {
    const cur = sum(t.w[p].map((w, o) => w * D.CONTRIB[p][o][spec.cap]));
    const best = Math.max(...D.CONTRIB[p].map(c => c[spec.cap]));
    const o = t.w[p].indexOf(Math.max(...t.w[p]));
    if (best - cur > 1.5) drags.push([best - cur, FRIENDLY[p][o]]);
  }
  for (const ix of D.INTERACTIONS) {
    const s = Object.entries(ix.need).reduce((a, [p, o]) => a * t.w[p][o], 1);
    if (ix.fx[spec.cap] < 0 && s > 0.4) drags.push([-ix.fx[spec.cap] * s, IXNAME[ix.id] || ix.id]);
  }
  if (t.disruption > 8) drags.push([t.disruption * 0.6, 'the change under way']);
  drags.sort((a, b) => b[0] - a[0]);
  const names = drags.slice(0, 2).map(x => x[1]);
  const why = strength >= DK.FIT_MAX
    ? `Your ${spec.cap} is ${have}. It carries this card.`
    : `Your ${spec.cap} is ${have}. ${names.length ? 'Held back by ' + names.join(' and ') + '.' : 'Staff trust and workload hold it down.'}`;
  return { cap: spec.cap, need: spec.need, have, strength, why };
}

function focusOf(m, hi) { const lo = (100 - hi) / 2; return Object.fromEntries(D.MARKETS.map(k => [k, k === m ? hi : lo])); }
const even = () => ({ primary: 34, specialty: 33, chronic: 33 });
function keepFocus(t) { return t.lastDecision ? { ...t.lastDecision.focus } : focusOf(HOME[t.archetype], 50); }
const candidates = t => ['rewards', 'process', 'structure', 'people', 'strategy'].filter(p => t.target[p] !== 2 && !t.transitions[p]);
const LOOSEN = { access: ['process', 1], excellence: ['rewards', 2], integrated: ['rewards', 1] };

function withArch(state, id, arch) {
  const s = JSON.parse(JSON.stringify(state));
  const t = s.teams[id], a = D.ARCHETYPES[arch];
  t.archetype = arch; t.target = { ...a.star };
  for (const p of D.POINTS) t.w[p] = [0, 1, 2].map(j => (j === a.star[p] ? 1 : 0));
  t.capacity = { ...a.capacity }; t.trust = { ...a.trust };
  return s;
}

// ---------- news text ----------
const CARD_LABEL = {
  r1_claim: 'Claim ground', r1_spread: 'Spread out', r1_undercut: 'Undercut', r2_build: 'Build', r2_raid: 'Raid', r2_county: 'Sign the county',
  r3_chase: 'Chase chronic', r3_hold: 'Hold specialty', r3_hedge: 'Hedge', r4_defend: 'Defend share', r4_press: 'Press on',
  r5_challenge: 'Challenge the leader', r5_protect: 'Protect base', r5_harvest: 'Take the cash',
};
const NEWS = {
  r1_claim: (n, c) => `${n} claims ${c.hl}.`, r1_spread: n => `${n} spreads across all three markets.`, r1_undercut: n => `${n} undercuts on price.`,
  r2_build: (n, c) => `${n} builds ${c.hl} capacity.`, r2_raid: (n, c) => `${n} raids ${c.target}'s specialists.`, r2_county: n => `${n} signs the county.`,
  r3_chase: n => `${n} chases chronic care.`, r3_hold: n => `${n} holds specialty.`, r3_hedge: n => `${n} hedges across markets.`,
  r4_defend: n => `${n} defends its share.`, r4_press: n => `${n} presses on.`,
  r5_challenge: n => `${n} challenges the leader.`, r5_protect: n => `${n} protects its base.`, r5_harvest: n => `${n} takes the cash.`,
};
const PLAN = {
  r1_claim: 'claim its home ground', r1_spread: 'spread across markets', r1_undercut: 'undercut on price',
  r2_build: 'build capacity', r2_county: 'sign the county', r3_chase: 'chase chronic care', r3_hold: 'hold specialty', r3_hedge: 'hedge across markets',
  r4_defend: 'defend its share', r4_press: 'press on', r5_challenge: 'challenge the leader', r5_protect: 'protect its base', r5_harvest: 'take the cash',
};
function newsLine(state, t, round) {
  const p = t.picks?.[round];
  if (!p?.market) return null;
  const f = NEWS[p.market];
  return f ? f(nameOf(t), { hl: MLABEL[HOME[t.archetype]], target: state.teams[p.target] ? nameOf(state.teams[p.target]) : 'a rival' }) : null;
}

// ---------- the cards ----------
const ARCH_LINE = {
  1: { access: 'Your clinics are everywhere and cheap to run.', excellence: 'Your specialists are known across the region.', integrated: 'Your teams already work across units.' },
  2: { access: 'Waiting rooms are full on busy days.', excellence: 'Referrals are coming in faster than you can see them.', integrated: 'Chronic patients want one team for everything.' },
};

function mk(id, label, line, o = {}) {
  const spec = OPTION_FX[id];
  const auto = fxLines(spec.fx);
  const invest = o.patch?.invest || {};
  const dials = spec.slot === 'market' ? Object.fromEntries(DIALS.map(k => [k, { cost: r1((spec.fx.cost || 0) + sum(Object.values(invest)) * DIAL[k].investMult) }])) : null;
  return {
    id, label, line, cost: r1(((spec.fx.cost || 0) + sum(Object.values(invest))) + (o.changeCost || 0)),
    ...(dials ? { dials } : {}),
    gains: [...(o.gains || []), ...auto.gains], hurts: [...(o.hurts || []), ...auto.hurts],
    ...(o.fit ? { fit: o.fit } : {}), ...(o.locked ? { locked: { reason: o.locked } } : {}),
    _patch: o.patch || {}, _approachOK: o.approachOK || null,
  };
}

function marketCard(state, id) {
  const t = state.teams[id], r = state.round, home = HOME[t.archetype], hl = MLABEL[home];
  const prevShare = D.MARKETS.slice().sort((a, b) => (t.share[b] || 0) - (t.share[a] || 0))[0];
  const fit = key => fitInfo(state, t, OPTION_FX[key].fit);
  let title, line, opts;
  if (r === 1) {
    title = 'Pick your ground'; line = ARCH_LINE[1][t.archetype];
    opts = [
      mk('r1_claim', `Claim ${hl}`, 'Put most of your effort in your home market.', { patch: { focus: focusOf(home, 55), invest: { [home]: 3 }, price: 'standard' }, gains: [`Strong pull in ${hl}`], hurts: ['Less pull elsewhere'] }),
      mk('r1_spread', 'Spread out', 'Serve all three markets evenly.', { patch: { focus: even(), invest: { primary: 0.8, specialty: 0.8, chronic: 0.8 }, price: 'standard' }, gains: ['Steady in all three'], hurts: ['No market stands out'] }),
      mk('r1_undercut', 'Undercut on price', 'Low prices, aimed at primary care.', { patch: { focus: focusOf('primary', 55), invest: { primary: 1.5 }, price: 'low' }, fit: fit('r1_undercut'), gains: ['Many patients come'], hurts: ['Lower rate per patient'] }),
    ];
  } else if (r === 2) {
    const tg = defaultTarget(state, id), tgt = tg && state.teams[tg];
    title = 'Make your move'; line = ARCH_LINE[2][t.archetype];
    const rf = fit('r2_raid');
    const est = tgt ? r1(DK.RAID_FRACTION * tgt.capacity.specialty * rf.strength * DK.RAID_GAIN) : 0;
    opts = [
      mk('r2_build', `Build ${hl} capacity`, 'Beds and staff arrive next round.', { patch: { focus: focusOf(home, 50), invest: { [home]: 4 } }, gains: ['More capacity in round 3'], hurts: ['Money goes out now'] }),
      mk('r2_raid', tgt ? `Raid ${nameOf(tgt)}'s specialists` : 'Raid a rival', 'Offer their surgeons more. Their doctors may leave.', {
        patch: { focus: keepFocus(t) }, fit: rf, locked: tgt ? null : 'No rival in your region.',
        gains: [`Take about ${est}k specialty capacity`], hurts: ['Fails if they hold a county contract'] }),
      mk('r2_county', 'Sign the county', 'Lock in local patients. Rivals cannot raid you.', { patch: { focus: keepFocus(t) }, gains: ['Patients stay loyal', 'Blocks raids on you'], hurts: ['No new capacity'] }),
    ];
  } else if (r === 3) {
    const reg = D.REGIONS[t.region];
    title = 'Answer the new rules';
    line = `Chronic care pays up to ${Math.round((reg.reform.chronic - 1) * 100)}% more as reform phases in. Specialty pays ${Math.round((1 - reg.reform.specialty) * 100)}% less.`;
    opts = [
      mk('r3_chase', 'Chase chronic care', 'Go after the chronic patients.', { patch: { focus: focusOf('chronic', 60), invest: { chronic: 4 } }, fit: fit('r3_chase'), gains: ['Pays more as reform phases in'], hurts: ['Specialty slips'] }),
      mk('r3_hold', 'Hold specialty', 'Stay with your surgeons and referrals.', { patch: { focus: focusOf('specialty', 60), invest: { specialty: 2 } }, fit: fit('r3_hold'), gains: ['Keeps specialists busy'], hurts: ['Pays less as reform phases in'] }),
      mk('r3_hedge', 'Hedge across markets', 'A little of each.', { patch: { focus: even(), invest: { primary: 1, specialty: 1, chronic: 1.5 } }, gains: ['Some of each'], hurts: ['Nothing is a priority'] }),
    ];
  } else if (r === 4) {
    title = 'Hold or push'; line = 'Staff are tired. Rivals are watching the same numbers.';
    opts = [
      mk('r4_defend', 'Defend your share', 'Protect what you have. Spend little.', { patch: { focus: focusOf(prevShare, 50), invest: {} }, gains: ['Low cost'], hurts: ['No new growth'] }),
      mk('r4_press', 'Press on', 'Push for new patients. Staff must be ready.', { patch: { focus: focusOf('chronic', 50), invest: { chronic: 3 } }, gains: ['Growth in chronic care'], hurts: ['Capacity drops 10% if staff trust is under 50'] }),
    ];
  } else {
    const rivals = state.regions[t.region].teams.filter(o => o !== id);
    const lead = rivals.map(o => state.teams[o]).sort((a, b) => (b.history.at(-1)?.marketShare || 0) - (a.history.at(-1)?.marketShare || 0))[0];
    const leadMarket = lead ? D.MARKETS.slice().sort((a, b) => lead.share[b] - lead.share[a])[0] : home;
    title = 'Last contest'; line = lead ? `${nameOf(lead)} leads your region. One more round.` : 'One more round.';
    opts = [
      mk('r5_challenge', lead ? `Challenge ${nameOf(lead)}` : 'Challenge the field', `Cut prices and go after ${MLABEL[leadMarket]}.`, { patch: { focus: focusOf(leadMarket, 60), price: 'low', invest: {} }, gains: ['Pulls patients from the leader'], hurts: ['Lower rate per patient'] }),
      mk('r5_protect', 'Protect your base', 'Hold the patients you have.', { patch: { focus: focusOf(home, 55), price: 'standard', invest: {} }, gains: ['Keeps loyal patients'], hurts: ['No push for new ones'] }),
      mk('r5_harvest', 'Take the cash', 'Raise prices. Serve who stays.', { patch: { focus: keepFocus(t), price: 'premium', invest: {} }, gains: ['Higher rate per patient'], hurts: ['Some patients leave'] }),
    ];
  }
  return { slot: 'market', id: `r${r}_market`, title, line, art: ['ground', 'move', 'reform', 'hold', 'contest'][r - 1], options: opts };
}

const MISMATCH = new Set(D.INTERACTIONS.filter(ix => ix.friction || ix.fx.coordination <= -6).map(x => x.id));
const ixStrength = (w, ix) => Object.entries(ix.need).reduce((a, [p, o]) => a * w[p][o], 1);
function fitHint(t, p, to) {
  const w2 = { ...t.w, [p]: [0, 1, 2].map(j => (j === to ? 1 : 0)) };
  const out = [];
  for (const ix of D.INTERACTIONS) {
    if (!(p in ix.need)) continue;
    const s0 = ixStrength(t.w, ix), s1 = ixStrength(w2, ix), name = IXNAME[ix.id] || ix.id, bad = MISMATCH.has(ix.id);
    if (s1 > 0.5 && s0 <= 0.5) out.push(bad ? `Would set up ${name}.` : `Would build ${name}.`);
    else if (s0 > 0.5 && s1 <= 0.5) out.push(bad ? `Would end ${name}.` : `Would lose ${name}.`);
  }
  return out.slice(0, 2).join(' ');
}
// picks.points = [{point, to}] must match the option's count exactly, else the default is used.
function choosePoints(t, n, def, picks) {
  const pp = picks?.points;
  if (!Array.isArray(pp) || pp.length !== n) return def;
  const out = {};
  for (const x of pp) {
    if (!D.POINTS.includes(x?.point) || x.point in out || !Number.isInteger(x.to) || x.to < 0 || x.to > 2 || x.to === t.target[x.point]) return def;
    out[x.point] = x.to;
  }
  return out;
}
function pointChoices(t, def) {
  return {
    defaultPoints: Object.entries(def).map(([point, to]) => ({ point, to })),
    pointChoices: D.POINTS.map(p => {
      const cur = t.target[p], to = def[p] ?? (cur === 2 ? 1 : 2);
      return { point: p, label: cap1(p), current: cur, currentLabel: D.OPTIONS[p][cur], selected: p in def, to, toLabel: D.OPTIONS[p][to], fitHint: fitHint(t, p, to),
        choices: [0, 1, 2].filter(j => j !== cur).map(j => ({ to: j, toLabel: D.OPTIONS[p][j], fitHint: fitHint(t, p, j) })) };
    }),
  };
}
function starView(t) {
  return {
    points: Object.fromEntries(D.POINTS.map(p => [p, { current: t.target[p], label: D.OPTIONS[p][t.target[p]] }])),
    mismatches: E.interactionsActive(t).filter(x => MISMATCH.has(x.id) && x.strength > 0.5).map(x => IXNAME[x.id] || x.id),
  };
}

function orgCard(state, id, picks) {
  const t = state.teams[id], r = state.round;
  const cand = candidates(t);
  const defCh = n => Object.fromEntries(cand.slice(0, n).map(p => [p, 2]));
  const eff = (n, def) => choosePoints(t, n, def, picks);
  const chLine = c => Object.entries(c).map(([p, o]) => `${POINT_NAME[p]} to "${D.OPTIONS[p][o]}"`).join(' and ');
  const cc = (c, ap) => E.changeCost(state, { changes: c, approach: ap }, id);
  const withPts = (o, def) => Object.assign(o, pointChoices(t, def));
  const none = c => (Object.keys(c).length ? null : 'Nothing left to change.');
  let title, line, opts;
  if (r === 1) {
    const [lp, lo] = LOOSEN[t.archetype];
    const def = { [lp]: lo }, c = eff(1, def);
    title = 'Shape the organization'; line = 'Your design came with the system. Leave it or adjust it.';
    opts = [
      mk('r1_keep', 'Keep what you inherited', 'No change. Staff know the routine.', { gains: ['No friction'] }),
      mk('r1_tighten', 'Tighten the design', 'Sharpen roles and routines around your strategy.', { gains: ['Clearer routines'] }),
      withPts(mk('r1_loosen', 'Loosen one rule', `Move ${chLine(c)}.`, { patch: { changes: c }, hurts: ['Staff need time to adjust'] }), def),
    ];
  } else if (r === 2) {
    title = 'Scheduling'; line = 'Divisions double-book rooms. Administrators want one schedule.';
    opts = [
      mk('r2_standardize', 'Standardize scheduling', 'One schedule for every division.', { hurts: ['Divisions lose control'] }),
      mk('r2_leave', 'Leave it', 'Divisions keep control of their rooms.', { gains: ['No friction'] }),
      mk('r2_townhall', 'Hold a town hall', 'Listen first. Staff share what they see on the floor.', { gains: ['Staff input'] }),
    ];
  } else if (r === 3) {
    title = 'Redesign'; line = 'The new rules ask for a different organization.';
    const d2 = defCh(2), d1 = defCh(1), c2 = eff(2, d2), c1 = eff(1, d1);
    opts = [
      withPts(mk('r3_redesign', 'Redesign now', none(c2) ? 'Change by order.' : `Change ${chLine(c2)} by order.`, { patch: { changes: c2, approach: 'mandate' }, approachOK: ['mandate', 'consult', 'joint'], changeCost: cc(c2, 'mandate'), locked: none(c2), gains: ['Fast'], hurts: ['Staff trust falls', 'Disruption while it lands'] }), d2),
      withPts(mk('r3_consult', 'Consult first', none(c1) ? 'Change after talking to staff.' : `Change ${chLine(c1)} after talking to staff.`, { patch: { changes: c1, approach: 'consult' }, approachOK: ['consult', 'joint', 'mandate'], changeCost: cc(c1, 'consult'), locked: none(c1), gains: ['Staff help shape it'], hurts: ['Slower'] }), d1),
      mk('r3_pilot', 'Open a pilot unit', 'A small unit tries the new way. $3M a round from round 4.', { gains: ['Main business keeps running'], hurts: ['Runs a second operation'] }),
    ];
  } else if (r === 4) {
    title = 'Pace of change'; line = 'Too many changes at once wear people down.';
    const d1 = defCh(1), c1 = eff(1, d1);
    opts = [
      mk('r4_pause', 'Pause one change', 'Give staff room to catch up.', { gains: ['Less disruption'] }),
      withPts(mk('r4_push', 'Push through', none(c1) ? 'Change by order.' : `Change ${chLine(c1)} by order.`, { patch: { changes: c1, approach: 'mandate' }, approachOK: ['mandate', 'consult', 'joint'], changeCost: cc(c1, 'mandate'), locked: none(c1), gains: ['Finishes sooner'], hurts: ['Staff trust falls'] }), d1),
    ];
  } else {
    title = 'Last chance to adjust'; line = 'Routines set now are the ones you leave behind.';
    const d1 = defCh(1), c1 = eff(1, d1);
    opts = [
      mk('r5_lock', 'Lock in what you have', 'No more changes. Make the routines stick.', { gains: ['Stability'] }),
      withPts(mk('r5_fix', 'One last fix', none(c1) ? 'One more change.' : `Change ${chLine(c1)} after talking to staff.`, { patch: { changes: c1, approach: 'consult' }, approachOK: ['consult', 'joint', 'mandate'], changeCost: cc(c1, 'consult'), locked: none(c1), gains: ['Closes a gap'], hurts: ['May not finish in time'] }), d1),
    ];
  }
  return { slot: 'org', id: `r${r}_org`, title, line, art: ['design', 'schedule', 'redesign', 'pace', 'routine'][r - 1], options: opts };
}

function lowestGroup(t) { return D.GROUPS.slice().sort((a, b) => t.trust[a] - t.trust[b])[0]; }
function traceLine(t) {
  const out = [], p1 = t.picks?.[1]?.people;
  if (p1 === 'r1_seat') out.push('You gave them a seat in round 1.');
  else if (p1 === 'r1_advisory') out.push('You offered an advisory chair in round 1.');
  else if (p1 === 'r1_keepRights') out.push('You kept decision rights in round 1.');
  const h3 = t.history[2];
  if (h3 && h3.changes && h3.approach === 'mandate') out.push('The round 3 redesign came by order.');
  const st = t.history[3]?.strike;
  if (st) out.push(st.struck ? 'The round 4 walkout left marks.' : 'The round 4 vote held.');
  return out.join(' ') || 'Nothing in the record stands out.';
}

function peopleCard(state, id) {
  const t = state.teams[id], r = state.round;
  let title, line, group, opts;
  if (r === 1) {
    group = CHIEF_GROUP[t.archetype]; const P = PERSON[group];
    title = `${P.name} asks for a seat`; line = `${P.role} wants a place on the exec team.`;
    opts = [
      mk('r1_seat', 'Give a seat', 'They join every big decision.', { gains: [`${GLABEL[group]} trust +8`, `${GLABEL[group]}s gain a say`], hurts: ['Decisions take longer'] }),
      mk('r1_advisory', 'Offer an advisory role', 'They advise. They do not vote.', { gains: [`${GLABEL[group]} trust +3`], hurts: ['No vote'] }),
      mk('r1_keepRights', 'Keep decision rights', 'Decisions stay with you.', { gains: ['Decisions stay quick'], hurts: [`${GLABEL[group]} trust -5`] }),
    ];
  } else if (r === 2 || r === 3) {
    const pre = r === 2 ? 'r2_staff_' : 'r3_council_';
    const pr = t.proposal && PROPOSALS.find(p => p.id === t.proposal.id);
    group = pr ? pr.group : (r === 2 ? 'nurses' : 'physicians');
    title = pr ? pr.title : (r === 2 ? 'Safe staffing' : 'Doctors approve protocols');
    line = pr ? pr.line : 'Staff ask for a say.';
    const mkR = (k, label, ln) => { const f = fxLines(pr?.[k]); return mk(pre + k.replace('accept', 'accept'), label, ln, { gains: f.gains, hurts: f.hurts, patch: { response: k }, changeCost: pr?.[k]?.cost || 0 }); };
    opts = [mkR('accept', 'Agree', 'Do what they ask.'), mkR('counter', 'Offer half', 'Meet them partway.'), mkR('reject', 'Say no', 'Keep things as they are.')];
    for (const o of opts) o.cost = r1(pr?.[o._patch.response]?.cost || 0);
  } else if (r === 4) {
    group = lowestGroup(t); const P = PERSON[group];
    title = 'Staff vote on a walkout'; line = `${P.name} says the floor is stretched. The vote is tonight.`;
    opts = [
      mk('r4_concede', 'Concede', 'Meet the demands. Everyone gets a raise.', { gains: ['No walkout risk'], hurts: [] }),
      mk('r4_hold', 'Hold the line', 'Keep the plan. Staff decide at the vote.', { gains: ['No cost'], hurts: ['Walkout if staff trust is under 55'] }),
      mk('r4_committee', 'Form a joint committee', 'Staff and managers write the plan together.', { gains: ['Counts toward the vote'], locked: isLocked(t, 'r4_committee') ? 'No staff seat on the exec team.' : null }),
    ];
  } else {
    group = lowestGroup(t); const P = PERSON[group];
    title = `${P.name} is leaving`; line = `${P.role} gives an exit interview. ${traceLine(t)}`;
    opts = [
      mk('r5_retain', 'Fund a retention pool', 'Pay people to stay.', { gains: [] }),
      mk('r5_thanks', 'Thank them and move on', 'A short note and a handshake.', { gains: [] }),
      mk('r5_council', 'Hand the floor to a staff council', 'Staff run the handover.', { locked: isLocked(t, 'r5_council') ? 'No staff seat on the exec team.' : null }),
    ];
  }
  return { slot: 'people', id: `r${r}_people`, title, line, art: 'person', person: { group, name: PERSON[group].name, role: PERSON[group].role }, options: opts };
}

function buildCards(state, id, picks) {
  const t = state.teams[id];
  const spendable = Math.max(0, t.cash + D.CREDIT_LINE);
  const cards = [marketCard(state, id), orgCard(state, id, picks), peopleCard(state, id)];
  for (const c of cards) for (const o of c.options) if (!o.locked && o.cost > spendable) o.locked = { reason: 'Not enough cash.' };
  return cards;
}
const strip = o => JSON.parse(JSON.stringify(o, (k, v) => (k[0] === '_' ? undefined : v)));

// ---------- brief ----------
const CALLBACKS = [
  { r: 2, from: 1, slot: 'people', id: 'r1_seat', line: 'You gave us a seat. We are watching what it changes.' },
  { r: 2, from: 1, slot: 'people', id: 'r1_advisory', line: 'An advisory chair is not a vote. We noticed.' },
  { r: 2, from: 1, slot: 'people', id: 'r1_keepRights', line: 'You kept decision rights. Some of us remember.' },
  { r: 3, from: 2, slot: 'people', id: 'r2_staff_accept', group: 'nurses', line: 'The staffing cap helped. The floors are calmer.' },
  { r: 3, from: 2, slot: 'people', id: 'r2_staff_counter', group: 'nurses', line: 'Half a cap is better than none.' },
  { r: 3, from: 2, slot: 'people', id: 'r2_staff_reject', group: 'nurses', line: 'You said no on staffing. The floors are still stretched.' },
  { r: 3, from: 2, slot: 'market', id: 'r2_county', group: 'admins', line: 'The county contract kept our patients close.' },
  { r: 4, from: 3, slot: 'people', id: 'r3_council_accept', group: 'physicians', line: 'The council vote mattered to us.' },
  { r: 4, from: 3, slot: 'people', id: 'r3_council_reject', group: 'physicians', line: 'No council vote. We are still angry.' },
  { r: 4, from: 3, slot: 'org', id: 'r3_consult', group: 'nurses', line: 'You asked us first. That counted.' },
  { r: 5, from: 4, slot: 'people', id: 'r4_concede', group: 'nurses', line: 'The raise helped. People stayed.' },
  { r: 5, from: 4, slot: 'people', id: 'r4_committee', group: 'coordinators', line: 'The committee made the plan ours.' },
];
function callbacksFor(state, t) {
  const r = state.round, out = [];
  for (const c of CALLBACKS) {
    if (c.r !== r || t.picks?.[c.from]?.[c.slot] !== c.id) continue;
    const g = c.group || t.flags?.chiefGroup || CHIEF_GROUP[t.archetype];
    out.push({ person: PERSON[g].name, line: c.line });
  }
  const h3 = t.history[2];
  if (r === 4 && h3 && h3.changes && h3.approach === 'mandate') out.push({ person: PERSON.physicians.name, line: 'You ordered the change. Nobody asked us.' });
  if (r === 5 && t.history[3]?.strike) out.push({ person: PERSON.nurses.name, line: t.history[3].strike.struck ? 'The walkout is over. The scars are not.' : 'The vote held. Thank you for that.' });
  const prevLog = state.moveLog?.[r - 1] || [];
  for (const x of prevLog) if (x.kind === 'raid' && x.to === t.id) {
    const from = state.teams[x.from];
    out.push(x.blocked ? { person: PERSON.admins.name, line: `The county contract stopped ${nameOf(from)}'s raid.` } : { person: PERSON.physicians.name, line: `Surgeons left for ${nameOf(from)}. It still stings.` });
  }
  return out;
}

export function roundDeck(state, teamId) {
  const t = state.teams[teamId];
  const r = Math.min(state.round, D.ROUNDS);
  const st = r === state.round ? state : { ...state, round: r };
  const region = st.regions[t.region];
  const evId = region.events[r];
  const reg = D.REGIONS[t.region];
  let headline;
  if (r === 1) headline = { title: 'The region opens', line: `${reg.name}: ${reg.tag}. Four systems start from the same line.`, art: 'founding' };
  else if (r === 3) headline = { title: 'Pay follows outcomes', line: 'Washington now pays for results, not visits.', art: 'reform', means: 'Chronic care pays more and specialty pays less. Patient outcomes now move your revenue, and coordination is what chronic care rewards.' };
  else if (evId) headline = { title: EVENTS[evId].title, line: EVENTS[evId].line, art: EVENTS[evId].icon, means: EVENTS[evId].means };
  else headline = { title: 'A quiet quarter', line: 'No shocks this round.', art: 'calm' };
  const rivals = [], warnings = [];
  for (const o of region.teams) {
    if (o === teamId) continue;
    const ot = st.teams[o];
    const nl = r > 1 ? newsLine(st, ot, r - 1) : null;
    const lp = ot.picks?.[r - 1], hh = ot.history;
    const lastCard = lp?.market ? CARD_LABEL[lp.market] + (lp.dial === 'all' ? ', all in' : lp.dial === 'light' ? ', light' : '') : null;
    const shareMove = hh.length ? Math.round((hh.at(-1).marketShare - (hh.length > 1 ? hh.at(-2).marketShare : 1 / region.teams.length)) * 100) : null;
    rivals.push({ teamId: o, name: nameOf(ot), emblem: emblemOf(ot), line: nl, lastCard, shareMove, profileWord: ot.bot ? PROFILE_WORD[ot.bot] || null : null });
    const tg = ot.telegraph;
    if (tg && tg.round === r && tg.market) {
      let line = PLAN[tg.market] ? `${nameOf(ot)} plans to ${PLAN[tg.market]}${tg.dial === 'all' ? ', all in' : ''}.` : null;
      if (tg.market === 'r2_raid') line = tg.target === teamId ? `${nameOf(ot)} plans to raid your specialists.` : `${nameOf(ot)} plans to raid ${nameOf(st.teams[tg.target] || { id: 'a rival' })}.`;
      if (line) warnings.push({ teamId: o, name: nameOf(ot), line });
    }
  }
  const last = t.history.at(-1);
  const meters = {
    cash: Math.round(t.cash * 100) / 100,
    outcomes: last ? last.outcome : null,
    trust: Math.round(E.weightedTrust(t) * 10) / 10,
    share: last ? last.marketShare : null,
    strike: r === DK.STRIKE_ROUND ? { meter: Math.round(E.weightedTrust(t) * 10) / 10, threshold: DK.STRIKE_THRESHOLD } : null,
  };
  return strip({
    round: r, title: TITLES[r - 1],
    brief: { star: starView(t), region: { id: t.region, name: reg.name, tag: reg.tag, problem: REGION_PROBLEM[t.region] }, headline, rivals, warnings, callbacks: callbacksFor(st, t), meters },
    budget: { cash: meters.cash, credit: D.CREDIT_LINE, spendable: Math.max(0, Math.round((t.cash + D.CREDIT_LINE) * 100) / 100) },
    cards: buildCards(st, teamId),
  });
}

// ---------- picks to decision ----------
function applyDial(d, dial) {
  const k = DIAL[dial] || DIAL.steady;
  const f = Object.fromEntries(D.MARKETS.map(m => [m, Math.max(0, d.focus[m] + k.focusBlend * (d.focus[m] - 100 / 3))]));
  const tot = sum(Object.values(f)) || 1;
  d.focus = Object.fromEntries(D.MARKETS.map(m => [m, (f[m] / tot) * 100]));
  d.invest = Object.fromEntries(D.MARKETS.map(m => [m, (d.invest[m] || 0) * k.investMult]));
}

function resolvePick(card, wanted) {
  const ok = card.options.filter(o => !o.locked);
  return (ok.find(o => o.id === wanted) || ok[0] || card.options.slice().sort((a, b) => a.cost - b.cost)[0]).id;
}

export function picksToDecision(state, teamId, picks = {}) {
  const t = state.teams[teamId], r = state.round;
  let st = state, arch = null;
  if (r === 1 && D.ARCHETYPES[picks.archetype]) { arch = picks.archetype; st = withArch(state, teamId, arch); }
  const cards = buildCards(st, teamId, picks);
  const d = { ...E.defaultDecision(st, teamId) };
  const moves = {};
  for (const c of cards) {
    const id = resolvePick(c, picks[c.slot]);
    const o = c.options.find(x => x.id === id);
    moves[c.slot] = id;
    const p = o._patch;
    if (p.focus) d.focus = p.focus;
    if (p.invest) d.invest = { primary: 0, specialty: 0, chronic: 0, ...p.invest };
    if (p.price) d.price = p.price;
    if (p.changes) d.changes = p.changes;
    if (p.approach) d.approach = o._approachOK && o._approachOK.includes(picks.approach) ? picks.approach : p.approach;
    if (p.response) d.response = p.response;
  }
  if (OPTION_FX[moves.market]?.raid) moves.target = picks.target && picks.target !== teamId && state.teams[picks.target]?.region === t.region ? picks.target : defaultTarget(state, teamId);
  const dial = DIALS.includes(picks.dial) ? picks.dial : 'steady';
  if (dial !== 'steady') applyDial(d, dial);
  moves.dial = dial;
  if (picks.forecast && state.teams[picks.forecast]?.region === t.region) moves.forecast = picks.forecast;
  d.moves = moves;
  d.archetype = arch || t.archetype;
  d.pilot = !!t.pilot || !!t.flags?.pilotNext;
  if (r === 1) { d.displayName = picks.displayName; d.emblem = picks.emblem; }
  d.missing = false;
  return d;
}

// ---------- news and reveal ----------
export function roundNews(prev, next) {
  const r = prev.round;
  const log = next.moveLog?.[r] || [];
  const regions = {};
  for (const [rid, reg] of Object.entries(next.regions)) {
    const lines = [];
    for (const id of reg.teams) {
      const t = next.teams[id];
      const nl = newsLine(next, t, r);
      if (nl) lines.push({ teamId: id, name: nameOf(t), emblem: emblemOf(t), line: nl, kind: t.picks[r].market.split('_')[1] });
    }
    for (const x of log) {
      if (!reg.teams.includes(x.from || x.team)) continue;
      if (x.kind === 'raid') {
        const f = next.teams[x.from], tg = next.teams[x.to];
        lines.push({ teamId: x.from, name: nameOf(f), emblem: emblemOf(f), kind: 'raid', line: x.blocked ? `${nameOf(f)} tried to raid ${nameOf(tg)}. The county contract held.` : `${nameOf(f)} took ${r1(x.taken)}k specialty capacity from ${nameOf(tg)}.` });
      }
    }
    regions[rid] = lines;
  }
  const showdowns = [];
  if (r === D.ROUNDS) {
    for (const [rid, reg] of Object.entries(next.regions)) for (const id of reg.teams) if (next.teams[id].picks[r]?.market === 'r5_challenge') {
      const lead = reg.teams.filter(o => o !== id).sort((a, b) => next.teams[b].history.at(-1).marketShare - next.teams[a].history.at(-1).marketShare)[0];
      if (lead) showdowns.push({ region: rid, challenger: id, leader: lead });
    }
  }
  const fcs = log.filter(x => x.kind === 'forecast').map(x => { const t = next.teams[x.team]; return { teamId: x.team, name: nameOf(t), emblem: emblemOf(t), region: t.region, pick: x.pick, winner: x.winner, winnerName: nameOf(next.teams[x.winner]), right: x.right }; });
  const out = { regions, showdowns, forecast: { made: fcs.length, called: fcs.filter(x => x.right), all: fcs } };
  if (r === DK.STRIKE_ROUND) out.strike = { teams: Object.values(next.teams).map(t => { const s = t.history.at(-1).strike; return { teamId: t.id, name: nameOf(t), emblem: emblemOf(t), region: t.region, struck: !!s?.struck, meter: s?.meter ?? null, choice: s?.choice ?? 'hold' }; }) };
  return out;
}

export function revealFor(prev, next, teamId) {
  const me = next.teams[teamId], pm = prev.teams[teamId];
  const h = me.history.at(-1), r = prev.round;
  const ids = next.regions[me.region].teams;
  const tug = {};
  for (const m of D.MARKETS) tug[m] = ids.map(id => ({ teamId: id, name: nameOf(next.teams[id]), emblem: emblemOf(next.teams[id]), shareBefore: prev.teams[id].share[m] || 0, shareAfter: next.teams[id].share[m] || 0, mine: id === teamId }));
  // headlines
  const fitd = h.decision.fit;
  const raidOut = h.raid.out[0], raidIn = h.raid.in.find(x => !x.blocked), blockedIn = h.raid.in.find(x => x.blocked);
  const mk0 = me.picks?.[r]?.market;
  let mine;
  if (raidOut) mine = raidOut.blocked ? `Your raid on ${nameOf(next.teams[raidOut.to])} failed. They had signed the county.` : `You took ${r1(raidOut.taken)}k specialty capacity from ${nameOf(next.teams[raidOut.to])}.`;
  else if (raidIn) mine = `${nameOf(next.teams[raidIn.from])} raided your specialists and took ${r1(raidIn.taken)}k of capacity.`;
  else if (blockedIn) mine = `Your county contract stopped ${nameOf(next.teams[blockedIn.from])}'s raid.`;
  else if (h.strike?.struck) mine = 'Staff walked out. Capacity fell 10% this round.';
  else if (fitd && fitd.strength < 1) mine = `Your ${MLABEL[fitd.market]} push ran at ${Math.round(fitd.strength * 100)}%. ${cap1(fitd.cap)} held it back.`;
  else if (mk0 === 'r2_county') mine = 'You signed the county. Your patients stayed.';
  else {
    const fm = h.decision.focus, m = D.MARKETS.slice().sort((a, b) => fm[b] - fm[a])[0];
    const foe = ids.filter(i => i !== teamId).sort((a, b) => (next.teams[b].share[m] || 0) - (next.teams[a].share[m] || 0))[0];
    mine = foe ? `${cap1(MLABEL[m])} is a fight: you ${Math.round((me.share[m] || 0) * 100)}%, ${nameOf(next.teams[foe])} ${Math.round((next.teams[foe].share[m] || 0) * 100)}%.`
      : `${cap1(MLABEL[m])}: you hold ${Math.round((me.share[m] || 0) * 100)}%.`;
  }
  let rival = 'No rival moved the market.', rivalT = null, best = 0;
  if (raidIn) { rivalT = next.teams[raidIn.from]; rival = `${nameOf(rivalT)} raided your specialists.`; best = Infinity; }
  for (const id of ids) {
    if (id === teamId || best === Infinity) continue;
    for (const m of D.MARKETS) {
      const myDrop = (pm.share[m] || 0) - (me.share[m] || 0), gain = (next.teams[id].share[m] || 0) - (prev.teams[id].share[m] || 0);
      if (myDrop > 0 && gain > 0 && gain > best) {
        best = gain; rivalT = next.teams[id];
        const how = { r2_county: 'locked patients with a county contract', r1_undercut: 'undercut you on price', r5_challenge: 'challenged you on price' }[rivalT.picks?.[r]?.market];
        const pts = Math.max(1, Math.round(Math.min(gain, myDrop) * 100));
        rival = how ? `${nameOf(rivalT)} ${how} and took ${pts} point${pts === 1 ? "" : "s"} of ${MLABEL[m]}.` : `${nameOf(rivalT)} took ${pts} point${pts === 1 ? "" : "s"} of ${MLABEL[m]} from you.`;
      }
    }
  }
  if (!rivalT) { const o = ids.filter(i => i !== teamId).sort((a, b) => next.teams[b].history.at(-1).operating - next.teams[a].history.at(-1).operating)[0]; if (o) { rivalT = next.teams[o]; rival = newsLine(next, rivalT, r) || rival; } }
  // causes
  const dc = h.cash - h.startCash;
  const cash = `Cash ${dc >= 0 ? 'rose' : 'fell'} $${r1(Math.abs(dc))}M. Revenue $${r1(h.revenue)}M, costs $${r1(h.revenue - h.operating)}M, spending $${r1(h.investment)}M.`;
  const q = Object.entries(h.quality).sort((a, b) => a[1] - b[1])[0];
  const crowd = Object.entries(h.util).some(([, u]) => u > 0.9) ? ' Crowded units pulled quality down.' : '';
  const outcomes = `Outcomes ${r1(h.outcome)}. ${cap1(MLABEL[q[0]])} scored lowest at ${r1(q[1])}.${crowd}`;
  const tr = D.GROUPS.map(g => [g, me.trust[g] - pm.trust[g]]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0];
  const trust = `${GLABEL[tr[0]]} trust ${tr[1] >= 0 ? 'rose' : 'fell'} ${Math.round(Math.abs(tr[1]))} points, the biggest move.`;
  let share;
  if (fitd && fitd.strength < 1) {
    const dm = (me.share[fitd.market] || 0) - (pm.share[fitd.market] || 0);
    share = `${cap1(fitd.market)} share ${Math.abs(dm) < 0.005 ? 'flat' : dm > 0 ? 'rose' : 'fell'}: ${fitd.cap} ${fitd.have} capped the card.`;
  } else {
    const mv = D.MARKETS.map(m => [m, (me.share[m] || 0) - (pm.share[m] || 0)]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0];
    share = Math.abs(mv[1]) < 0.005 ? 'Share held.' : `${cap1(mv[0])} share ${mv[1] > 0 ? 'rose' : 'fell'} ${Math.max(1, Math.round(Math.abs(mv[1]) * 100))} points.`;
  }
  const fx0 = me.forecasts?.[r];
  const forecast = fx0 ? { pick: fx0.pick, pickName: nameOf(next.teams[fx0.pick]), winner: fx0.winner, winnerName: nameOf(next.teams[fx0.winner]), right: fx0.right, line: fx0.right ? `You called it: ${nameOf(next.teams[fx0.winner])} gained the most share.` : `You said ${nameOf(next.teams[fx0.pick])}. ${nameOf(next.teams[fx0.winner])} gained the most share.` } : null;
  return { tug, forecast, headlines: [mine, rival], rival: rivalT ? { teamId: rivalT.id, name: nameOf(rivalT), emblem: emblemOf(rivalT) } : null, causes: { cash, outcomes, trust, share } };
}

// ---------- bots ----------
const PLANS = {
  defender: { market: ['r1_claim', 'r2_county', 'r3_hold', 'r4_defend', 'r5_protect'], org: ['r1_keep', 'r2_leave', 'r3_consult', 'r4_pause', 'r5_lock'], people: ['r1_keepRights', 'r2_staff_accept', 'r3_council_counter', 'r4_concede', 'r5_thanks'] },
  prospector: { market: ['r1_claim', 'r2_raid', 'r3_hold', 'r4_press', 'r5_challenge'], org: ['r1_tighten', 'r2_leave', 'r3_pilot', 'r4_pause', 'r5_lock'], people: ['r1_keepRights', 'r2_staff_reject', 'r3_council_reject', 'r4_hold', 'r5_thanks'], approach: 'mandate' },
  analyzer: { market: ['r1_spread', 'r2_build', 'r3_chase', 'r4_defend', 'r5_protect'], org: ['r1_tighten', 'r2_standardize', 'r3_consult', 'r4_push', 'r5_fix'], people: ['r1_advisory', 'r2_staff_accept', 'r3_council_accept', 'r4_concede', 'r5_retain'], approach: 'consult' },
  adaptive: { market: ['r1_spread', 'r2_build', 'r3_chase', 'r4_press', 'r5_protect'], org: ['r1_keep', 'r2_townhall', 'r3_redesign', 'r4_push', 'r5_lock'], people: ['r1_seat', 'r2_staff_accept', 'r3_council_accept', 'r4_committee', 'r5_council'], approach: 'joint' },
};
const DIAL_PLAN = { defender: ['steady', 'steady', 'light', 'light', 'light'], prospector: ['steady', 'all', 'all', 'all', 'all'], analyzer: ['steady', 'steady', 'steady', 'steady', 'steady'], adaptive: ['steady', 'steady', 'all', 'steady', 'steady'] };
const PREF = { defender: 'access', prospector: 'excellence', analyzer: 'integrated', adaptive: 'integrated' };

export function botPicks(state, teamId, profile, seed = 1, fresh = false) {
  const t = state.teams[teamId], r = state.round;
  if (!fresh && t.telegraph && t.telegraph.round === r) { const { round, ...p } = t.telegraph; return p; }
  const rand = E.rng((seed * 7919 + r * 104729 + teamId.length * 31 + teamId.charCodeAt(teamId.length - 1)) >>> 0);
  const picks = {};
  let st = state;
  if (r === 1) {
    picks.archetype = PREF[profile] || ['access', 'excellence', 'integrated'][Math.floor(rand() * 3)];
    st = withArch(state, teamId, picks.archetype);
  }
  const cards = buildCards(st, teamId);
  const plan = PLANS[profile];
  for (const c of cards) {
    const open = c.options.filter(o => !o.locked);
    const want = plan ? plan[c.slot][r - 1] : open[Math.floor(rand() * open.length)]?.id;
    picks[c.slot] = resolvePick(c, want);
  }
  picks.dial = profile === 'reactor' || !DIAL_PLAN[profile] ? DIALS[Math.floor(rand() * 3)] : DIAL_PLAN[profile][r - 1];
  picks.approach = plan?.approach || 'mandate';
  if (OPTION_FX[picks.market]?.raid) picks.target = defaultTarget(state, teamId);
  return picks;
}

registerPlanner((state, id) => ({ round: state.round, ...botPicks(state, id, state.teams[id].bot, state.seed, true) }));
export { optionsFor, collisionsFor };
