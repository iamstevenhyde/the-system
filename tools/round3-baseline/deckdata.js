// The System v2: card deck data. Pure data, no logic. Engine effects for every
// deck option live here so moves.js can apply them and deck.js can show them.
// All v2 numbers live in this file (bounds-check pins numeric literals in engine.js).
import { GROUPS } from './data.js';

export const DK = {
  RAID_FRACTION: 0.18,     // share of the target's specialty capacity a full-strength raid takes
  RAID_GAIN: 0.8,          // share of that capacity the raider actually keeps
  RAID_TRUST: 8,           // physician trust the target loses
  COUNTY_LOCK: 0.6,        // extra loyalty on last round's share while a county contract is in force
  COUNTY_SPAN: 1,          // rounds after signing that the contract still protects
  STRIKE_ROUND: 4,
  STRIKE_THRESHOLD: 55,    // weighted trust needed to avoid a walkout
  STRIKE_CAP: 0.9,         // capacity multiplier during a walkout
  STRIKE_DISRUPTION: 6,
  TRUST_GATE: 50,
  GATE_CAP: 0.9,
  INERTIA_STEP: 0.15,      // change cost grows this much per quiet round
  INERTIA_MAX: 1.5,
  FORCED_BONUS: 50,        // makes a scheduled proposal win pickProposal
  FIT_MIN: 0.5,
  FIT_MAX: 1,
  LOOSEN_DISRUPTION: 5,
};
export const FORCED_PROPOSALS = { 2: 'safe_staffing', 3: 'protocol_council' };
export const CHIEF_GROUP = { access: 'admins', excellence: 'physicians', integrated: 'coordinators' };
export const PERSON = {
  physicians: { name: 'Dr. Amara Okafor', role: 'Chief of surgery' },
  nurses: { name: 'Nina Reyes', role: 'Chief nurse' },
  admins: { name: 'Marcus Bell', role: 'Chief operating officer' },
  coordinators: { name: 'Priya Shah', role: 'Care coordination lead' },
};
const all = v => Object.fromEntries(GROUPS.map(g => [g, v]));

// slot, round, fx (engine effects, same shape as proposal effects), and specials:
// fit {cap, need, market}, raid, county, flag, chief, listen, pilotNext, trustGate,
// strike ('concede'|'hold'|'committee'), bonus, needSeat.
export const OPTION_FX = {
  r1_claim:      { slot: 'market', round: 1, fx: {} },
  r1_spread:     { slot: 'market', round: 1, fx: {} },
  r1_undercut:   { slot: 'market', round: 1, fx: {}, fit: { cap: 'efficiency', need: 45, market: 'primary' } },
  r1_keep:       { slot: 'org', round: 1, fx: {} },
  r1_tighten:    { slot: 'org', round: 1, fx: { cost: 1.5, capBonus: { efficiency: 3 } } },
  r1_loosen:     { slot: 'org', round: 1, fx: { disruption: DK.LOOSEN_DISRUPTION, capBonus: { adaptability: 3 } } },
  r1_seat:       { slot: 'people', round: 1, fx: { cost: 0.5 }, chief: { trust: 8, influence: 0.05 }, flag: { execSeat: 'seat' } },
  r1_advisory:   { slot: 'people', round: 1, fx: {}, chief: { trust: 3, influence: 0.02 }, flag: { execSeat: 'advisory' } },
  r1_keepRights: { slot: 'people', round: 1, fx: { capBonus: { efficiency: 2 } }, chief: { trust: -5, influence: 0 }, flag: { execSeat: 'no' } },

  r2_build:      { slot: 'market', round: 2, fx: {} },
  r2_raid:       { slot: 'market', round: 2, fx: { cost: 3.5 }, raid: true, fit: { cap: 'expertise', need: 55, market: 'specialty' } },
  r2_county:     { slot: 'market', round: 2, fx: { cost: 2 }, county: true },
  r2_standardize:{ slot: 'org', round: 2, fx: { cost: 1, trust: { admins: 8, physicians: -4 }, capBonus: { efficiency: 5, responsiveness: -3 }, influence: { admins: 0.03 } } },
  r2_leave:      { slot: 'org', round: 2, fx: {} },
  r2_townhall:   { slot: 'org', round: 2, fx: { cost: 0.6, trust: { nurses: 3, physicians: 2, admins: 2, coordinators: 2 } }, listen: true },
  r2_staff_accept:  { slot: 'people', round: 2, fx: {} },
  r2_staff_counter: { slot: 'people', round: 2, fx: {} },
  r2_staff_reject:  { slot: 'people', round: 2, fx: {} },

  r3_chase:      { slot: 'market', round: 3, fx: {}, fit: { cap: 'coordination', need: 60, market: 'chronic' } },
  r3_hold:       { slot: 'market', round: 3, fx: {}, fit: { cap: 'expertise', need: 55, market: 'specialty' } },
  r3_hedge:      { slot: 'market', round: 3, fx: {} },
  r3_redesign:   { slot: 'org', round: 3, fx: {} },
  r3_consult:    { slot: 'org', round: 3, fx: {} },
  r3_pilot:      { slot: 'org', round: 3, fx: { cost: 1 }, pilotNext: true },
  r3_council_accept:  { slot: 'people', round: 3, fx: {} },
  r3_council_counter: { slot: 'people', round: 3, fx: {} },
  r3_council_reject:  { slot: 'people', round: 3, fx: {} },

  r4_defend:     { slot: 'market', round: 4, fx: {} },
  r4_press:      { slot: 'market', round: 4, fx: {}, trustGate: DK.TRUST_GATE },
  r4_pause:      { slot: 'org', round: 4, fx: { pauseOne: true, trust: { nurses: 2, admins: 2 } } },
  r4_push:       { slot: 'org', round: 4, fx: {} },
  r4_concede:    { slot: 'people', round: 4, fx: { cost: 2, trust: all(6) }, strike: 'concede' },
  r4_hold:       { slot: 'people', round: 4, fx: {}, strike: 'hold' },
  r4_committee:  { slot: 'people', round: 4, fx: { cost: 1, trust: all(3) }, strike: 'committee', bonus: 6, needSeat: true },

  r5_challenge:  { slot: 'market', round: 5, fx: { cost: 1.5 } },
  r5_protect:    { slot: 'market', round: 5, fx: {} },
  r5_harvest:    { slot: 'market', round: 5, fx: {} },
  r5_lock:       { slot: 'org', round: 5, fx: {} },
  r5_fix:        { slot: 'org', round: 5, fx: {} },
  r5_retain:     { slot: 'people', round: 5, fx: { cost: 2.5, trust: all(4) } },
  r5_thanks:     { slot: 'people', round: 5, fx: { cost: 0.4, trust: all(1) } },
  r5_council:    { slot: 'people', round: 5, fx: { cost: 1, trust: all(3) }, needSeat: true },
};
export const SLOTS = ['market', 'org', 'people'];
export const optionsFor = (round, slot) => Object.keys(OPTION_FX).filter(k => OPTION_FX[k].round === round && OPTION_FX[k].slot === slot);
