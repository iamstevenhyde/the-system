// Balance tournament: many seeded games of 12-17 bot teams. Writes balance_report.json
import * as E from '../engine/engine.js';
import { botDecision, PROFILES } from '../engine/bots.js';
import { writeFileSync } from 'node:fs';
const N = +(process.argv[2] || 400);
const stats = {}; const add = (k, v) => ((stats[k] ||= []).push(v));
const inv = [];
for (let g = 0; g < N; g++) {
  const n = 12 + (g % 6);
  const regions = E.assignRegions(n, g + 1);
  const teams = regions.map((r, i) => ({ id: 'b' + i, name: 'B' + i, region: r, bot: PROFILES[(i + g) % 5] }));
  let s = E.createGame({ seed: g + 1, teams });
  for (let r = 1; r <= 5; r++) {
    const d = {}; for (const t of teams) d[t.id] = botDecision(s, t.id, t.bot, g + 1);
    s = E.resolveRound(s, d);
    for (const [rid, ro] of Object.entries(s.log.at(-1).regions)) for (const m of ['primary','specialty','chronic']) {
      const served = s.regions[rid].teams.reduce((a, id) => a + s.teams[id].history.at(-1).served[m], 0);
      if (Math.abs(served + ro.outside[m] - ro.demand[m]) > 0.05) inv.push(`demand mismatch g${g} r${r} ${rid} ${m}`);
    }
    for (const t of teams) { const h = s.teams[t.id].history.at(-1);
      if (Math.abs(h.startCash + h.operating - h.investment - h.cash) > 0.05) inv.push(`cash mismatch g${g} ${t.id}`);
      for (const m of ['primary','specialty','chronic']) if (h.served[m] > h.effCap[m] + 0.01) inv.push(`over capacity g${g} ${t.id}`); }
  }
  const rk = E.rankings(s);
  for (const x of rk) { const t = s.teams[x.id];
    add('profile:' + t.bot, x.total); add('arch:' + t.archetype, x.total); add('region:' + t.region, x.total);
    add('win:profile:' + t.bot, x.regionRank === 1 ? 1 : 0); add('win:arch:' + t.archetype, x.regionRank === 1 ? 1 : 0);
    add('capped', x.capped ? 1 : 0); }
  // A region's class-win rate is its share of games won, not wins per team.
  for (const rid of Object.keys(s.regions)) add('classwin:region:' + rid, rk[0].region === rid ? 1 : 0);
}
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const sd = a => { const m = mean(a); return Math.sqrt(mean(a.map(v => (v - m) ** 2))); };
const out = Object.fromEntries(Object.entries(stats).map(([k, a]) => [k, { mean: mean(a), sd: +sd(a).toFixed(2), n: a.length }]));
out.invariantViolations = inv.slice(0, 20); out.invariantCount = inv.length;
writeFileSync('balance_report.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
