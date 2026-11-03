import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as data from '../engine/data.js';
import * as cards from '../engine/cards.js';
import * as baseData from './round3-baseline/data.js';
import * as baseCards from './round3-baseline/cards.js';
import * as deckdata from '../engine/deckdata.js';
import * as baseDeckdata from './round3-baseline/deckdata.js';
import { pathToFileURL } from 'node:url';
const range=(v,lo,hi,path)=>assert(Number.isFinite(v)&&v>=lo-1e-10&&v<=hi+1e-10,`${path}: ${v} outside [${lo}, ${hi}]`);
// v2 deck: designers may add a small new effect (a hurt chip) to an option's fx. New keys are accepted
// when every new number is within +/-5; they are then pinned to that value like any baseline key.
const newDeckPaths=new Set();
function graft(cur,base,path) {
  for(const k of Object.keys(cur)) {
    if(!(k in base)) {base[k]=JSON.parse(JSON.stringify(cur[k])); const mark=(v,pp)=>{ if(typeof v==='number') newDeckPaths.add(pp); else if(v&&typeof v==='object') Object.keys(v).forEach(x=>mark(v[x],pp+'.'+x)); }; mark(cur[k],path+'.'+k);}
    else if(cur[k]&&typeof cur[k]==='object'&&base[k]&&typeof base[k]==='object') graft(cur[k],base[k],path+'.'+k);
  }
}
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
      // v2 deck: card costs 0.5-5, raid capacity transfer <= 25%, walkout capacity cut 5-15%.
      if(newDeckPaths.has(path)&&!/\.cost$/.test(path)) limits=[-5,5];
      if(/^deckdata.OPTION_FX.\w+.fx.cost$/.test(path)) limits=[.5,5];
      if(path==='deckdata.DK.RAID_FRACTION') limits=[0,.25];
      if(path==='deckdata.DK.RAID_GAIN') limits=[base*.6,1];
      if(path==='deckdata.DK.STRIKE_CAP') limits=[.85,.95];
      if(path.startsWith('cards.')&&path.endsWith('.cost')) limits[1]=Math.min(3,limits[1]);
      range(value,...limits,path); checked++;
    } else if(typeof base==='function') {
      // Trigger/genuine predicates are unchanged: includes all embedded numeric thresholds.
      assert.equal(String(value),String(base),`${path}: predicate changed`);
    } else if(base&&typeof base==='object') {
      assert.deepEqual(Object.keys(value).filter(k=>k!=='means').sort(),Object.keys(base).sort(),`${path}: schema changed`);
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
  walk(data,baseData,'data'); walk(cards,baseCards,'cards'); const bd=JSON.parse(JSON.stringify(baseDeckdata.OPTION_FX)); graft(deckdata.OPTION_FX,bd,'deckdata.OPTION_FX'); walk(deckdata,{...baseDeckdata,OPTION_FX:bd},'deckdata');
  assert(data.APPROACHES.mandate.speed>data.APPROACHES.consult.speed&&data.APPROACHES.mandate.speed>data.APPROACHES.joint.speed,'Mandate must be fastest');
  return {pass:true,checked};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) console.log(JSON.stringify(boundsCheck()));
