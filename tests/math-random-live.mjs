#!/usr/bin/env node
// Characterize native Math.random in live Illustrator without assuming its
// implementation. Timing is delegated exclusively to ESTIMER.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

var ROOT=dirname(fileURLToPath(import.meta.url)), PROJECT=join(ROOT,'..');
var TV=join(PROJECT,'..','estimer','dist','vendor-estimer.js');
var TOOL=join(PROJECT,'..','agent-skills','illustrator-com-automation-skill','comtool','ILLUSTRATOR_COM_TOOL.py');
if(!existsSync(TV)||!existsSync(TOOL)) throw new Error('ESTIMER build or COM tool missing');
function call(args){try{return execFileSync('python',[TOOL].concat(args),{encoding:'utf8',timeout:300000});}catch(e){return null;}}
var s=call(['status','--no-launch']);
if(!s){console.log('SKIP: Illustrator/COM unavailable');process.exit(2);}
var se;try{se=JSON.parse(s.trim());}catch(e){console.log('SKIP: invalid status');process.exit(2);}
if(!se.ok||!se.result||(se.result.Version&&se.result.Version._error)){console.log('SKIP: Illustrator/COM unavailable');process.exit(2);}

var tmp=join(process.env.TEMP||'.','esrand-live'), probe=join(tmp,'math-random-characterize.jsx');
mkdirSync(tmp,{recursive:true});
var tp=TV.replace(/\\/g,'/');
var src=[
'#target illustrator',
'$.evalFile(File("'+tp+'"));',
'var T=$.global.ESTIMER;T.prime();',
'var N=20000,a=[],i,x,min=1,max=0,bad=0,buckets=[],sink=0,grid32768Violations=0;',
'for(i=0;i<64;i++){buckets[i]=0;}',
'for(i=0;i<N;i++){x=Math.random();a[i]=x;if(x<min)min=x;if(x>max)max=x;if(!(x>=0&&x<1))bad++;if(x*32768!==Math.floor(x*32768))grid32768Violations++;buckets[Math.floor(x*64)]++;}',
'a.sort(function(p,q){return p-q;});',
'var unique=N?1:0,collisions=0,minSpacing=1;',
'for(i=1;i<N;i++){if(a[i]===a[i-1]){collisions++;}else{unique++;var d=a[i]-a[i-1];if(d<minSpacing)minSpacing=d;}}',
'var ss=T.samples(9,function(){for(i=0;i<10000;i++){sink+=Math.random();}},{warmup:5,collectRejected:true});',
'var st=T.stats(ss);',
'({host:app.name+" "+app.version,engine:$.version,n:N,unique:unique,collisions:collisions,',
' min:min,max:max,badRange:bad,minPositiveSpacing:minSpacing,grid32768Violations:grid32768Violations,buckets:buckets,',
' timing:{batch:10000,medianUs:st.median,minUs:st.min,p95Us:st.p95,samples:st.count,rejected:ss.rejected?ss.rejected.length:0},',
' timer:T.describe(),sink:sink});'
].join('\n');
writeFileSync(probe,src);
var raw=call(['eval','--file',probe.replace(/\\/g,'/')]);
if(!raw){console.log('SKIP: probe eval unavailable');process.exit(2);}
var env=JSON.parse(raw.trim());
if(!env.ok||!env.result) throw new Error('probe failed '+JSON.stringify(env).slice(0,1000));
var report=env.result.result||env.result;
console.log('Math.random live characterization: '+report.host+' / ExtendScript '+report.engine);
console.log('n='+report.n+' unique='+report.unique+' collisions='+report.collisions+' min='+report.min+' max='+report.max+' badRange='+report.badRange+' minPositiveSpacing='+report.minPositiveSpacing+' grid32768Violations='+report.grid32768Violations);
console.log('timing via ESTIMER: median '+report.timing.medianUs+' us / '+report.timing.batch+' calls');
console.log(JSON.stringify(report));
