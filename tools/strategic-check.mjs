// Paired seeded scenarios: same rivals, decisions and events except the treatment.
import * as E from '../engine/engine.js';
import { pathToFileURL } from 'node:url';
export function strategicCheck() {
  const mean = xs => xs.reduce((a,b) => a+b,0)/xs.length;
  const play = (seed, arch) => {
    let s = E.createGame({seed, teams: [{id:'test',region:'metro'}, ...['access','excellence','integrated'].map((archetype,i)=>({id:'r'+i,region:'metro',archetype}))]});
    for(let r=1;r<=5;r++) {
      const decisions = Object.fromEntries(Object.values(s.teams).map(t=>[t.id,{archetype:t.id==='test'?arch:t.archetype,focus:t.id==='test'?{primary:20,specialty:arch==='excellence'?60:20,chronic:arch==='integrated'?60:20}:{primary:34,specialty:33,chronic:33},price:'standard',response:'counter'}]));
      s=E.resolveRound(s,decisions);
    }
    return s.teams.test.history;
  };
  const before=[],after=[];
  for(let seed=1;seed<=40;seed++) {
    const specialty=play(seed,'excellence'), chronic=play(seed,'integrated');
    before.push(mean(chronic.slice(0,2).map((h,i)=>h.operating-specialty[i].operating)));
    after.push(mean(chronic.slice(2).map((h,i)=>h.operating-specialty[i+2].operating)));
  }
  const redesign=approach=>{
    let s=E.createGame({seed:101,teams:[{id:'test',region:'metro',archetype:'excellence'}]});
    let finished=null;
    for(let r=1;r<=5;r++) {
      s=E.resolveRound(s,{test:{archetype:'excellence',changes:r===2?{process:2,rewards:2}:{},approach,response:'counter'}});
      if(r>=2 && !finished && Object.keys(s.teams.test.transitions).length===0) finished=r;
    }
    return {finished, minTrust:Math.min(...Object.values(s.teams.test.trust))};
  };
  const mandate=redesign('mandate'),consult=redesign('consult');
  return {preReformChronicAdvantage:mean(before),postReformChronicAdvantage:mean(after),mandate,consult,pass:mean(before)<0 && mean(after)>mean(before) && mandate.finished!==null && mandate.finished<(consult.finished??6) && mandate.minTrust<consult.minTrust};
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {const result=strategicCheck();console.log(JSON.stringify(result,null,2));if(!result.pass)process.exitCode=1;}
