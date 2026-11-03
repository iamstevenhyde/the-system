// Host-side builders. The host computes the public payload and each team's private view
// at every publish and commit; the transport only stores them.
import { REGIONS, ARCHETYPES, ROUNDS } from '../engine/data.js';
import { EVENTS } from '../engine/cards.js';

const clone = o => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));
const onehot = i => [0, 1, 2].map(j => (j === i ? 1 : 0));

// Cut a full state down to what one team may know: itself in full, rivals in its own
// region as public stubs (archetype defaults for private fields), nothing from other regions.
export function scopeState(state, id) {
  if (!state) return null;
  const s = clone(state);
  const me = s.teams[id];
  for (const [tid, t] of Object.entries(s.teams)) {
    if (tid === id) continue;
    if (t.region !== me.region) { delete s.teams[tid]; continue; }
    const a = ARCHETYPES[t.archetype];
    t.target = { ...a.star };
    t.w = Object.fromEntries(Object.entries(a.star).map(([p, o]) => [p, onehot(o)]));
    t.transitions = {}; t.trust = { ...a.trust }; t.influenceBonus = {}; t.capBonus = {};
    t.proposal = null; t.usedProposals = []; t.listening = 0; t.mandates = 0; t.exploreStock = 0; t.cash = 0;
    t.history = t.history.map(h => ({ round: h.round, served: h.served, share: h.share, quality: h.quality, util: h.util, capacity: h.capacity,
      revenue: h.revenue, outcome: h.outcome, marketShare: h.marketShare, changes: h.changes, completed: [], capabilities: h.capabilities, disruption: 0, event: h.event }));
  }
  for (const r of Object.values(s.regions)) r.teams = r.teams.filter(t => s.teams[t]);
  s.log = [];
  return s;
}

export function eventInfo(state, region) {
  const ev = state?.regions?.[region]?.events?.[state.round];
  return ev && EVENTS[ev] ? { id: ev, title: EVENTS[ev].title, line: EVENTS[ev].line, icon: EVENTS[ev].icon } : null;
}

// roster: [{id,name,region,bot}] used before the game exists. submitted: {teamId:true}.
export function buildPublic({ status, round, state, roster = [], timer = null, submitted = {}, rankings = null }) {
  const teams = state
    ? Object.values(state.teams).map(t => ({
      id: t.id, name: t.name, region: t.region, bot: !!t.bot, submitted: !!submitted[t.id], archetype: t.archetype,
      hist: t.history.map(h => ({ round: h.round, share: h.marketShare, outcome: h.outcome, revenue: h.revenue })),
    }))
    : roster.map(t => ({ id: t.id, name: t.name, region: t.region || null, bot: !!t.bot, profile: t.bot || null, submitted: false, archetype: null, hist: [] }));
  const events = {};
  if (state && status !== 'done') for (const r of Object.keys(REGIONS)) events[r] = eventInfo(state, r);
  return { status, round, rounds: ROUNDS, timer, teams, events, reform: !!state && round >= 3, final: status === 'done' && rankings ? { rankings } : null };
}

// One private view per human team: its scoped state and the region events it may see.
export function buildViews(state, humanIds) {
  const views = {};
  for (const id of humanIds) if (state.teams[id]) views[id] = { state: scopeState(state, id), events: Object.fromEntries(Object.keys(REGIONS).map(r => [r, eventInfo(state, r)])) };
  return views;
}
