import {readFileSync,writeFileSync,appendFileSync,copyFileSync} from 'node:fs';
const [n,note]=process.argv.slice(2);
if(!n||!note) throw new Error('Usage: node tools/round3-iteration.mjs NUMBER NOTE');
const result={stdout:readFileSync('balance_gates.json','utf8')};
const gates=JSON.parse(result.stdout);
writeFileSync('balance_gates.json',result.stdout);
for(const f of ['engine/data.js','engine/cards.js','engine/engine.js','balance_gates.json','balance_report.json']) copyFileSync(f,`tools/round3-results/${n}-${f.split('/').at(-1)}`);
appendFileSync('TUNING_LOG.md',`\n## Round 3 iteration ${n} — 400 seeded games\n\n${note}\n\n\`\`\`json\n${result.stdout}\`\`\`\n`);
console.log(JSON.stringify({...gates,jcurve:Object.fromEntries(Object.entries(gates.jcurve.regions).map(([k,v])=>[k,v.rounds.map(r=>[r.operatingDelta,r.outcomeDelta])])),approaches:Object.fromEntries(Object.entries(gates.approaches.approaches).map(([k,v])=>[k,{both:v.bothWinRate,faster:v.mandateFasterRate,regions:Object.fromEntries(Object.entries(v.regions).map(([r,x])=>[r,x.totalWinRate]))}]))},null,2));
