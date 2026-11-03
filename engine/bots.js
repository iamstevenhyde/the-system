// Bot competitors. They see only what a team sees (brief + own history), never
// future events beyond the public warning.
import * as D from './data.js';
import { brief, rng } from './engine.js';

export const PROFILES = ['defender', 'prospector', 'analyzer', 'adaptive', 'reactor'];
const PREF = { defender: 'access', prospector: 'excellence', analyzer: 'integrated', adaptive: 'integrated', reactor: null };

export function botDecision(state, id, profile, seed = 1) {
  const t = state.teams[id];
  const b = brief(state, id);
  const r = state.round;
  const rand = rng((seed * 7919 + r * 104729 + id.length * 31 + id.charCodeAt(id.length - 1)) >>> 0);
  const last = t.history.at(-1);
  const d = { focus: { primary: 34, specialty: 33, chronic: 33 }, invest: { primary: 0, specialty: 0, chronic: 0 }, price: 'standard', explore: 0, changes: {}, approach: 'consult', response: 'counter', pilot: false };
  const arch = r === 1 ? (PREF[profile] || ['access', 'excellence', 'integrated'][Math.floor(rand() * 3)]) : t.archetype;
  d.archetype = arch;
  const home = { access: 'primary', excellence: 'specialty', integrated: 'chronic' }[arch];
  const spend = Math.max(0, t.cash - 8);

  if (profile === 'defender') {
    d.focus = { primary: 30, specialty: 30, chronic: 30, [home]: 55 };
    d.price = arch === 'access' ? 'low' : 'standard';
    if (last && last.util[home] > 0.88) d.invest[home] = Math.min(4, spend * 0.4);
    d.response = b.proposal?.group === 'admins' ? 'accept' : 'counter';
  } else if (profile === 'prospector') {
    d.focus = { primary: 30, specialty: 40, chronic: 30 };
    for (const m of D.MARKETS) d.invest[m] = Math.min(4, spend * 0.2);
    d.explore = Math.min(3, spend * 0.15);
    d.price = 'premium';
    if (r === 3) { d.changes = { strategy: 2, rewards: 2 }; d.approach = 'mandate'; }
    d.pilot = r >= D.PILOT_ROUND && t.cash > 15;
    d.response = 'reject';
  } else if (profile === 'analyzer') {
    d.focus = { primary: 30, specialty: 30, chronic: 30, [home]: 45 };
    if (last) for (const m of D.MARKETS) if (last.util[m] > 0.9) d.invest[m] = Math.min(3, spend * 0.25);
    d.explore = r <= 3 ? Math.min(2, spend * 0.1) : 0;
    if (r === 3 && arch !== 'integrated') { d.changes = { rewards: 2 }; d.approach = 'consult'; }
    if (r === 4 && arch !== 'integrated') { d.changes = { process: 2 }; d.approach = 'consult'; }
    d.response = b.proposal?.evidence === 'weak' ? 'reject' : 'accept';
  } else if (profile === 'adaptive') {
    // Reads the warning and its own weak spots, then redesigns with staff.
    const caps = b.capabilities;
    d.focus = { primary: 33, specialty: 33, chronic: 34 };
    if (r >= 2) d.focus.chronic += 15;
    if (last) for (const m of D.MARKETS) if (last.util[m] > 0.9) d.invest[m] = Math.min(4, spend * 0.3);
    if (b.warning?.id === 'reform' || r === 3) {
      const weak = ['rewards', 'process'].filter(p => t.target[p] !== 2);
      for (const p of weak.slice(0, 2)) d.changes[p] = 2;
      d.approach = Object.keys(d.changes).length > 1 ? 'joint' : 'consult';
    }
    if (caps.adaptability < 45 && r <= 3) d.explore = Math.min(3, spend * 0.15);
    d.pilot = r >= D.PILOT_ROUND && t.target.structure !== 2 && t.cash > 12;
    d.response = b.proposal?.evidence ? (b.proposal.evidence === 'strong' ? 'accept' : 'reject') : 'counter';
  } else {
    // Reactor: chases last round's numbers, flips settings, mandates.
    const ms = D.MARKETS;
    const pick = ms[Math.floor(rand() * 3)];
    d.focus = { primary: 25, specialty: 25, chronic: 25, [pick]: 60 };
    d.price = ['low', 'standard', 'premium'][Math.floor(rand() * 3)];
    if (r >= 2 && rand() < 0.6) {
      const p = D.POINTS[Math.floor(rand() * 5)];
      d.changes[p] = (t.target[p] + 1 + Math.floor(rand() * 2)) % 3;
      d.approach = 'mandate';
    }
    d.invest[pick] = Math.min(5, spend * 0.4);
    d.response = rand() < 0.5 ? 'accept' : 'reject';
  }
  return d;
}

export function botTeams(n, seed, regions) {
  return Array.from({ length: n }, (_, i) => ({ id: `bot${i + 1}`, name: BOT_NAMES[i % BOT_NAMES.length], region: regions[i], bot: PROFILES[(i + seed) % PROFILES.length] }));
}
export const BOT_NAMES = ['Ridgeview Health', 'High Plains Medical', 'Frontier Care', 'Cedar Valley', 'Harbor Point', 'Northgate', 'Silver Creek', 'Lakeshore Health', 'Granite Peak', 'Riverbend', 'Sunridge', 'Meridian Care', 'Pinecrest', 'Bayside', 'Oak Hollow', 'Summit Bluff', 'Canyon Health'];
