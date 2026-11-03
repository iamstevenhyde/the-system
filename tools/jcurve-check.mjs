// Paired counterfactuals: identical founding state, rivals, events and policies.
// Only the test team's redesign and its approach differ. No investment or pilot.
import * as E from '../engine/engine.js';
import { REGION_IDS } from '../engine/data.js';
import { pathToFileURL } from 'node:url';
const mean = xs => xs.reduce((a,b)=>a+b,0)/xs.length;
export function pairedRun(seed, region, approach, archetype='excellence', schedule='staged') {
  let s=E.createGame({seed,teams:[{id:'test',region,archetype},...['access','excellence','integrated'].map((archetype,i)=>({id:'r'+i,region,archetype}))]});
  let finished=null;
  for(let r=1;r<=5;r++) {
    const decisions=Object.fromEntries(Object.values(s.teams).map(t=>[t.id,{archetype:t.archetype,focus:{primary:34,specialty:33,chronic:33},price:'standard',response:'counter'}]));
    if(approach) Object.assign(decisions.test,{approach,changes:schedule==='pair'?(r===2?{process:2,rewards:2}:{}):(r===2?{structure:2,process:2}:r===3?{strategy:2,rewards:2}:{})});
    s=E.resolveRound(s,decisions);
    if(approach && r>=(schedule==='pair'?2:3) && finished===null && Object.keys(s.teams.test.transitions).length===0) finished=r;
  }
  return {history:s.teams.test.history,finished,minTrust:Math.min(...Object.values(s.teams.test.trust)),total:E.score(s,'test').total};
}
export function jcurveCheck(n=100) {
  const regions={};
  for(const region of ['lakes','metro']) {
    const deltas=Array.from({length:n},(_,i)=>{
      const base=pairedRun(i+1,region,null),change=pairedRun(i+1,region,'joint');
      return change.history.map((h,r)=>({operating:h.operating-base.history[r].operating,outcome:h.outcome-base.history[r].outcome}));
    });
    const rounds=Array.from({length:5},(_,r)=>({round:r+1,operatingDelta:mean(deltas.map(d=>d[r].operating)),outcomeDelta:mean(deltas.map(d=>d[r].outcome))}));
    regions[region]={pairs:n,rounds,pass:rounds[1].operatingDelta<0&&rounds[2].operatingDelta<0&&rounds[4].operatingDelta>0&&rounds[4].outcomeDelta>0};
  }
  return {regions,pass:Object.values(regions).every(r=>r.pass)};
}
export function approachCheck(n=100) {
  const approaches={};
  for(const approach of ['consult','joint']) {
    const regions={};
    for(const region of REGION_IDS) {
      const pairs=Array.from({length:n},(_,i)=>{
        // Both common legacy starts, evenly represented; same two workflow/reward changes.
        const arch=i%2?'access':'excellence';
        return [pairedRun(i+1,region,approach,arch,'pair'),pairedRun(i+1,region,'mandate',arch,'pair')];
      });
      regions[region]={pairs:n,trustWinRate:mean(pairs.map(([a,m])=>+(a.minTrust>m.minTrust))),totalWinRate:mean(pairs.map(([a,m])=>+(a.total>m.total))),bothWinRate:mean(pairs.map(([a,m])=>+(a.minTrust>m.minTrust&&a.total>m.total))),mandateFasterRate:mean(pairs.map(([a,m])=>+(m.finished!==null&&(a.finished===null||m.finished<a.finished)))),meanTotalDelta:mean(pairs.map(([a,m])=>a.total-m.total)),unfinished: pairs.filter(([a])=>a.finished===null).length};
    }
    const rs=Object.values(regions);
    approaches[approach]={regions,bothWinRate:mean(rs.map(r=>r.bothWinRate)),mandateFasterRate:mean(rs.map(r=>r.mandateFasterRate)),pass:mean(rs.map(r=>r.bothWinRate))>=.55&&mean(rs.map(r=>r.mandateFasterRate))>.5&&rs.some(r=>r.totalWinRate<.5)&&rs.some(r=>r.totalWinRate>.5)};
  }
  return {approaches,pass:Object.values(approaches).every(a=>a.pass)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const jcurve=jcurveCheck(),approaches=approachCheck();console.log(JSON.stringify({jcurve,approaches},null,2));if(!jcurve.pass||!approaches.pass)process.exitCode=1;}
