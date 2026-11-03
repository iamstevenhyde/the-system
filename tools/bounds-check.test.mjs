import assert from 'node:assert/strict';
import * as D from '../engine/data.js';
import { PROPOSALS } from '../engine/cards.js';
import { boundsCheck } from './bounds-check.mjs';
assert(boundsCheck().pass);
const rejects=(object,key,value)=>{
  const saved=object[key];
  try { object[key]=value; assert.throws(boundsCheck,undefined,`${key}=${value} must fail`); }
  finally {object[key]=saved;}
};
rejects(D.APPROACHES.consult,'cost',1.51);
rejects(D.APPROACHES.joint,'speed',1.21);
rejects(D.APPROACHES.mandate,'trustHit',22.01);
rejects(D.REGIONS.metro,'fixed',.799);
rejects(D.REGIONS.lakes.reform,'chronic',1.401);
rejects(D.REGIONS.sunbelt,'growth',.121);
rejects(D.RATES,'primary',.26*1.401);
rejects(D.RATES,'primary',NaN);
rejects(D.CONTRIB.strategy[0],'expertise',.01); // baseline zero cannot move
rejects(PROPOSALS.find(p=>p.id==='cross_training').accept,'cost',3.01);
rejects(PROPOSALS[0],'trigger',()=>0);
assert(boundsCheck().pass);
console.log('Bounds checks reject out-of-range, non-finite, zero-baseline and predicate changes.');
