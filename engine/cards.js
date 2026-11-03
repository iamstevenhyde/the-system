// Regional events and workforce proposals. Text is short on purpose: one title,
// one plain sentence. Every effect is a real engine variable.

// Event effects:
//  demand: market multipliers this round
//  labor: labor cost multiplier this round
//  capLoss: share of capacity lost this round in each market, cut by `shield`
//  shield: capability that softens capLoss ({cap, at}: full shield at that level)
//  fixed: fixed cost multiplier; trust: group deltas; rate: reimbursement multipliers
export const EVENTS = {
  clinic_closure: { title: 'County clinic closes', line: 'A rival rural clinic shuts. Its patients need a new home.', icon: 'clinic',
    demand: { primary: 1.12, chronic: 1.08 }, warn: 'A small county clinic is struggling.' },
  roads_out: { title: 'Pass closed by snow', line: 'Patients cannot reach the central hospital for weeks.', icon: 'snow',
    capLoss: { primary: 0.12, specialty: 0.15, chronic: 0.10 }, shield: { cap: 'responsiveness', at: 70 }, warn: 'Early storms in the forecast.' },
  nurse_shortage: { title: 'Nurse shortage', line: 'Travel nurses cost double. Some units run short.', icon: 'nurse',
    labor: 1.10, capLoss: { primary: 0.08, specialty: 0.06, chronic: 0.10 }, shield: { cap: 'adaptability', at: 70 }, trust: { nurses: -4 }, warn: 'Nursing schools report low enrollment.' },
  specialist_raid: { title: 'Rival raids specialists', line: 'A university system offers your surgeons 30% more.', icon: 'raid',
    capLoss: { specialty: 0.14 }, shield: { cap: 'coordination', at: 75 }, labor: 1.04, trust: { physicians: -4 }, warn: 'Recruiters are calling your surgeons.' },
  insurer_merger: { title: 'Insurers merge', line: 'Two big insurers combine and push rates down.', icon: 'merge',
    rate: { primary: 0.95, specialty: 0.93, chronic: 0.97 }, warn: 'Two insurers are in merger talks.' },
  autonomy_dispute: { title: 'Doctors push back', line: 'Physicians publicly reject new protocols across the city.', icon: 'gavel',
    trust: { physicians: -6 }, capLoss: { specialty: 0.05 }, shield: { cap: 'expertise', at: 70 }, warn: 'Physician groups are organizing.' },
  population_surge: { title: 'Population surge', line: 'Three new suburbs open. Demand jumps.', icon: 'houses',
    demand: { primary: 1.15, specialty: 1.08, chronic: 1.10 }, warn: 'Builders report record permits.' },
  construction_delay: { title: 'Construction delays', line: 'Permits stall. New beds open late.', icon: 'crane',
    buildDelay: 0.5, warn: 'The county permit office is backed up.' },
  hiring_crunch: { title: 'Hiring crunch', line: 'Every system is hiring. New staff are green.', icon: 'badge',
    labor: 1.06, qualityHit: 5, shield: { cap: 'scalability', at: 70 }, warn: 'Wages are rising across the metro.' },
  chronic_funding: { title: 'State chronic-care grant', line: 'New state money for diabetes and heart programs.', icon: 'grant',
    rate: { chronic: 1.08 }, demand: { chronic: 1.06 }, warn: 'Legislators are drafting a chronic-care bill.' },
  labor_conflict: { title: 'Strike vote', line: 'Staff vote on a strike over workload.', icon: 'strike',
    strike: 40, warn: 'Union organizers are holding meetings.' },
  aging_plant: { title: 'Boilers fail', line: 'The old main building needs urgent repairs.', icon: 'boiler',
    fixed: 1.10, warn: 'Facilities flagged the old boilers.' },
};

// Proposals. trigger(team, ctx) returns a priority score (0 = not eligible).
// genuine(team, ctx) says whether the concern reflects a real operating problem.
// Effects keys: trust, cost, capMult (this round), capBonus (permanent, small),
// quality (this round), progress (active change), influence, rate.
export const PROPOSALS = [
  {
    id: 'safe_staffing', group: 'nurses', title: 'Safe staffing',
    line: 'We want a cap on patients per nurse. Floors are stretched.',
    trigger: (t, x) => 1 + 3 * Math.max(0, x.util - 0.82) * 10 + (60 - t.trust.nurses) / 20,
    genuine: (t, x) => x.util > 0.9,
    accept: { trust: { nurses: 10 }, capMult: { primary: 0.94, chronic: 0.94 }, quality: { primary: 4, chronic: 4 }, cost: 0.8 },
    counter: { trust: { nurses: 3 }, capMult: { primary: 0.97, chronic: 0.97 }, quality: { primary: 4, chronic: 4 }, cost: 0.4 },
    reject: { trust: { nurses: -9 } },
    rejectIfGenuine: { quality: { primary: -6, chronic: -6 }, trust: { nurses: -4 } },
  },
  {
    id: 'keep_bonus', group: 'physicians', title: 'Keep our bonus',
    line: 'Keep individual bonuses until the new pay plan is proven.',
    trigger: (t, x) => (x.changing('rewards') ? 4 : 0) + (x.changing('process') ? 1 : 0),
    genuine: (t, x) => x.cap.coordination < 45,
    accept: { trust: { physicians: 10 }, progress: { rewards: -0.35 } },
    counter: { trust: { physicians: 4 }, progress: { rewards: -0.15 }, cost: 0.6 },
    reject: { trust: { physicians: -10 }, capMult: { specialty: 0.94 } },
  },
  {
    id: 'discharge_authority', group: 'coordinators', title: 'Let us run discharges',
    line: 'Give care coordinators authority over patient handoffs.',
    trigger: (t, x) => 1 + (x.market.chronic > 0.3 ? 2 : 0) + (x.w.structure[2] > 0.5 ? 1 : 0),
    genuine: (t, x) => x.w.process[2] > 0.4 || x.w.structure[2] > 0.4,
    accept: { trust: { coordinators: 10, admins: -4 }, capBonus: { coordination: 5 }, influence: { coordinators: 0.05 } },
    counter: { trust: { coordinators: 4 }, capBonus: { coordination: 7 } },
    reject: { trust: { coordinators: -8 } },
    acceptIfFake: { capBonus: { coordination: -4, efficiency: -2 } },
  },
  {
    id: 'central_scheduling', group: 'admins', title: 'Bring scheduling back',
    line: 'Divisions double-book rooms. Centralize scheduling.',
    trigger: (t, x) => (x.w.structure[1] > 0.3 ? 3 : 0) + (x.changing('structure') ? 1 : 0),
    genuine: (t, x) => x.cap.efficiency < 50,
    accept: { trust: { admins: 8 }, capBonus: { efficiency: 5, responsiveness: -3 } },
    counter: { trust: { admins: 3 }, capBonus: { efficiency: 2 } },
    reject: { trust: { admins: -8 } },
    acceptIfFake: { capBonus: { responsiveness: -4 } },
  },
  {
    id: 'protocol_council', group: 'physicians', title: 'Doctors approve protocols',
    line: 'No new care pathway without a physician council vote.',
    trigger: (t, x) => (x.changing('process') ? 4 : 0) + (x.w.process[0] > 0.5 ? 1 : 0),
    genuine: (t, x) => x.cap.expertise > 55,
    accept: { trust: { physicians: 10 }, progress: { process: -0.25 }, influence: { physicians: 0.05 }, quality: { specialty: 3 } },
    counter: { trust: { physicians: 3 }, progress: { process: -0.1 } },
    reject: { trust: { physicians: -10 } },
  },
  {
    id: 'cross_training', group: 'nurses', title: 'Pay for cross-training',
    line: 'Train us across units and we can cover gaps.',
    trigger: (t, x) => (x.w.people[2] > 0.3 ? 2 : 0) + (x.changing('people') ? 2 : 0) + 0.5,
    genuine: (t, x) => true,
    accept: { trust: { nurses: 6 }, cost: 2.1, capBonus: { adaptability: 3 } },
    counter: { trust: { nurses: 2 }, cost: 0.7, capBonus: { adaptability: 2.8 } },
    reject: { trust: { nurses: -5 } },
  },
  {
    id: 'clinic_hours', group: 'coordinators', title: 'Evening clinic hours',
    line: 'Chronic patients miss visits. Open two evenings a week.',
    trigger: (t, x) => 1 + (x.market.chronic > 0.25 ? 1.5 : 0),
    genuine: (t, x) => x.region === 'mountain' || x.region === 'lakes' || x.cap.responsiveness < 50,
    accept: { trust: { coordinators: 6, nurses: -3 }, cost: 1.0, quality: { chronic: 5 }, capMult: { chronic: 1.06 } },
    counter: { trust: { coordinators: 2 }, cost: 0.5, quality: { chronic: 2 } },
    reject: { trust: { coordinators: -6 } },
    acceptIfFake: { quality: { chronic: -3 } },
  },
  {
    id: 'slow_rollout', group: 'admins', title: 'Slow the rollout',
    line: 'Too many changes at once. Pause one.',
    trigger: (t, x) => x.activeChanges >= 2 ? 5 : 0,
    genuine: (t, x) => x.disruption > 12,
    accept: { trust: { admins: 6, nurses: 4 }, pauseOne: true },
    counter: { trust: { admins: 2 }, disruption: -4 },
    reject: { trust: { admins: -6, nurses: -4 } },
    rejectIfGenuine: { disruption: 6 },
  },
];
