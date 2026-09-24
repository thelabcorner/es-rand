import * as ESRAND from '../src/index';

var checks = 0;
function assert(condition: boolean, message: string): void {
  checks++;
  if (!condition) { throw new Error('statistical smoke failure: ' + message); }
}

// These deterministic smoke checks are defect detectors, not proofs of
// randomness and emphatically not cryptographic certification.
var N = 262144;
var rng = ESRAND.create('ESRAND statistical smoke v1');
var ones: number[] = [];
var buckets: number[] = [];
var i = 0;
var b = 0;
for (b = 0; b < 32; b++) { ones[b] = 0; }
for (b = 0; b < 256; b++) { buckets[b] = 0; }

var prev = 0;
var havePrev = false;
var serialNumerator = 0;
var mean = 2147483647.5;
var serialDenominator = 0;
for (i = 0; i < N; i++) {
  var x = rng.uint32();
  buckets[x >>> 24]++;
  for (b = 0; b < 32; b++) {
    if ((x & (1 << b)) !== 0) { ones[b]++; }
  }
  var centered = x - mean;
  serialDenominator += centered * centered;
  if (havePrev) {
    serialNumerator += (prev - mean) * centered;
  }
  prev = x;
  havePrev = true;
}

var expectedOnes = N / 2;
for (b = 0; b < 32; b++) {
  // 1.5% is far wider than the binomial sigma at this N; deterministic and
  // intentionally conservative so this catches broken bits, not normal noise.
  assert(Math.abs(ones[b] - expectedOnes) <= N * 0.015, 'bit ' + b + ' balance=' + ones[b]);
}

var expectedBucket = N / 256;
for (b = 0; b < 256; b++) {
  assert(Math.abs(buckets[b] - expectedBucket) <= 180, 'top-byte bucket ' + b + '=' + buckets[b]);
}

var corr = serialNumerator / serialDenominator;
assert(Math.abs(corr) < 0.02, 'serial correlation=' + corr);

// Unbiased bounded-int smoke.
var DRAWS = 100000;
var ten: number[] = [];
for (i = 0; i < 10; i++) { ten[i] = 0; }
var irng = ESRAND.create('bounded int smoke');
for (i = 0; i < DRAWS; i++) { ten[irng.int(0, 9)]++; }
for (i = 0; i < 10; i++) {
  assert(Math.abs(ten[i] - DRAWS / 10) <= 500, 'int bucket ' + i + '=' + ten[i]);
}

// Fisher-Yates position smoke: one marker should visit all five positions with
// roughly equal frequency.
var SHUFFLES = 50000;
var positions: number[] = [0, 0, 0, 0, 0];
var srng = ESRAND.create('shuffle position smoke');
for (i = 0; i < SHUFFLES; i++) {
  var a = [0, 1, 2, 3, 4];
  srng.shuffle(a);
  var p = 0;
  for (p = 0; p < a.length; p++) {
    if (a[p] === 0) { positions[p]++; break; }
  }
}
for (i = 0; i < 5; i++) {
  assert(Math.abs(positions[i] - SHUFFLES / 5) <= 500, 'shuffle position ' + i + '=' + positions[i]);
}

// Seed-expander avalanche smoke across adjacent uint32 seeds. This specifically
// guards against reintroducing a weak "small seed -> visibly related state"
// initializer. For a 128-bit hash-like avalanche, adjacent inputs should flip
// about half the output bits on average.
function popcount32(value: number): number {
  var x = value >>> 0;
  x = x - ((x >>> 1) & 0x55555555);
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

var seedPairs = 8192;
var seedDistanceSum = 0;
var seedDistanceMin = 129;
var seedDistanceMax = 0;
var priorState = ESRAND.create(0).getState().state;
var seenStates: any = {};
seenStates[priorState.join(',')] = true;
for (i = 0; i < seedPairs; i++) {
  var nextState = ESRAND.create(i + 1).getState().state;
  var distance = 0;
  for (b = 0; b < 4; b++) {
    distance += popcount32((priorState[b] ^ nextState[b]) >>> 0);
  }
  seedDistanceSum += distance;
  if (distance < seedDistanceMin) { seedDistanceMin = distance; }
  if (distance > seedDistanceMax) { seedDistanceMax = distance; }
  assert(!seenStates[nextState.join(',')], 'no duplicate state in adjacent-seed census at ' + (i + 1));
  seenStates[nextState.join(',')] = true;
  priorState = nextState;
}
var seedDistanceMean = seedDistanceSum / seedPairs;
assert(seedDistanceMean >= 60 && seedDistanceMean <= 68,
  'adjacent-seed mean Hamming distance=' + seedDistanceMean);
assert(seedDistanceMin >= 30, 'adjacent-seed minimum Hamming distance=' + seedDistanceMin);
assert(seedDistanceMax <= 98, 'adjacent-seed maximum Hamming distance=' + seedDistanceMax);

console.log('esrand-statistical: ' + checks + ' deterministic smoke checks passed; corr=' + corr);
console.log('esrand-statistical: seed avalanche n=' + seedPairs + ' mean=' + seedDistanceMean +
  ' min=' + seedDistanceMin + ' max=' + seedDistanceMax);
console.log('esrand-statistical: smoke tests detect gross defects only; they do not establish cryptographic security');
