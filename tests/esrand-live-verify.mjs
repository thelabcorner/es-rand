#!/usr/bin/env node
// Exact deterministic parity check in the real Illustrator ExtendScript engine.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createComToolRunner } from '../../extendscript-toolchain/src/comtool-compat.mjs';

var ROOT = dirname(fileURLToPath(import.meta.url));
var PROJECT = join(ROOT, '..');
var VENDOR = process.env.ESRAND_VENDOR_FILE ? join(PROJECT, process.env.ESRAND_VENDOR_FILE) : join(PROJECT, 'dist', 'vendor-esrand.js');
var ESM = join(PROJECT, 'dist', 'esrand-core.esm.mjs');
var COM = createComToolRunner();

if (!existsSync(VENDOR)) throw new Error('build first: ' + VENDOR);
if (!existsSync(ESM)) throw new Error('build first: ' + ESM);

async function runTool(args) {
  try {
    return await COM.runText(args, { timeoutMs: 300000 });
  } catch (e) {
    return null;
  }
}
function skip(message) {
  console.log('SKIP: ' + message);
  process.exit(2);
}

var statusRaw = await runTool(['status', '--no-launch']);
if (statusRaw === null) skip('Illustrator not reachable via COM');
var status;
try { status = JSON.parse(statusRaw.trim()); } catch (e) { skip('status output was not JSON'); }
var sv = status && status.result;
var unavailable = !status || !status.ok || !sv ||
  (sv.Name && sv.Name._error) || (sv.Version && sv.Version._error);
if (unavailable) skip('Illustrator/COM unavailable');

var R = await import(pathToFileURL(ESM).href + '?t=' + Date.now());

function nodeCase(seed) {
  var r = R.create(seed);
  var u = [], ints = [], random53 = [], sample, shuffled, bytes, hex, snap;
  for (var i = 0; i < 12; i++) u.push(r.uint32());
  for (var j = 0; j < 12; j++) ints.push(r.int(-1000, 1000));
  for (var k = 0; k < 6; k++) random53.push(Math.floor(r.random() * 9007199254740992));
  sample = r.sample(['a','b','c','d','e','f'], 4);
  shuffled = r.shuffled([0,1,2,3,4,5,6,7]);
  bytes = r.bytes(13);
  hex = r.hex(13);
  snap = r.getState();
  return { u, ints, random53, sample, shuffled, bytes, hex, snap };
}

var expected = {
  number: nodeCase(123456789),
  string: nodeCase('ESRAND/live/😀/v1'),
  array: nodeCase([0, 1, 4294967295, 123456789]),
  direct: [],
  jump: null,
  longJump: null
};
var direct = R.fromState([1,2,3,4]);
for (var d = 0; d < 16; d++) expected.direct.push(direct.uint32());
var jj = R.fromState([1,2,3,4]); jj.jump(); expected.jump = jj.getState();
var ll = R.fromState([1,2,3,4]); ll.longJump(); expected.longJump = ll.getState();

function nodeFastBulk() {
  var r32 = R.fromState([1,2,3,4]);
  var random32Words = [];
  for (var i = 0; i < 8; i++) random32Words.push(Math.floor(r32.random32() * 4294967296));

  var f32 = R.fromState([1,2,3,4]);
  var float32Words = [];
  for (var j = 0; j < 8; j++) float32Words.push(Math.floor(f32.float32(0, 1) * 4294967296));

  var u = R.fromState([1,2,3,4]), uOut = [];
  u.fillUint32(uOut, 17);

  var rr = R.fromState([1,2,3,4]), rOut = [];
  rr.fillRandom(rOut, 9);
  var r53 = [];
  for (var k = 0; k < rOut.length; k++) r53[k] = Math.floor(rOut[k] * 9007199254740992);

  var rr32 = R.fromState([1,2,3,4]), r32Out = [];
  rr32.fillRandom32(r32Out, 17);
  var r32Words = [];
  for (var m = 0; m < r32Out.length; m++) r32Words[m] = Math.floor(r32Out[m] * 4294967296);

  var bb = R.fromState([1,2,3,4]), bOut = [];
  bb.fillBytes(bOut, 19);

  var ff = R.fromState([1,2,3,4]), ffOut = [];
  ff.fillFloat(ffOut, -2.5, 9.25, 9);
  var ff53 = [];
  for (var ffI = 0; ffI < ffOut.length; ffI++) ff53[ffI] = Math.floor((ffOut[ffI] + 2.5) / 11.75 * 9007199254740992);

  var ff32 = R.fromState([1,2,3,4]), ff32Out = [];
  ff32.fillFloat32(ff32Out, 0, 1, 17);
  var ff32Words = [];
  for (var ff32I = 0; ff32I < ff32Out.length; ff32I++) ff32Words[ff32I] = Math.floor(ff32Out[ff32I] * 4294967296);

  var fbool = R.fromState([1,2,3,4]), fboolOut = [];
  fbool.fillBool(fboolOut, 17);
  var fchance = R.fromState([1,2,3,4]), fchanceOut = [];
  fchance.fillChance(fchanceOut, 0.25, 9);

  var fi = R.fromState([1,2,3,4]), fiOut = [];
  fi.fillInt(fiOut, -123, 987, 17);
  var fiLarge = R.fromState([1,2,3,4]), fiLargeOut = [];
  fiLarge.fillInt(fiLargeOut, 1000000000000, 1000000000999, 17);

  return {
    random32Words,
    random32State: r32.getState(),
    float32Words,
    float32State: f32.getState(),
    fillUint32: uOut,
    fillUint32State: u.getState(),
    fillRandom53: r53,
    fillRandomState: rr.getState(),
    fillRandom32Words: r32Words,
    fillRandom32State: rr32.getState(),
    fillBytes: bOut,
    fillBytesState: bb.getState(),
    fillFloat53: ff53,
    fillFloatState: ff.getState(),
    fillFloat32Words: ff32Words,
    fillFloat32State: ff32.getState(),
    fillBool: fboolOut,
    fillBoolState: fbool.getState(),
    fillChance: fchanceOut,
    fillChanceState: fchance.getState(),
    fillInt: fiOut,
    fillIntState: fi.getState(),
    fillIntLarge: fiLargeOut,
    fillIntLargeState: fiLarge.getState()
  };
}
expected.fastBulk = nodeFastBulk();

var tmp = join(process.env.TEMP || '.', 'esrand-live');
mkdirSync(tmp, { recursive: true });
var probe = join(tmp, 'esrand-live-verify.jsx');
var vp = VENDOR.replace(/\\/g, '/');
var source = [
  '#target illustrator',
  'try { $.global.ESRAND = void 0; } catch (clearError) {}',
  '$.evalFile(File("' + vp.replace(/"/g, '\\"') + '"));',
  'var R = $.global.ESRAND;',
  'function runCase(seed) {',
  '  var r=R.create(seed),u=[],ints=[],random53=[],i;',
  '  for(i=0;i<12;i++){u[u.length]=r.uint32();}',
  '  for(i=0;i<12;i++){ints[ints.length]=r.int(-1000,1000);}',
  '  for(i=0;i<6;i++){random53[random53.length]=Math.floor(r.random()*9007199254740992);}',
  '  return {u:u,ints:ints,random53:random53,sample:r.sample(["a","b","c","d","e","f"],4),',
  '    shuffled:r.shuffled([0,1,2,3,4,5,6,7]),bytes:r.bytes(13),hex:r.hex(13),snap:r.getState()};',
  '}',
  'var report={engine:$.version,host:app.name+" "+app.version,version:R.version(),algorithm:R.algorithm()};',
  'report.number=runCase(123456789);',
  'report.string=runCase("ESRAND/live/"+String.fromCharCode(0xd83d,0xde00)+"/v1");',
  'report.array=runCase([0,1,4294967295,123456789]);',
  'var dr=R.fromState([1,2,3,4]),du=[],i;for(i=0;i<16;i++){du[du.length]=dr.uint32();}report.direct=du;',
  'var jr=R.fromState([1,2,3,4]);jr.jump();report.jump=jr.getState();',
  'var lr=R.fromState([1,2,3,4]);lr.longJump();report.longJump=lr.getState();',
  'var fast={};',
  'var r32=R.fromState([1,2,3,4]),r32w=[];for(i=0;i<8;i++){r32w[r32w.length]=Math.floor(r32.random32()*4294967296);}fast.random32Words=r32w;fast.random32State=r32.getState();',
  'var f32=R.fromState([1,2,3,4]),f32w=[];for(i=0;i<8;i++){f32w[f32w.length]=Math.floor(f32.float32(0,1)*4294967296);}fast.float32Words=f32w;fast.float32State=f32.getState();',
  'var fu=R.fromState([1,2,3,4]),fuo=[];fu.fillUint32(fuo,17);fast.fillUint32=fuo;fast.fillUint32State=fu.getState();',
  'var fr=R.fromState([1,2,3,4]),fro=[],fr53=[];fr.fillRandom(fro,9);for(i=0;i<fro.length;i++){fr53[i]=Math.floor(fro[i]*9007199254740992);}fast.fillRandom53=fr53;fast.fillRandomState=fr.getState();',
  'var fr32=R.fromState([1,2,3,4]),fr32o=[],fr32w=[];fr32.fillRandom32(fr32o,17);for(i=0;i<fr32o.length;i++){fr32w[i]=Math.floor(fr32o[i]*4294967296);}fast.fillRandom32Words=fr32w;fast.fillRandom32State=fr32.getState();',
  'var fb=R.fromState([1,2,3,4]),fbo=[];fb.fillBytes(fbo,19);fast.fillBytes=fbo;fast.fillBytesState=fb.getState();',
  'var ff=R.fromState([1,2,3,4]),ffo=[],ff53=[];ff.fillFloat(ffo,-2.5,9.25,9);for(i=0;i<ffo.length;i++){ff53[i]=Math.floor((ffo[i]+2.5)/11.75*9007199254740992);}fast.fillFloat53=ff53;fast.fillFloatState=ff.getState();',
  'var ff32=R.fromState([1,2,3,4]),ff32o=[],ff32w=[];ff32.fillFloat32(ff32o,0,1,17);for(i=0;i<ff32o.length;i++){ff32w[i]=Math.floor(ff32o[i]*4294967296);}fast.fillFloat32Words=ff32w;fast.fillFloat32State=ff32.getState();',
  'var fbool=R.fromState([1,2,3,4]),fboolo=[];fbool.fillBool(fboolo,17);fast.fillBool=fboolo;fast.fillBoolState=fbool.getState();',
  'var fchance=R.fromState([1,2,3,4]),fchanceo=[];fchance.fillChance(fchanceo,0.25,9);fast.fillChance=fchanceo;fast.fillChanceState=fchance.getState();',
  'var fi=R.fromState([1,2,3,4]),fio=[];fi.fillInt(fio,-123,987,17);fast.fillInt=fio;fast.fillIntState=fi.getState();',
  'var fil=R.fromState([1,2,3,4]),filo=[];fil.fillInt(filo,1000000000000,1000000000999,17);fast.fillIntLarge=filo;fast.fillIntLargeState=fil.getState();report.fastBulk=fast;',
  '// Persistent-engine reload must preserve the same-version default stream.',
  'R.reseed("reload-preserve");R.uint32();var before=R.getState();',
  '$.evalFile(File("' + vp.replace(/"/g, '\\"') + '"));',
  'var R2=$.global.ESRAND;var after=R2.getState();',
  'report.reload={sameFacade:R===R2,before:before,after:after};',
  'report;'
].join('\n');
writeFileSync(probe, source);

var raw = await runTool(['eval', '--file', probe.replace(/\\/g, '/')]);
if (raw === null) skip('Illustrator became unavailable during eval');
var env;
try { env = JSON.parse(raw.trim()); } catch (e) { throw new Error('live output not JSON: ' + raw.slice(0,500)); }
if (!env || !env.ok || !env.result) throw new Error('live eval failed: ' + JSON.stringify(env).slice(0,1000));
var got = env.result.result || env.result;

var failures = 0, checks = 0;
function exact(name, a, b) {
  checks++;
  var ga=JSON.stringify(a), gb=JSON.stringify(b);
  if (ga !== gb) { failures++; console.error('FAIL ' + name + '\n engine=' + ga + '\n node=' + gb); }
  else console.log('ok   ' + name);
}
exact('version', got.version, R.version());
exact('algorithm', got.algorithm, R.algorithm());
exact('number seed vector', got.number, expected.number);
exact('string seed vector', got.string, expected.string);
exact('array seed vector', got.array, expected.array);
exact('direct-state vector', got.direct, expected.direct);
exact('jump state', got.jump, expected.jump);
exact('long-jump state', got.longJump, expected.longJump);
exact('fast/bulk API parity', got.fastBulk, expected.fastBulk);
exact('reload same facade', got.reload.sameFacade, true);
exact('reload preserves default state', got.reload.after, got.reload.before);

console.log('live-verify: ' + (checks-failures) + '/' + checks + ' exact groups on ' + got.host + ' / ExtendScript ' + got.engine);
if (failures) process.exit(1);
await COM.close();
