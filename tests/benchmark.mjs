#!/usr/bin/env node
// Node reference benchmark. ESTIMER is the sole timing authority so this
// follows the same prime/sample/rejection protocol as live ExtendScript.
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

var ROOT = dirname(fileURLToPath(import.meta.url));
var PROJECT = join(ROOT, '..');
var ESRAND_ESM = join(PROJECT, 'dist', 'esrand-core.esm.mjs');
var ESTIMER_ESM = join(PROJECT, '..', 'estimer', 'dist', 'estimer-core.esm.mjs');

if (!existsSync(ESRAND_ESM)) throw new Error('build ESRAND first');
if (!existsSync(ESTIMER_ESM)) throw new Error('ESTIMER build missing: ' + ESTIMER_ESM);

var R = await import(pathToFileURL(ESRAND_ESM).href);
var T = await import(pathToFileURL(ESTIMER_ESM).href);
T.setSource();
T.prime();

function bench(name, batch, fn) {
  var samples = T.samples(9, fn, { warmup: 5, collectRejected: true });
  var st = T.stats(samples);
  return {
    lane: name,
    batch,
    medianUs: st.median,
    minUs: st.min,
    p95Us: st.p95,
    nsPerOp: st.median * 1000 / batch,
    samples: st.count,
    rejected: samples.rejected ? samples.rejected.length : 0
  };
}

var u = R.create('bench-u32');
var f = R.create('bench-float');
var ir = R.create('bench-int');
var sr = R.create('bench-shuffle');
var br = R.create('bench-bytes');
var sink = 0;
var lanes = [];

lanes.push(bench('Math.random', 10000, function () {
  var i; for (i = 0; i < 10000; i++) sink += Math.random();
}));
lanes.push(bench('ESRAND.uint32', 10000, function () {
  var i; for (i = 0; i < 10000; i++) sink += u.uint32();
}));
lanes.push(bench('ESRAND.random53', 10000, function () {
  var i; for (i = 0; i < 10000; i++) sink += f.random();
}));
lanes.push(bench('ESRAND.int(0,999)', 10000, function () {
  var i; for (i = 0; i < 10000; i++) sink += ir.int(0, 999);
}));
lanes.push(bench('ESRAND.shuffle(64)', 200, function () {
  var k, i, a;
  for (k = 0; k < 200; k++) {
    a = []; for (i = 0; i < 64; i++) a[i] = i;
    sr.shuffle(a); sink += a[0];
  }
}));
lanes.push(bench('ESRAND.bytes(64)', 1000, function () {
  var i; for (i = 0; i < 1000; i++) sink += br.bytes(64)[0];
}));

console.log('ESRAND benchmark — Node lane timed exclusively through ESTIMER (' + T.lane() + ')');
console.log('lane                     medianUs    ns/op      n  rej');
for (var li = 0; li < lanes.length; li++) {
  var x = lanes[li];
  console.log(
    (x.lane + '                         ').slice(0, 25) + ' ' +
    x.medianUs.toFixed(2).padStart(9) + ' ' +
    x.nsPerOp.toFixed(2).padStart(9) + ' ' +
    String(x.samples).padStart(6) + ' ' + String(x.rejected).padStart(4)
  );
}
console.log('sink=' + sink);
console.log(JSON.stringify({ timer: T.describe(), lanes: lanes }));
