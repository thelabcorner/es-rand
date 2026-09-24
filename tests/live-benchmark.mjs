#!/usr/bin/env node
// Live Illustrator benchmark. ESTIMER is the ONLY timer used by the generated
// ExtendScript. No ESRAND code reads the host timer directly.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

var ROOT=dirname(fileURLToPath(import.meta.url)), PROJECT=join(ROOT,'..');
var RV=process.env.ESRAND_VENDOR_FILE?join(PROJECT,process.env.ESRAND_VENDOR_FILE):join(PROJECT,'dist','vendor-esrand.js');
var TV=join(PROJECT,'..','estimer','dist','vendor-estimer.js');
var TOOL=join(PROJECT,'..','agent-skills','illustrator-com-automation-skill','comtool','ILLUSTRATOR_COM_TOOL.py');
if(!existsSync(RV)||!existsSync(TV)||!existsSync(TOOL)) throw new Error('required build/tool missing');

function call(args){try{return execFileSync('python',[TOOL].concat(args),{encoding:'utf8',timeout:300000});}catch(e){return null;}}
var s=call(['status','--no-launch']);
if(!s){console.log('SKIP: Illustrator/COM unavailable');process.exit(2);}
var se;try{se=JSON.parse(s.trim());}catch(e){console.log('SKIP: invalid status');process.exit(2);}
if(!se.ok||!se.result||(se.result.Version&&se.result.Version._error)){console.log('SKIP: Illustrator/COM unavailable');process.exit(2);}

var tmp=join(process.env.TEMP||'.','esrand-live'), probe=join(tmp,'esrand-live-benchmark.jsx');
mkdirSync(tmp,{recursive:true});
var rp=RV.replace(/\\/g,'/'), tp=TV.replace(/\\/g,'/');
var src=[
'#target illustrator',
'$.evalFile(File("'+tp+'"));',
'try { $.global.ESRAND = void 0; } catch (clearError) {}',
'$.evalFile(File("'+rp+'"));',
'var T=$.global.ESTIMER,R=$.global.ESRAND;',
'T.prime();',
'var sink=0,tmpR=null,i,k,a;',
'function lane(name,batch,fn){',
' var ss=T.samples(9,fn,{warmup:5,collectRejected:true});var st=T.stats(ss);',
' return {lane:name,batch:batch,medianUs:st.median,minUs:st.min,p95Us:st.p95,',
'   usPerOp:st.median/batch,samples:st.count,rejected:ss.rejected?ss.rejected.length:0};',
'}',
'var out=[];',
'var u=R.create("bench-u32"),f=R.create("bench-float"),ir=R.create("bench-int"),',
'    il=R.create("bench-int-large"),fr=R.create("bench-range"),bo=R.create("bench-bool"),',
'    ch=R.create("bench-chance"),cr=R.create("bench-choice"),sr=R.create("bench-shuffle"),',
'    shr=R.create("bench-shuffled"),sam=R.create("bench-sample"),br=R.create("bench-bytes"),',
'    hr=R.create("bench-hex"),gs=R.create("bench-state"),cl=R.create("bench-clone"),',
'    r32=R.create("bench-r32"),f32=R.create("bench-f32"),fu=R.create("bench-fill-u"),',
'    fr64=R.create("bench-fill-r"),fr3264=R.create("bench-fill-r32"),fb64=R.create("bench-fill-bytes"),',
'    ff64=R.create("bench-fill-float"),ff3264=R.create("bench-fill-float32"),fbool64=R.create("bench-fill-bool"),fchance64=R.create("bench-fill-chance"),',
'    fi64=R.create("bench-fill-int"),fip64=R.create("bench-fill-int-pow2"),fil64=R.create("bench-fill-int-large"),',
'    sam1k=R.create("bench-sample-1k"),sam10k=R.create("bench-sample-10k"),sam500=R.create("bench-sample-500");',
'var arr64=[],arr1k=[],arr10k=[],choices=[],fillU=[],fillR=[],fillR32=[],fillB=[],fillF=[],fillF32=[],fillBool=[],fillChance=[],fillI=[],fillIL=[];',
'for(i=0;i<64;i++){arr64[i]=i;fillU[i]=0;fillR[i]=0;fillR32[i]=0;fillB[i]=0;fillF[i]=0;fillF32[i]=0;fillBool[i]=false;fillChance[i]=false;fillI[i]=0;fillIL[i]=0;}for(i=0;i<16;i++){choices[i]=i;}for(i=0;i<1000;i++){arr1k[i]=i;}for(i=0;i<10000;i++){arr10k[i]=i;}',
'out[out.length]=lane("Math.random",1000,function(){for(i=0;i<1000;i++){sink+=Math.random();}});',
'out[out.length]=lane("ESRAND.create(number)x1",1,function(){tmpR=R.create(123456789);});',
'out[out.length]=lane("ESRAND.create(number)x5",5,function(){for(i=0;i<5;i++){tmpR=R.create(123456789+i);}});',
'out[out.length]=lane("ESRAND.create(number)x25",25,function(){for(i=0;i<25;i++){tmpR=R.create(123456789+i);}});',
'out[out.length]=lane("ESRAND.create(string16)x1",1,function(){tmpR=R.create("0123456789abcdef");});',
'out[out.length]=lane("ESRAND.create(string16)x25",25,function(){for(i=0;i<25;i++){tmpR=R.create("0123456789abc"+i);}});',
'out[out.length]=lane("ESRAND.create(string64)x1",1,function(){tmpR=R.create("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");});',
'out[out.length]=lane("ESRAND.uint32",1000,function(){for(i=0;i<1000;i++){sink+=u.uint32();}});',
'out[out.length]=lane("ESRAND.random53",1000,function(){for(i=0;i<1000;i++){sink+=f.random();}});',
'out[out.length]=lane("ESRAND.random32",1000,function(){for(i=0;i<1000;i++){sink+=r32.random32();}});',
'out[out.length]=lane("ESRAND.float(-2.5,9.25)",1000,function(){for(i=0;i<1000;i++){sink+=fr.float(-2.5,9.25);}});',
'out[out.length]=lane("ESRAND.float32(-2.5,9.25)",1000,function(){for(i=0;i<1000;i++){sink+=f32.float32(-2.5,9.25);}});',
'out[out.length]=lane("ESRAND.int(0,999)",1000,function(){for(i=0;i<1000;i++){sink+=ir.int(0,999);}});',
'out[out.length]=lane("ESRAND.int(1e12,+999)",1000,function(){for(i=0;i<1000;i++){sink+=il.int(1000000000000,1000000000999);}});',
'out[out.length]=lane("ESRAND.bool",1000,function(){for(i=0;i<1000;i++){if(bo.bool())sink++;}});',
'out[out.length]=lane("ESRAND.chance(.25)",1000,function(){for(i=0;i<1000;i++){if(ch.chance(.25))sink++;}});',
'out[out.length]=lane("ESRAND.choice(16)",1000,function(){for(i=0;i<1000;i++){sink+=cr.choice(choices);}});',
'out[out.length]=lane("ESRAND.shuffle(64)-core",25,function(){for(k=0;k<25;k++){sr.shuffle(arr64);sink+=arr64[0];}});',
'out[out.length]=lane("ESRAND.shuffled(64)",25,function(){for(k=0;k<25;k++){a=shr.shuffled(arr64);sink+=a[0];}});',
'out[out.length]=lane("ESRAND.sample(64,8)",25,function(){for(k=0;k<25;k++){a=sam.sample(arr64,8);sink+=a[0];}});',
'out[out.length]=lane("ESRAND.sample(1000,8)",25,function(){for(k=0;k<25;k++){a=sam1k.sample(arr1k,8);sink+=a[0];}});',
'out[out.length]=lane("ESRAND.sample(10000,8)",10,function(){for(k=0;k<10;k++){a=sam10k.sample(arr10k,8);sink+=a[0];}});',
'out[out.length]=lane("ESRAND.sample(1000,500)",5,function(){for(k=0;k<5;k++){a=sam500.sample(arr1k,500);sink+=a[0];}});',
'out[out.length]=lane("ESRAND.bytes(64)",100,function(){for(i=0;i<100;i++){sink+=br.bytes(64)[0];}});',
'out[out.length]=lane("ESRAND.hex(64)",100,function(){for(i=0;i<100;i++){sink+=hr.hex(64).length;}});',
'out[out.length]=lane("ESRAND.fillUint32(64)",100,function(){for(i=0;i<100;i++){fu.fillUint32(fillU,64);sink+=fillU[0];}});',
'out[out.length]=lane("ESRAND.fillRandom(64)",100,function(){for(i=0;i<100;i++){fr64.fillRandom(fillR,64);sink+=fillR[0];}});',
'out[out.length]=lane("ESRAND.fillRandom32(64)",100,function(){for(i=0;i<100;i++){fr3264.fillRandom32(fillR32,64);sink+=fillR32[0];}});',
'out[out.length]=lane("ESRAND.fillFloat(64)",100,function(){for(i=0;i<100;i++){ff64.fillFloat(fillF,-2.5,9.25,64);sink+=fillF[0];}});',
'out[out.length]=lane("ESRAND.fillFloat32(64)",100,function(){for(i=0;i<100;i++){ff3264.fillFloat32(fillF32,-2.5,9.25,64);sink+=fillF32[0];}});',
'out[out.length]=lane("ESRAND.fillBool(64)",100,function(){for(i=0;i<100;i++){fbool64.fillBool(fillBool,64);if(fillBool[0])sink++;}});',
'out[out.length]=lane("ESRAND.fillChance(64,.25)",100,function(){for(i=0;i<100;i++){fchance64.fillChance(fillChance,.25,64);if(fillChance[0])sink++;}});',
'out[out.length]=lane("ESRAND.fillBytes(64)",100,function(){for(i=0;i<100;i++){fb64.fillBytes(fillB,64);sink+=fillB[0];}});',
'out[out.length]=lane("ESRAND.fillInt(64,0..999)",100,function(){for(i=0;i<100;i++){fi64.fillInt(fillI,0,999,64);sink+=fillI[0];}});',
'out[out.length]=lane("ESRAND.fillInt(64,-512..511)",100,function(){for(i=0;i<100;i++){fip64.fillInt(fillI,-512,511,64);sink+=fillI[0];}});',
'out[out.length]=lane("ESRAND.fillInt(64,1e12..+999)",100,function(){for(i=0;i<100;i++){fil64.fillInt(fillIL,1000000000000,1000000000999,64);sink+=fillIL[0];}});',
'out[out.length]=lane("ESRAND.getState",1000,function(){for(i=0;i<1000;i++){sink+=gs.getState().state[0];}});',
'out[out.length]=lane("ESRAND.clone",100,function(){for(i=0;i<100;i++){tmpR=cl.clone();}});',
'R.reseed("bench-default-facade");',
'out[out.length]=lane("facade.uint32",1000,function(){for(i=0;i<1000;i++){sink+=R.uint32();}});',
'R.reseed("bench-default-facade-random");',
'out[out.length]=lane("facade.random53",1000,function(){for(i=0;i<1000;i++){sink+=R.random();}});',
'R.reseed("bench-default-facade-int");',
'out[out.length]=lane("facade.int(0,999)",1000,function(){for(i=0;i<1000;i++){sink+=R.int(0,999);}});',
'({host:app.name+" "+app.version,engine:$.version,timer:T.describe(),lanes:out,sink:sink});'
].join('\n');
writeFileSync(probe,src);
var raw=call(['eval','--file',probe.replace(/\\/g,'/')]);
if(!raw){console.log('SKIP: benchmark eval unavailable');process.exit(2);}
var env=JSON.parse(raw.trim());
if(!env.ok||!env.result) throw new Error('benchmark failed '+JSON.stringify(env).slice(0,1000));
var report=env.result.result||env.result;
console.log('ESRAND live benchmark on '+report.host+' / ExtendScript '+report.engine+'; timer='+report.timer.lane);
for(var i=0;i<report.lanes.length;i++){var x=report.lanes[i];console.log(x.lane+': median '+x.medianUs+' us/batch; '+x.usPerOp+' us/op; n='+x.samples+' rej='+x.rejected);}
console.log(JSON.stringify(report));
