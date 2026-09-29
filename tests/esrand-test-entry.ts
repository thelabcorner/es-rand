import * as ESRAND from '../src/index';
import { createGenerator } from '../src/generator';
import { fmix32, imul32 } from '../src/u32';
import { murmurHash3x86_128, murmurHash3x86_128Words, murmurHash3x86_128WordsFast, murmurHash3x86_128TwoWordsFast } from '../src/murmur128';
import { stateFromSeed } from '../src/seed';

var checks = 0;

function fail(message: string): never {
  throw new Error(message);
}
function ok(condition: boolean, message: string): void {
  checks++;
  if (!condition) { fail('FAIL: ' + message); }
}
function eq(actual: any, expected: any, message: string): void {
  checks++;
  if (actual !== expected) {
    fail('FAIL: ' + message + ' actual=' + String(actual) + ' expected=' + String(expected));
  }
}
function arrayEq(actual: any[], expected: any[], message: string): void {
  checks++;
  if (actual.length !== expected.length) {
    fail('FAIL: ' + message + ' length ' + actual.length + ' != ' + expected.length);
  }
  var i = 0;
  for (i = 0; i < actual.length; i++) {
    if (actual[i] !== expected[i]) {
      fail('FAIL: ' + message + '[' + i + '] actual=' + actual[i] + ' expected=' + expected[i]);
    }
  }
}
function throws(fn: () => void, message: string): void {
  checks++;
  var threw = false;
  try { fn(); } catch (e) { threw = true; }
  if (!threw) { fail('FAIL: expected throw: ' + message); }
}

// ---- exact 32-bit arithmetic -------------------------------------------------
var mulPairs: number[][] = [
  [0, 0], [1, 1], [-1, 5], [0x7fffffff, 0x7fffffff],
  [0x12345678, 0x9abcdef0], [0x85ebca6b, 0xc2b2ae35]
];
var mi = 0;
for (mi = 0; mi < mulPairs.length; mi++) {
  eq(imul32(mulPairs[mi][0], mulPairs[mi][1]), Math.imul(mulPairs[mi][0], mulPairs[mi][1]),
    'imul32 pair ' + mi);
}
eq(fmix32(0), 0, 'fmix32 zero');
eq(fmix32(1), 1364076727, 'fmix32 one');

// ---- MurmurHash3 x86_128 seed-expander reference -----------------------------
var murmurText = 'The quick brown fox jumps over the lazy dog';
var murmurBytes: number[] = [];
var mbi = 0;
for (mbi = 0; mbi < murmurText.length; mbi++) {
  murmurBytes[mbi] = murmurText.charCodeAt(mbi) & 255;
}
arrayEq(
  murmurHash3x86_128(murmurBytes, 42),
  [2965806105, 2986186183, 80168637, 3058683884],
  'MurmurHash3 x86_128 canonical ASCII vector, seed 42'
);

// Packed-word implementation must be byte-for-byte identical for every tail
// width, not merely for ESRAND's aligned seed formats.
var packedControl = 0x31415926 >>> 0;
var packedLen = 0;
for (packedLen = 0; packedLen <= 257; packedLen++) {
  var packedBytes: number[] = [];
  var packedWords: number[] = [];
  var packedI = 0;
  for (packedI = 0; packedI < packedLen; packedI++) {
    packedControl = (Math.imul(packedControl, 1664525) + 1013904223) >>> 0;
    packedBytes[packedI] = packedControl & 255;
  }
  for (packedI = 0; packedI < packedLen; packedI += 4) {
    packedWords[packedI >>> 2] =
      (packedBytes[packedI] || 0) |
      ((packedBytes[packedI + 1] || 0) << 8) |
      ((packedBytes[packedI + 2] || 0) << 16) |
      ((packedBytes[packedI + 3] || 0) << 24);
  }
  var packedExpected = murmurHash3x86_128(packedBytes, 0x45535231);
  arrayEq(
    murmurHash3x86_128Words(packedWords, packedLen, 0x45535231),
    packedExpected,
    'packed-word Murmur parity len ' + packedLen
  );
  arrayEq(
    murmurHash3x86_128WordsFast(packedWords, packedLen, 0x45535231),
    packedExpected,
    'fast packed-word Murmur parity len ' + packedLen
  );
}


// The numeric seed fast path precomputes the invariant half of the canonical
// 8-byte Murmur input. Differential it heavily against the independently
// verified generic two-word Murmur path so optimization cannot redefine seed v1.
var numericEdges: number[] = [
  0, 1, 2, 3, 0x7fffffff, 0x80000000, 0xffffffff,
  -1, -2147483648, 4294967296, 4294967297
];
var numericEdgeI = 0;
for (numericEdgeI = 0; numericEdgeI < numericEdges.length; numericEdgeI++) {
  var numericEdge = numericEdges[numericEdgeI];
  arrayEq(
    stateFromSeed(numericEdge),
    murmurHash3x86_128TwoWordsFast(0x4e554d31, numericEdge >>> 0, 0x45535231),
    'numeric seed specialization edge parity ' + numericEdgeI
  );
}

var numericControl = 0x8badf00d >>> 0;
var numericDiffI = 0;
for (numericDiffI = 0; numericDiffI < 4096; numericDiffI++) {
  numericControl = (Math.imul(numericControl, 1664525) + 1013904223) >>> 0;
  arrayEq(
    stateFromSeed(numericControl),
    murmurHash3x86_128TwoWordsFast(0x4e554d31, numericControl, 0x45535231),
    'numeric seed specialization differential ' + numericDiffI
  );
}

// ---- official xoshiro128** transition vector ---------------------------------
var DIRECT_VECTOR = [
  11520, 0, 5927040, 70819200, 2031721883, 1637235492, 1287239034, 3734860849,
  3729100597, 4258142804, 337829053, 2142557243, 3576906021, 2006103318,
  3870238204, 1001584594
];
var direct = createGenerator([1, 2, 3, 4]);
var gotDirect: number[] = [];
var di = 0;
for (di = 0; di < DIRECT_VECTOR.length; di++) { gotDirect[di] = direct.uint32(); }
arrayEq(gotDirect, DIRECT_VECTOR, 'official direct-state sequence');
arrayEq(direct.getState().state, [3896252747, 3078720449, 4211953846, 2204746457],
  'direct-state after 16 outputs');

// ---- jump compatibility vectors ----------------------------------------------
var j = createGenerator([1, 2, 3, 4]);
j.jump();
arrayEq(j.getState().state, [2843103750, 2038079848, 1533207345, 44816753], 'jump state');
var lj = createGenerator([1, 2, 3, 4]);
lj.longJump();
arrayEq(lj.getState().state, [1611968294, 2125834322, 966769569, 3193880526], 'long-jump state');
var parent = createGenerator([1, 2, 3, 4]);
var child = parent.split();
arrayEq(child.getState().state, [1, 2, 3, 4], 'split child starts at old stream');
arrayEq(parent.getState().state, [2843103750, 2038079848, 1533207345, 44816753],
  'split parent advances one jump');

// ---- seed contract ------------------------------------------------------------
var n1 = ESRAND.create(123);
var n2 = ESRAND.create(123);
arrayEq(n1.getState().state, n2.getState().state, 'same number seed same state');
arrayEq(n1.getState().state, [1604660843, 2510828337, 964734574, 964734574],
  'seed-v1 exact number 123 state');
arrayEq(ESRAND.create(1).getState().state, ESRAND.create(4294967297).getState().state,
  'number seeds are uint32-coerced');
var s1 = ESRAND.create('123').getState().state;
var a1 = ESRAND.create([123]).getState().state;
arrayEq(s1, [2957135175, 1152585253, 2022154496, 3337130485],
  'seed-v1 exact string 123 state');
arrayEq(a1, [2244451748, 740288386, 1328232223, 1956291222],
  'seed-v1 exact array [123] state');
arrayEq(ESRAND.create('ESRAND/live/\ud83d\ude00/v1').getState().state,
  [355915573, 1671291314, 3711997821, 2963243300],
  'seed-v1 exact UTF-16 surrogate-pair state');
ok(JSON.stringify(n1.getState().state) !== JSON.stringify(s1), 'number and string seed domains differ');
ok(JSON.stringify(n1.getState().state) !== JSON.stringify(a1), 'number and array seed domains differ');
ok(JSON.stringify(s1) !== JSON.stringify(a1), 'string and array seed domains differ');
arrayEq(ESRAND.create('\ud83d\ude00').getState().state, ESRAND.create('\ud83d\ude00').getState().state,
  'UTF-16 surrogate seed deterministic');
throws(function (): void { ESRAND.create(NaN); }, 'NaN seed rejected');
throws(function (): void { ESRAND.create([1, Infinity]); }, 'non-finite array seed rejected');

// ---- snapshots / cloning ------------------------------------------------------
var r = ESRAND.create('snapshot');
r.uint32();
r.random();
var snap = r.getState();
var restored = ESRAND.fromState(snap);
eq(r.uint32(), restored.uint32(), 'snapshot resumes exact next output');
var csrc = ESRAND.create('clone');
csrc.uint32();
var clone = csrc.clone();
var ci = 0;
for (ci = 0; ci < 20; ci++) { eq(csrc.uint32(), clone.uint32(), 'clone parity ' + ci); }
throws(function (): void { ESRAND.fromState([0, 0, 0, 0]); }, 'all-zero state rejected');
throws(function (): void {
  ESRAND.fromState({ algorithm: 'other', algorithmVersion: 1, seedVersion: 1, state: [1, 2, 3, 4] });
}, 'wrong algorithm snapshot rejected');
throws(function (): void {
  ESRAND.fromState({ algorithm: 'xoshiro128**', algorithmVersion: 1, seedVersion: 2, state: [1, 2, 3, 4] });
}, 'wrong seed version rejected');

// ---- scalar generation --------------------------------------------------------
var ranges = ESRAND.create('ranges');
var ri = 0;
for (ri = 0; ri < 10000; ri++) {
  var f = ranges.random();
  ok(f >= 0 && f < 1, 'random range ' + ri);
}
var consumeA = createGenerator([1, 2, 3, 4]);
var consumeB = createGenerator([1, 2, 3, 4]);
consumeA.random();
consumeB.uint32();
consumeB.uint32();
arrayEq(consumeA.getState().state, consumeB.getState().state, 'random consumes exactly two uint32 outputs');

var random32A = createGenerator([1, 2, 3, 4]);
var random32B = createGenerator([1, 2, 3, 4]);
eq(random32A.random32(), random32B.uint32() / 4294967296, 'random32 maps one uint32 exactly');
arrayEq(random32A.getState().state, random32B.getState().state, 'random32 consumes exactly one uint32 output');
for (ri = 0; ri < 1000; ri++) {
  var r32v = random32A.random32();
  ok(r32v >= 0 && r32v < 1, 'random32 range ' + ri);
}

var floats = ESRAND.create('floats');
eq(floats.float(5, 5), 5, 'equal float bounds return bound');
for (ri = 0; ri < 1000; ri++) {
  var fv = floats.float(-2.5, 9.25);
  ok(fv >= -2.5 && fv < 9.25, 'float range ' + ri);
}
throws(function (): void { floats.float(2, 1); }, 'reversed float bounds rejected');
throws(function (): void { floats.float(-1e308, 1e308); }, 'overflowing float span rejected');

var floats32 = createGenerator([1, 2, 3, 4]);
var float32Scalar = createGenerator([1, 2, 3, 4]);
eq(floats32.float32(-2.5, 9.25),
  -2.5 + 11.75 * (float32Scalar.uint32() / 4294967296),
  'float32 uses one uint32 fraction');
arrayEq(floats32.getState().state, float32Scalar.getState().state, 'float32 consumes one uint32 output');
var float32Singleton = createGenerator([1, 2, 3, 4]);
var float32Before = float32Singleton.getState();
eq(float32Singleton.float32(7, 7), 7, 'float32 equal bounds return bound');
arrayEq(float32Singleton.getState().state, float32Before.state, 'float32 equal bounds consume no state');
throws(function (): void { floats32.float32(2, 1); }, 'reversed float32 bounds rejected');
throws(function (): void { floats32.float32(-1e308, 1e308); }, 'overflowing float32 span rejected');

var ints = ESRAND.create('ints');
for (ri = 0; ri < 10000; ri++) {
  var iv = ints.int(-13, 29);
  ok(iv >= -13 && iv <= 29 && Math.floor(iv) === iv, 'int range ' + ri);
}
var singleton = createGenerator([1, 2, 3, 4]);
var singletonBefore = singleton.getState();
eq(singleton.int(7, 7), 7, 'singleton int returns sole value');
arrayEq(singleton.getState().state, singletonBefore.state, 'singleton int consumes no state');
var oneChoice = createGenerator([1, 2, 3, 4]);
var oneChoiceBefore = oneChoice.getState();
eq(oneChoice.choice(['only']), 'only', 'singleton choice returns sole value');
arrayEq(oneChoice.getState().state, oneChoiceBefore.state, 'singleton choice consumes no state');
var full = createGenerator([1, 2, 3, 4]);
eq(full.int(0, 4294967295), 11520, 'full uint32-width int consumes exact uint32');
var offset = createGenerator([1, 2, 3, 4]);
eq(offset.int(1000000000000, 1004294967295), 1000000011520, 'safe-integer offset 2^32-width');
throws(function (): void { ints.int(0, 4294967296); }, 'range wider than 2^32 rejected');
throws(function (): void { ints.int(1.5, 2); }, 'fractional int bound rejected');

var bits = ESRAND.create('bool');
for (ri = 0; ri < 1000; ri++) {
  ok(typeof bits.bool() === 'boolean', 'bool type ' + ri);
}
var p0 = ESRAND.create('chance');
eq(p0.chance(0), false, 'chance zero');
eq(p0.chance(1), true, 'chance one');
throws(function (): void { p0.chance(-0.01); }, 'chance below zero rejected');
throws(function (): void { p0.chance(1.01); }, 'chance above one rejected');

// ---- collection sampling ------------------------------------------------------
var col = ESRAND.create('collections');
var values = ['a', 'b', 'c', 'd', 'e'];
for (ri = 0; ri < 500; ri++) {
  var picked = col.choice(values);
  ok(picked === 'a' || picked === 'b' || picked === 'c' || picked === 'd' || picked === 'e',
    'choice member ' + ri);
}
throws(function (): void { col.choice([]); }, 'choice empty rejected');
var sample = col.sample(values, 5);
eq(sample.length, 5, 'sample length');
var seen: any = {};
for (ri = 0; ri < sample.length; ri++) {
  ok(!seen[sample[ri]], 'sample unique ' + ri);
  seen[sample[ri]] = true;
}
throws(function (): void { col.sample(values, 6); }, 'sample count > length rejected');
arrayEq(col.sample(values, 0), [], 'zero sample');

// Exact dense reference for the historical partial-Fisher-Yates contract.
// sample() may optimize storage, but it must remain sequence/state equivalent.
function denseSampleReference(rng: any, source: any, count: number): any[] {
  var pool: any[] = [];
  var outRef: any[] = [];
  var refI = 0;
  var refJ = 0;
  var refTemp: any;
  for (refI = 0; refI < source.length; refI++) {
    pool[refI] = source[refI];
  }
  for (refI = 0; refI < count; refI++) {
    refJ = rng.int(refI, source.length - 1);
    refTemp = pool[refI];
    pool[refI] = pool[refJ];
    pool[refJ] = refTemp;
    outRef[refI] = pool[refI];
  }
  return outRef;
}

var sampleParitySizes = [8, 64, 1000];
var sampleParityCounts = [8, 8, 37];
for (var spi = 0; spi < sampleParitySizes.length; spi++) {
  var spn = sampleParitySizes[spi];
  var spk = sampleParityCounts[spi];
  var spValues: any[] = [];
  for (var spv = 0; spv < spn; spv++) {
    spValues[spv] = (spv % 11 === 0) ? 'dup' : spv;
  }
  var sparseRng = createGenerator([0x12345678, 0x9abcdef0, 0x0badcafe, (spi + 1) >>> 0]);
  var denseRng = sparseRng.clone();
  var sparseOut = sparseRng.sample(spValues, spk);
  var denseOut = denseSampleReference(denseRng, spValues, spk);
  arrayEq(sparseOut, denseOut, 'sample dense-reference parity n=' + spn + ' k=' + spk);
  arrayEq(sparseRng.getState().state, denseRng.getState().state,
    'sample dense-reference state parity n=' + spn + ' k=' + spk);
}

var holey: any[] = [];
holey.length = 64;
for (var hi = 0; hi < 64; hi += 3) { holey[hi] = 'v' + hi; }
var sparseHoles = createGenerator([9, 8, 7, 6]);
var denseHoles = sparseHoles.clone();
arrayEq(sparseHoles.sample(holey, 24), denseSampleReference(denseHoles, holey, 24),
  'sample sparse-array hole parity');
arrayEq(sparseHoles.getState().state, denseHoles.getState().state,
  'sample sparse-array hole state parity');

var input = [1, 2, 3, 4, 5, 6];
var copyBefore = input.slice(0);
var sh = col.shuffled(input);
arrayEq(input, copyBefore, 'shuffled does not mutate source');
eq(sh.length, input.length, 'shuffled length');
var mut = [1, 2, 3, 4, 5, 6];
var sameRef = col.shuffle(mut);
ok(sameRef === mut, 'shuffle returns same array');
var sorted = mut.slice(0);
sorted.sort(function (a: number, b: number): number { return a - b; });
arrayEq(sorted, [1, 2, 3, 4, 5, 6], 'shuffle preserves multiset');

// ---- bytes and hex ------------------------------------------------------------
var raw = createGenerator([1, 2, 3, 4]);
arrayEq(raw.bytes(10), [0, 45, 0, 0, 0, 0, 0, 0, 128, 112], 'bytes little-endian packing');
var rawHex = createGenerator([1, 2, 3, 4]);
eq(rawHex.hex(10), '002d0000000000008070', 'hex byte encoding');
eq(rawHex.bytes(0).length, 0, 'zero bytes');
throws(function (): void { rawHex.bytes(-1); }, 'negative byte count rejected');

// ---- bulk/fill equivalence ----------------------------------------------------
var fillU = createGenerator([1, 2, 3, 4]);
var scalarU = createGenerator([1, 2, 3, 4]);
var fillUOut: number[] = [];
ok(fillU.fillUint32(fillUOut, 64) === fillUOut, 'fillUint32 returns target');
var scalarUOut: number[] = [];
for (ri = 0; ri < 64; ri++) { scalarUOut[ri] = scalarU.uint32(); }
arrayEq(fillUOut, scalarUOut, 'fillUint32 exact scalar parity');
arrayEq(fillU.getState().state, scalarU.getState().state, 'fillUint32 state parity');

var fillR = createGenerator([1, 2, 3, 4]);
var scalarR = createGenerator([1, 2, 3, 4]);
var fillROut: number[] = [];
fillR.fillRandom(fillROut, 32);
var scalarROut: number[] = [];
for (ri = 0; ri < 32; ri++) { scalarROut[ri] = scalarR.random(); }
arrayEq(fillROut, scalarROut, 'fillRandom exact scalar parity');
arrayEq(fillR.getState().state, scalarR.getState().state, 'fillRandom state parity');

var fillR32 = createGenerator([1, 2, 3, 4]);
var scalarR32 = createGenerator([1, 2, 3, 4]);
var fillR32Out: number[] = [];
fillR32.fillRandom32(fillR32Out, 64);
var scalarR32Out: number[] = [];
for (ri = 0; ri < 64; ri++) { scalarR32Out[ri] = scalarR32.random32(); }
arrayEq(fillR32Out, scalarR32Out, 'fillRandom32 exact scalar parity');
arrayEq(fillR32.getState().state, scalarR32.getState().state, 'fillRandom32 state parity');

var fillF = createGenerator([1, 2, 3, 4]);
var scalarF = createGenerator([1, 2, 3, 4]);
var fillFOut: number[] = [];
fillF.fillFloat(fillFOut, -2.5, 9.25, 32);
var scalarFOut: number[] = [];
for (ri = 0; ri < 32; ri++) { scalarFOut[ri] = scalarF.float(-2.5, 9.25); }
arrayEq(fillFOut, scalarFOut, 'fillFloat exact scalar parity');
arrayEq(fillF.getState().state, scalarF.getState().state, 'fillFloat state parity');

var fillF32 = createGenerator([1, 2, 3, 4]);
var scalarF32 = createGenerator([1, 2, 3, 4]);
var fillF32Out: number[] = [];
fillF32.fillFloat32(fillF32Out, -2.5, 9.25, 64);
var scalarF32Out: number[] = [];
for (ri = 0; ri < 64; ri++) { scalarF32Out[ri] = scalarF32.float32(-2.5, 9.25); }
arrayEq(fillF32Out, scalarF32Out, 'fillFloat32 exact scalar parity');
arrayEq(fillF32.getState().state, scalarF32.getState().state, 'fillFloat32 state parity');

var fillBoolRng = createGenerator([1, 2, 3, 4]);
var scalarBoolRng = createGenerator([1, 2, 3, 4]);
var fillBoolOut: boolean[] = [];
fillBoolRng.fillBool(fillBoolOut, 64);
var scalarBoolOut: boolean[] = [];
for (ri = 0; ri < 64; ri++) { scalarBoolOut[ri] = scalarBoolRng.bool(); }
arrayEq(fillBoolOut as any[], scalarBoolOut as any[], 'fillBool exact scalar parity');
arrayEq(fillBoolRng.getState().state, scalarBoolRng.getState().state, 'fillBool state parity');

var fillChanceRng = createGenerator([1, 2, 3, 4]);
var scalarChanceRng = createGenerator([1, 2, 3, 4]);
var fillChanceOut: boolean[] = [];
fillChanceRng.fillChance(fillChanceOut, 0.25, 32);
var scalarChanceOut: boolean[] = [];
for (ri = 0; ri < 32; ri++) { scalarChanceOut[ri] = scalarChanceRng.chance(0.25); }
arrayEq(fillChanceOut as any[], scalarChanceOut as any[], 'fillChance exact scalar parity');
arrayEq(fillChanceRng.getState().state, scalarChanceRng.getState().state, 'fillChance state parity');

var fillFSame = createGenerator([1, 2, 3, 4]);
var fillFSameBefore = fillFSame.getState();
var fillFSameOut: number[] = [];
fillFSame.fillFloat(fillFSameOut, 7, 7, 8);
arrayEq(fillFSameOut, [7, 7, 7, 7, 7, 7, 7, 7], 'fillFloat equal bounds');
arrayEq(fillFSame.getState().state, fillFSameBefore.state, 'fillFloat equal bounds consume no state');

var chanceZeroFill = createGenerator([1, 2, 3, 4]);
var chanceZeroScalar = createGenerator([1, 2, 3, 4]);
var chanceZeroOut: boolean[] = [];
chanceZeroFill.fillChance(chanceZeroOut, 0, 8);
var chanceZeroExpected: boolean[] = [];
for (ri = 0; ri < 8; ri++) { chanceZeroExpected[ri] = chanceZeroScalar.chance(0); }
arrayEq(chanceZeroOut as any[], chanceZeroExpected as any[], 'fillChance zero parity');
arrayEq(chanceZeroFill.getState().state, chanceZeroScalar.getState().state,
  'fillChance zero still consumes scalar-equivalent state');

var chanceOneFill = createGenerator([1, 2, 3, 4]);
var chanceOneScalar = createGenerator([1, 2, 3, 4]);
var chanceOneOut: boolean[] = [];
chanceOneFill.fillChance(chanceOneOut, 1, 8);
var chanceOneExpected: boolean[] = [];
for (ri = 0; ri < 8; ri++) { chanceOneExpected[ri] = chanceOneScalar.chance(1); }
arrayEq(chanceOneOut as any[], chanceOneExpected as any[], 'fillChance one parity');
arrayEq(chanceOneFill.getState().state, chanceOneScalar.getState().state,
  'fillChance one still consumes scalar-equivalent state');

throws(function (): void { fillF.fillFloat([], 2, 1, 1); }, 'fillFloat reversed bounds rejected');
throws(function (): void { fillF32.fillFloat32([], -1e308, 1e308, 1); }, 'fillFloat32 overflow span rejected');
throws(function (): void { fillChanceRng.fillChance([], -0.01, 1); }, 'fillChance below zero rejected');
throws(function (): void { fillChanceRng.fillChance([], 1.01, 1); }, 'fillChance above one rejected');

var fillB = createGenerator([1, 2, 3, 4]);
var scalarB = createGenerator([1, 2, 3, 4]);
var fillBOut: number[] = [];
fillB.fillBytes(fillBOut, 67);
arrayEq(fillBOut, scalarB.bytes(67), 'fillBytes exact bytes parity');
arrayEq(fillB.getState().state, scalarB.getState().state, 'fillBytes state parity');

var fillI = createGenerator([1, 2, 3, 4]);
var scalarI = createGenerator([1, 2, 3, 4]);
var fillIOut: number[] = [];
fillI.fillInt(fillIOut, -123, 987, 64);
var scalarIOut: number[] = [];
for (ri = 0; ri < 64; ri++) { scalarIOut[ri] = scalarI.int(-123, 987); }
arrayEq(fillIOut, scalarIOut, 'fillInt exact scalar parity');
arrayEq(fillI.getState().state, scalarI.getState().state, 'fillInt state parity');

var fillIPow2 = createGenerator([1, 2, 3, 4]);
var scalarIPow2 = createGenerator([1, 2, 3, 4]);
var fillIPow2Out: number[] = [];
fillIPow2.fillInt(fillIPow2Out, -512, 511, 64);
var scalarIPow2Out: number[] = [];
for (ri = 0; ri < 64; ri++) { scalarIPow2Out[ri] = scalarIPow2.int(-512, 511); }
arrayEq(fillIPow2Out, scalarIPow2Out, 'fillInt power-of-two parity');
arrayEq(fillIPow2.getState().state, scalarIPow2.getState().state, 'fillInt power-of-two state parity');

var fillILarge = createGenerator([1, 2, 3, 4]);
var scalarILarge = createGenerator([1, 2, 3, 4]);
var fillILargeOut: number[] = [];
fillILarge.fillInt(fillILargeOut, 1000000000000, 1000000000999, 64);
var scalarILargeOut: number[] = [];
for (ri = 0; ri < 64; ri++) {
  scalarILargeOut[ri] = scalarILarge.int(1000000000000, 1000000000999);
}
arrayEq(fillILargeOut, scalarILargeOut, 'fillInt large-offset parity');
arrayEq(fillILarge.getState().state, scalarILarge.getState().state, 'fillInt large-offset state parity');

var fillIFull = createGenerator([1, 2, 3, 4]);
var scalarIFull = createGenerator([1, 2, 3, 4]);
var fillIFullOut: number[] = [];
fillIFull.fillInt(fillIFullOut, 0, 4294967295, 17);
var scalarIFullOut: number[] = [];
for (ri = 0; ri < 17; ri++) { scalarIFullOut[ri] = scalarIFull.int(0, 4294967295); }
arrayEq(fillIFullOut, scalarIFullOut, 'fillInt full-u32-width parity');
arrayEq(fillIFull.getState().state, scalarIFull.getState().state, 'fillInt full-u32-width state parity');

var fillISingle = createGenerator([1, 2, 3, 4]);
var fillISingleBefore = fillISingle.getState();
var fillISingleOut: number[] = [];
fillISingle.fillInt(fillISingleOut, 7, 7, 8);
arrayEq(fillISingleOut, [7, 7, 7, 7, 7, 7, 7, 7], 'fillInt singleton range');
arrayEq(fillISingle.getState().state, fillISingleBefore.state, 'fillInt singleton consumes no state');

var fillIDefaultTarget: number[] = new Array(9);
var fillIDefault = createGenerator([1, 2, 3, 4]);
var scalarIDefault = createGenerator([1, 2, 3, 4]);
fillIDefault.fillInt(fillIDefaultTarget, 10, 20);
var fillIDefaultExpected: number[] = [];
for (ri = 0; ri < 9; ri++) { fillIDefaultExpected[ri] = scalarIDefault.int(10, 20); }
arrayEq(fillIDefaultTarget, fillIDefaultExpected, 'fillInt count defaults to target length');
arrayEq(fillIDefault.getState().state, scalarIDefault.getState().state, 'fillInt default-count state parity');

throws(function (): void { fillI.fillInt([], 2, 1, 1); }, 'fillInt reversed bounds rejected');
throws(function (): void { fillI.fillInt([], 0.5, 2, 1); }, 'fillInt fractional bound rejected');
throws(function (): void { fillI.fillInt([], 0, 4294967296, 1); }, 'fillInt range wider than 2^32 rejected');

var preallocated: number[] = new Array(8);
var defaultCountRng = createGenerator([1, 2, 3, 4]);
var defaultCountScalar = createGenerator([1, 2, 3, 4]);
defaultCountRng.fillUint32(preallocated);
var defaultExpected: number[] = [];
for (ri = 0; ri < 8; ri++) { defaultExpected[ri] = defaultCountScalar.uint32(); }
arrayEq(preallocated, defaultExpected, 'fill count defaults to target length');

var zeroFill = createGenerator([1, 2, 3, 4]);
var zeroFillBefore = zeroFill.getState();
var zeroTarget: number[] = [];
zeroFill.fillRandom(zeroTarget, 0);
arrayEq(zeroFill.getState().state, zeroFillBefore.state, 'zero fill consumes no state');
throws(function (): void { fillU.fillUint32(null as any, 1); }, 'fill null target rejected');
throws(function (): void { fillU.fillUint32([], -1); }, 'negative fill count rejected');

// ---- metadata / facade --------------------------------------------------------
  eq(ESRAND.version(), '0.2.0', 'package version');
var alg = ESRAND.algorithm();
eq(alg.id, 'xoshiro128**', 'algorithm id');
eq(alg.version, 1, 'algorithm version');
eq(alg.seedVersion, 1, 'seed contract version');
eq(alg.stateBits, 128, 'state bits');
eq(alg.cryptographic, false, 'non-cryptographic declaration');
eq(ESRAND.capabilities().deterministic, true, 'capabilities deterministic');
eq(ESRAND.capabilities().cryptographic, false, 'capabilities non-crypto');

console.log('esrand-test: ' + checks + ' assertions passed');
