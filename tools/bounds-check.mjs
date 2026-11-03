import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as data from '../engine/data.js';
import * as cards from '../engine/cards.js';
import * as baseData from './round3-baseline/data.js';
import * as baseCards from './round3-baseline/cards.js';
import { pathToFileURL } from 'node:url';
const range=(v,lo,hi,path)=>assert(Number.isFinite(v)&&v>=lo-1e-10&&v<=hi+1e-10,`${path}: ${v} outside [${lo}, ${hi}]`);
export function boundsCheck() {
  let checked=0;
  function walk(value,base,path) {
    if(typeof base==='number') {
      let limits=[base-Math.abs(base)*.4,base+Math.abs(base)*.4];
      const a=path.match(/^data.APPROACHES.(mandate|consult|joint).(cost|speed|trustHit)$/);
      if(a) limits=a[2]==='speed'?[.3,1.2]:a[2]==='cost'?{mandate:[0,.5],consult:[.3,1.5],joint:[.6,3]}[a[1]]:{mandate:[8,22],consult:[2,8],joint:[1,6]}[a[1]];
      if(path==='data.CHANGE_COST') limits=[.8,3];
      if(path==='data.DISRUPTION_PER_CHANGE') limits=[4,12];
      if(path==='data.REFORM_QUALITY_SLOPE') limits=[base*.6,.012];
      if(/^data.REGIONS.\w+.reform./.test(path)) limits=path.endsWith('chronic')?[1.05,1.4]:[.8,1];
      if(/^data.REGIONS.\w+.(labor|fixed)$/.test(path)) limits=[.8,1.25];
      if(/^data.REGIONS.\w+.growth$/.test(path)) limits=[-.02,.12];
      if(path.startsWith('cards.')&&path.endsWith('.cost')) limits[1]=Math.min(3,limits[1]);
      range(value,...limits,path); checked++;
    } else if(typeof base==='function') {
      // Trigger/genuine predicates are unchanged: includes all embedded numeric thresholds.
      assert.equal(String(value),String(base),`${path}: predicate changed`);
    } else if(base&&typeof base==='object') {
      assert.deepEqual(Object.keys(value),Object.keys(base),`${path}: schema changed`);
      for(const key of Object.keys(base)) walk(value[key],base[key],`${path}.${key}`);
    }
  }
  // Numeric constants in the engine are also subject to the 40% rule.
  // Only the two explicitly documented new implementation mechanics are exempt
  // from a nonexistent baseline; assert small absolute ranges for them instead.
  let engine=readFileSync(new URL('../engine/engine.js',import.meta.url),'utf8');
  const backfill=engine.match(/function trImplementationCost\(team\) \{ return team.disruption \* ([\d.]+); \}/);
  const learning=engine.match(/team.capBonus.efficiency = clamp\(\(team.capBonus.efficiency \|\| 0\) \+ ([\d.]+), -15, 15\);/);
  if(backfill) {range(+backfill[1],0,.15,'engine.newBackfillCost'); engine=engine.replace(backfill[0],'');}
  if(learning) {range(+learning[1],0,4,'engine.newCompletionLearning'); engine=engine.replace(learning[0],'');}
  const numeric=source=>source.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g,'').match(/(?<![\w])(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/g).map(Number);
  const original=numeric(readFileSync(new URL('./round3-baseline/engine.js',import.meta.url),'utf8')),current=numeric(engine);
  assert.equal(current.length,original.length,'Undeclared engine numeric additions/removals');
  original.forEach((v,i)=>{range(current[i],v-Math.abs(v)*.4,v+Math.abs(v)*.4,`engine.numeric[${i}]`);checked++;});
  walk(data,baseData,'data'); walk(cards,baseCards,'cards');
  assert(data.APPROACHES.mandate.speed>data.APPROACHES.consult.speed&&data.APPROACHES.mandate.speed>data.APPROACHES.joint.speed,'Mandate must be fastest');
  return {pass:true,checked};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) console.log(JSON.stringify(boundsCheck()));
