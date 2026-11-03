// The System: 5-minute round data (dial, forecast, rival words, region problems, collisions).
// Separate from deckdata.js so the balancer's pinned schema there is untouched.

// ---- 5-minute round additions (new keys only) ----
export const DIAL = {
  light:  { focusBlend: -0.5, investMult: 0.5 },   // blend toward an even split / scale the spend
  steady: { focusBlend: 0, investMult: 1 },
  all:    { focusBlend: 0.4, investMult: 1.5 },    // push the peak further out
};
export const DIALS = Object.keys(DIAL);
export const FORECAST_BONUS = 1;   // adaptability points for a correct call
export const PROFILE_WORD = { defender: 'Wall builder', prospector: 'Raider', analyzer: 'Copycat', adaptive: 'Shape-shifter', reactor: 'Wildcard' };
export const REGION_PROBLEM = {
  mountain: 'Patients are far away. Access wins here.',
  metro: 'Talent is scarce and rivals poach. Experts are the prize.',
  sunbelt: 'Demand grows fast. Scale wins here.',
  lakes: 'Old plants and chronic illness. Coordination wins here.',
};
// Text only. Never says which pick is better and gives no score hint.
const PAIRS = [
  [['r1_undercut', 'r1_tighten'], 'A price cut and a costly tune-up land together. Cash gets tight.'],
  [['r2_raid', 'r2_townhall'], 'A raid and a town hall send mixed signals. Staff may doubt the listening.'],
  [['r2_county', 'r2_standardize'], 'A county contract asks for local ties. One schedule for every division pulls the other way.'],
  [['r3_chase', 'r3_consult'], 'Chronic care needs coordination. A consult-first change arrives slowly.'],
  [['r3_hold', 'r3_redesign'], 'You hold specialty while changing the design. Your experts feel the change first.'],
  [['r4_press', 'r4_push'], 'Pressing on and pushing through ask the same tired staff for more.'],
  [['r4_press', 'r4_pause'], 'Press on and Pause one pull in opposite directions.'],
  [['r4_hold', 'r4_push'], 'Holding the line on the vote while changing the design by order. Staff hear both.'],
  [['r5_harvest', 'r5_retain'], 'Taking the cash while funding a retention pool. The money goes two ways.'],
];
export function collisionsFor(picks = {}) {
  const ids = [picks.market, picks.org, picks.people];
  return PAIRS.filter(([pair]) => pair.every(p => ids.includes(p))).map(([, line]) => line);
}
