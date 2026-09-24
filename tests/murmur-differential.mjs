#!/usr/bin/env node
// Differential-check ESRAND's ES3-safe MurmurHash3 x86_128 translation against
// murmurhash3js 3.0.1 (independent JavaScript implementation).
import { buildSync } from 'esbuild';
import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import murmurModule from 'murmurhash3js';

var ROOT = dirname(fileURLToPath(import.meta.url));
var PROJECT = join(ROOT, '..');
var BUNDLE = join(ROOT, '.murmur128-test.bundle.mjs');

buildSync({
  entryPoints: [join(PROJECT, 'src', 'murmur128.ts')],
  outfile: BUNDLE,
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'es2019',
  logLevel: 'warning'
});

var core;
try {
  core = await import(pathToFileURL(BUNDLE).href + '?t=' + Date.now());
} finally {
  try { rmSync(BUNDLE); } catch (ignore) {}
}

var oracle = murmurModule.x86;
var checks = 0;

function hex32(value) {
  var s = (value >>> 0).toString(16);
  while (s.length < 8) s = '0' + s;
  return s;
}

function oursHex(bytes, seed) {
  var words = core.murmurHash3x86_128(bytes, seed);
  return hex32(words[0]) + hex32(words[1]) + hex32(words[2]) + hex32(words[3]);
}

function byteString(bytes) {
  var parts = [];
  for (var i = 0; i < bytes.length; i++) parts[i] = String.fromCharCode(bytes[i] & 255);
  return parts.join('');
}

function check(bytes, seed, label) {
  var got = oursHex(bytes, seed);
  var want = oracle.hash128(byteString(bytes), seed >>> 0);
  checks++;
  if (got !== want) {
    throw new Error('Murmur x86_128 differential mismatch ' + label +
      ' seed=' + (seed >>> 0) + ' got=' + got + ' want=' + want);
  }
}

// Every tail length and several complete block boundaries.
var seeds = [0, 1, 42, 0xffffffff];
for (var len = 0; len <= 80; len++) {
  var bytes = [];
  for (var i = 0; i < len; i++) bytes[i] = (i * 73 + len * 19 + 11) & 255;
  for (var s = 0; s < seeds.length; s++) {
    check(bytes, seeds[s], 'len=' + len);
  }
}

// Deterministic varied corpus up through 255-byte inputs.
var control = 0x9e3779b9 >>> 0;
function next() {
  control = (Math.imul(control, 1664525) + 1013904223) >>> 0;
  return control;
}
for (var c = 0; c < 1024; c++) {
  var n = next() & 255;
  var sample = [];
  for (var j = 0; j < n; j++) sample[j] = next() & 255;
  check(sample, next(), 'corpus=' + c);
}

/* Specialized exactly-8-byte/two-word path used by numeric ESRAND seeds. */
for (var tw = 0; tw < 1024; tw++) {
  var w0 = next();
  var w1 = next();
  var twSeed = next();
  var twBytes = [
    w0 & 255, (w0 >>> 8) & 255, (w0 >>> 16) & 255, (w0 >>> 24) & 255,
    w1 & 255, (w1 >>> 8) & 255, (w1 >>> 16) & 255, (w1 >>> 24) & 255
  ];
  var twWords = core.murmurHash3x86_128TwoWordsFast(w0, w1, twSeed);
  var twGot = hex32(twWords[0]) + hex32(twWords[1]) + hex32(twWords[2]) + hex32(twWords[3]);
  var twWant = oracle.hash128(byteString(twBytes), twSeed >>> 0);
  checks++;
  if (twGot !== twWant) {
    throw new Error('Murmur specialized two-word mismatch corpus=' + tw +
      ' seed=' + (twSeed >>> 0) + ' got=' + twGot + ' want=' + twWant);
  }
}

console.log('murmur-differential: ' + checks + '/' + checks +
  ' x86_128 vectors match murmurhash3js 3.0.1');
