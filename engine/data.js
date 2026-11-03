// The System: game data and tunables. Every number the engine uses lives here
// so balance passes only edit this file. Units: patients in thousands (k),
// money in $M per round.

export const ROUNDS = 5;
export const MARKETS = ['primary', 'specialty', 'chronic'];
export const CAPS = ['efficiency', 'expertise', 'coordination', 'responsiveness', 'scalability', 'adaptability'];
export const POINTS = ['strategy', 'structure', 'people', 'process', 'rewards'];
export const GROUPS = ['physicians', 'nurses', 'admins', 'coordinators'];

// Option 0/1/2 on every star point. Short plain labels for students.
export const OPTIONS = {
  strategy:  ['Low cost + access', 'Clinical excellence', 'Integrated outcomes'],
  structure: ['Functional', 'Divisional', 'Matrix'],
  people:    ['Defined roles', 'Deep experts', 'Cross-trained'],
  process:   ['Standard workflows', 'Clinician-led', 'Team workflows'],
  rewards:   ['Throughput + cost', 'Individual excellence', 'Team outcomes'],
};

// Main contribution of each choice to each capability (0-100 scale points).
// Each row sums to about the same total so no single choice is free power.
const C = (e, x, c, r, s, a) => ({ efficiency: e, expertise: x, coordination: c, responsiveness: r, scalability: s, adaptability: a });
export const CONTRIB = {
  strategy:  [C(8, 0, 0, 4, 6, 0), C(0, 10, 0, 2, 0, 2), C(0, 2, 8, 0, 0, 6)],
  structure: [C(10, 0, 0, -2, 8, -2), C(-2, 4, -2, 10, 2, 4), C(-4, 2, 12, 2, -2, 6)],
  people:    [C(8, -2, 0, 0, 8, -2), C(-2, 14, 0, 2, -4, 2), C(0, 2, 6, 4, 0, 10)],
  process:   [C(12, 0, 2, -4, 8, -4), C(-2, 10, -4, 6, -2, 4), C(0, 2, 12, 2, 0, 4)],
  rewards:   [C(10, -2, -2, 2, 6, -2), C(-2, 10, -4, 4, 2, 2), C(0, 2, 10, 0, 0, 4)],
};
export const CAP_BASE = 30;

// Interaction effects. `w` is a product of effective weights, so a half-built
// change gives a fraction of the effect. Documented in the rules page.
export const INTERACTIONS = [
  { id: 'lean_machine', need: { structure: 0, process: 0 }, fx: C(12, 0, 0, -4, 4, -4), note: 'Functional + standard workflows run lean but rigid.' },
  { id: 'care_team', need: { structure: 2, process: 2, rewards: 2 }, fx: C(0, 0, 18, 2, 0, 6), note: 'Matrix + team workflows + team rewards: real coordination.' },
  { id: 'turf_war', need: { structure: 2, process: 1, rewards: 1 }, fx: C(-4, 0, -18, -2, 0, -4), friction: 10, note: 'Matrix with clinician silos and individual pay: two bosses, nobody coordinates.' },
  { id: 'star_clinic', need: { people: 1, process: 1 }, fx: C(-4, 14, -4, 2, -4, 0), labor: { specialty: 0.12, primary: 0.04, chronic: 0.04 }, note: 'Experts with autonomy: top specialty care, top salaries.' },
  { id: 'flex_bench', need: { people: 2 }, fx: C(0, 0, 2, 4, 2, 6), training: 1.0, note: 'Cross-training buys flexibility but costs training money each round.' },
  { id: 'fast_lanes', need: { structure: 1, rewards: 1 }, fx: C(-2, 2, -6, 10, 0, 0), note: 'Divisions chasing individual targets move fast and ignore each other.' },
  { id: 'volume_vs_teams', need: { rewards: 0, process: 2 }, fx: C(2, 0, -8, 0, 0, 0), friction: 6, note: 'Team workflows paid for throughput: people skip the huddle.' },
];

// How strongly each market cares about each capability (patients' view).
export const MARKET_WEIGHTS = {
  primary:   C(0.34, 0.06, 0.08, 0.30, 0.22, 0.00),
  specialty: C(0.06, 0.56, 0.08, 0.16, 0.08, 0.06),
  chronic:   C(0.08, 0.14, 0.50, 0.10, 0.04, 0.14),
};
// Which capabilities drive clinical quality in each market.
export const QUALITY_WEIGHTS = {
  primary:   C(0.45, 0.20, 0.10, 0.15, 0.10, 0.00),
  specialty: C(0.05, 0.65, 0.15, 0.10, 0.00, 0.05),
  chronic:   C(0.05, 0.20, 0.5, 0.10, 0.00, 0.10),
};

export const RATES = { primary: 0.325, specialty: 2.20, chronic: 0.52 };           // $M per k patients
export const VAR_COST = { primary: 0.56, specialty: 0.322, chronic: 0.55 };       // share of base rate
export const FIXED_PER_K = { primary: 0.045, specialty: 0.22, chronic: 0.12 };   // $M per k capacity per round
export const BUILD_K_PER_M = { primary: 7.0, specialty: 1.0, chronic: 2.6 };     // k capacity per $M invested
export const DEMAND_PER_TEAM = { primary: 100, specialty: 15, chronic: 30 };     // k patients per round, per seat in region

export const PRICE = {
  low:     { attract: 0.30, rate: 0.90 },
  standard:{ attract: 0.00, rate: 1.00 },
  premium: { attract: -0.30, rate: 1.11 },
};
export const LOGIT_K = 4.5;
export const LOYALTY = 0.9;           // attractiveness bonus per unit of last-round share
export const FOCUS_ATTRACT = 0.9;     // bonus at 100% focus on one market
export const OUTSIDE_ATTRACT = { primary: 0.55, specialty: 0.55, chronic: 0.50 };

export const REGIONS = {
  mountain: {
    name: 'Mountain West', tag: 'The Distance Problem', color: '#4f7a6a',
    demand: { primary: 0.90, specialty: 0.75, chronic: 1.30 },
    weightShift: C(0, 0, 0, 0.12, -0.06, 0),   // access matters more, scale less
    labor: 1.05, fixed: 0.98, growth: 0.00,
    staffing: 0.85,                              // fraction of hires that land
    reform: { primary: 0.96, specialty: 0.92, chronic: 1.40 },
    events: ['clinic_closure', 'roads_out', 'nurse_shortage'],
  },
  metro: {
    name: 'Metro Corridor', tag: 'The Talent Problem', color: '#5a5f8f',
    demand: { primary: 0.95, specialty: 1.40, chronic: 0.90 },
    weightShift: C(0, 0.08, 0, 0, 0, -0.04),
    labor: 1.03, fixed: 0.80, growth: 0.00,
    staffing: 0.95,
    reform: { primary: 0.94, specialty: 0.84, chronic: 1.40 },
    events: ['specialist_raid', 'insurer_merger', 'autonomy_dispute'],
  },
  sunbelt: {
    name: 'Sunbelt Growth', tag: 'The Scaling Problem', color: '#b0793f',
    demand: { primary: 0.95, specialty: 0.90, chronic: 0.85 },
    weightShift: C(0, 0, 0, 0, 0.10, 0),
    labor: 0.98, fixed: 1.12, growth: 0.06,     // demand grows 6% per round
    staffing: 0.90,
    reform: { primary: 0.93, specialty: 0.90, chronic: 1.40 },
    events: ['population_surge', 'construction_delay', 'hiring_crunch'],
  },
  lakes: {
    name: 'Great Lakes', tag: 'The Legacy Problem', color: '#7a5a6b',
    demand: { primary: 0.95, specialty: 0.95, chronic: 1.15 },
    weightShift: C(0, 0, 0.06, 0, 0, -0.04),
    labor: 1.06, fixed: 1.16, growth: -0.01,
    staffing: 1.00,
    reform: { primary: 0.93, specialty: 0.90, chronic: 1.40 },
    events: ['chronic_funding', 'labor_conflict', 'aging_plant'],
  },
};
export const REGION_IDS = Object.keys(REGIONS);

// Value-based reform from round 3: quality now moves revenue.
export const REFORM_ROUND = 3;
// Payment reform phases in (as CMS value-based programs did): share of the full shift in force each round.
export const REFORM_RAMP = { 3: 0.5, 4: 0.8, 5: 1.0 };
export const REFORM_QUALITY_SLOPE = 0.009; // revenue multiplier per quality point away from 60

// Starting organizations. Capacity in k patients.
export const ARCHETYPES = {
  access: {
    name: 'Access Network', star: { strategy: 0, structure: 0, people: 0, process: 0, rewards: 0 },
    capacity: { primary: 120, specialty: 9, chronic: 22 },
    trust: { physicians: 50, nurses: 60, admins: 65, coordinators: 50 },
  },
  excellence: {
    name: 'Center of Excellence', star: { strategy: 1, structure: 1, people: 1, process: 1, rewards: 1 },
    capacity: { primary: 70, specialty: 27, chronic: 22 },
    trust: { physicians: 68, nurses: 60, admins: 50, coordinators: 45 },
  },
  integrated: {
    name: 'Integrated Network', star: { strategy: 2, structure: 2, people: 2, process: 2, rewards: 2 },
    capacity: { primary: 85, specialty: 12, chronic: 22 },
    trust: { physicians: 50, nurses: 60, admins: 50, coordinators: 65 },
  },
};
export const START_CASH = 30;
export const CREDIT_LINE = 10;      // may overdraw this far; interest on negative cash
export const DEBT_RATE = 0.12;

// Change management.
export const APPROACHES = {
  mandate: { speed: 1.20, trustHit: 10.5, cost: 0.0, knowledge: 0, authority: 0 },
  consult: { speed: 0.48, trustHit: 2, cost: 1.5, knowledge: 1, authority: 0 },
  joint:   { speed: 0.50, trustHit: 3, cost: 3.0, knowledge: 1, authority: 1 },
};
export const CHANGE_COST = 1.5;        // $M per star point changed
export const MAX_CHANGES = 2;          // per round
export const DISRUPTION_PER_CHANGE = 12;
// Which groups feel threatened by moving TO an option, and how much (0-1).
export const THREAT = {
  strategy:  [{ physicians: 0.5 }, { admins: 0.3, nurses: 0.2 }, { physicians: 0.3 }],
  structure: [{ physicians: 0.4, coordinators: 0.3 }, { admins: 0.8 }, { admins: 0.4, physicians: 0.5 }],
  people:    [{ physicians: 0.6, nurses: 0.4 }, { nurses: 0.5, coordinators: 0.5 }, { physicians: 0.6, nurses: 0.5 }],
  process:   [{ physicians: 0.9, nurses: 0.3 }, { admins: 0.6, coordinators: 0.5 }, { physicians: 0.5 }],
  rewards:   [{ physicians: 0.8, nurses: 0.3 }, { nurses: 0.5, coordinators: 0.6 }, { physicians: 0.9 }],
};
// Influence of each group given the structure in force (base weights).
export const INFLUENCE = {
  physicians:   { base: 0.30, people: [0, 0.15, 0], process: [0, 0.15, 0] },
  nurses:       { base: 0.25, people: [0, 0, 0.05], process: [0, 0, 0.05] },
  admins:       { base: 0.25, structure: [0.15, -0.05, 0], process: [0.10, 0, 0] },
  coordinators: { base: 0.15, structure: [0, 0, 0.10], process: [0, 0, 0.10] },
};
// Low trust drags on the capability each group carries.
export const TRUST_CAP = { physicians: 'expertise', nurses: 'responsiveness', admins: 'efficiency', coordinators: 'coordination' };

// Exploration and pilots.
export const EXPLORE_RETURN = 0.6;    // adaptability points per $M on success
export const PILOT_ROUND = 4;
export const PILOT_COST = 3.6;
export const PILOT_CHRONIC_CAP = 0.20; // extra chronic capacity share
export const PILOT_COORD = 16;         // coordination bonus inside the pilot unit (chronic only)

// Scoring.
export const SCORE_WEIGHTS = { financial: 0.40, outcomes: 0.35, resilience: 0.25 };
export const QUALITY_FLOOR = 44;      // below this, total score is capped
export const QUALITY_CAP_SCORE = 45;
