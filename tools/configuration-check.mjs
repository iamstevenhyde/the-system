// Exhaustive founding configurations, with identical capacities, rivals and policy.
// Checks that mixed star choices can compete without a matching-choice win rule.
import assert from 'node:assert/strict';
import * as E from '../engine/engine.js';
import { POINTS, REGION_IDS } from '../engine/data.js';
const results = {};
for (const region of REGION_IDS) {
  const best = {mixed:null, uniform:null};
  for (let code=0;code<243;code++) {
    let n=code;
    const choices=POINTS.map(()=>{const v=n%3;n=Math.floor(n/3);return v;});
    const changes=Object.fromEntries(POINTS.map((p,i)=>[p,choices[i]]));
    let s=E.createGame({seed:101,teams:[{id:'test',region},...['access','excellence','integrated'].map((archetype,i)=>({id:'r'+i,region,archetype}))]});
    for(let round=1;round<=5;round++) {
      const decisions=Object.fromEntries(Object.values(s.teams).map(t=>[t.id,{archetype:t.archetype,changes:t.id==='test'&&round===1?changes:{},response:'counter',price:'standard',focus:{primary:34,specialty:33,chronic:33}}]));
      s=E.resolveRound(s,decisions);
    }
    const total=E.score(s,'test').total;
    const kind=new Set(choices).size===1?'uniform':'mixed';
    if(!best[kind]||total>best[kind].total) best[kind]={choices,total};
  }
  results[region]=best;
  // Viable means within five score points of the best uniform configuration.
  // Requiring mixed choices to dominate every region would invert the same problem.
  assert(best.mixed.total>=best.uniform.total-5,`${region}: mixed configurations are not competitive`);
}
console.log(JSON.stringify(results,null,2));
