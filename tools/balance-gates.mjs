import { boundsCheck } from './bounds-check.mjs';
const bounds=boundsCheck();
import { readFileSync } from 'node:fs';
import { jcurveCheck, approachCheck } from './jcurve-check.mjs';
import { strategicCheck } from './strategic-check.mjs';
const r=JSON.parse(readFileSync('balance_report.json'));
for (const region of ['mountain','metro','sunbelt','lakes']) {
  if (r['classwin:region:'+region]?.n !== 400) throw new Error('Balance gates require exactly 400 games per region');
}
const values=prefix=>Object.fromEntries(Object.entries(r).filter(([k])=>k.startsWith(prefix)).map(([k,v])=>[k.slice(prefix.length),v.mean]));
const arch=values('win:arch:'),wins=values('win:profile:'),regions=values('classwin:region:'),means=values('profile:');
for (const [values, keys] of [[arch,['access','excellence','integrated']],[wins,['defender','prospector','analyzer','adaptive','reactor']],[means,['defender','prospector','analyzer','adaptive','reactor']],[regions,['mountain','metro','sunbelt','lakes']]]) {
  if (keys.some(k=>!Number.isFinite(values[k]))) throw new Error('Missing or non-finite required metric');
}
const between=(o,lo,hi)=>Object.values(o).every(x=>x>=lo&&x<=hi);
const spread=Math.max(...Object.values(means))-Math.min(...Object.values(means));
const strategic=strategicCheck(),jcurve=jcurveCheck(),approaches=approachCheck();
const gates={G1:between(arch,.18,.45),G2:between(wins,0,.4)&&Object.entries(means).every(([k,v])=>k==='reactor'||v>means.reactor),G3:between(regions,.15,.35),G4:r.capped.mean>=.03&&r.capped.mean<=.12,G5:r.invariantCount===0,G6:spread>=8,G7:strategic.pass,G8:jcurve.pass,G9:wins.adaptive>=.22&&wins.adaptive<=.38&&Object.entries(means).every(([k,v])=>k==='reactor'||v>means.reactor),G10:approaches.pass};
console.log(JSON.stringify({bounds,gates,arch,wins,regions,means,capped:r.capped.mean,invariantCount:r.invariantCount,spread,strategic,jcurve,approaches},null,2));
if(Object.values(gates).some(x=>!x))process.exitCode=1;
