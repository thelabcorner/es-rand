import { createHash } from 'node:crypto';
import * as R from '../dist/esrand-core.esm.mjs';

const EXPECTED='79f898bd424a75f6d8d53310bf30c1ab4ad790f1cd9011a9c987aa968f2e5b3b';
const h=createHash('sha256');
function add(x){h.update(JSON.stringify(x));h.update('\n');}
for(let s=0;s<512;s++){
  const seed='equiv/'+s;
  const r=R.create(seed);
  const u=[];for(let i=0;i<17;i++)u.push(r.uint32());add(u);
  const f=[];for(let i=0;i<9;i++)f.push(Math.floor(r.random()*9007199254740992));add(f);
  const n=[];for(let i=0;i<13;i++)n.push(r.int(-123456,987654));add(n);
  add(r.shuffled([0,1,2,3,4,5,6,7,8,9]));
  add(r.sample(['a','b','c','d','e','f','g','h'],5));
  add(r.bytes(23));add(r.hex(11));add(r.getState());
  const j=r.clone();j.jump();add(j.getState());
  const l=r.clone();l.longJump();add(l.getState());
}
const actual=h.digest('hex');
if(actual!==EXPECTED){
  throw new Error('determinism fingerprint mismatch: '+actual+' != '+EXPECTED);
}
console.log('determinism-fingerprint: '+actual+' OK');
