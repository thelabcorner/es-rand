import * as ESRAND from '../src/index';

var checks = 0;
var control = 0xdecafbad >>> 0;

function nextControl(): number {
  control = (control * 1664525 + 1013904223) >>> 0;
  return control;
}
function assert(condition: boolean, message: string): void {
  checks++;
  if (!condition) { throw new Error('fuzz failure: ' + message + ' at control=' + control); }
}
function signature(seed: number): string {
  var r = ESRAND.create(seed);
  return r.uint32() + ':' + r.uint32() + ':' + r.uint32() + ':' + r.uint32();
}

var i = 0;
for (i = 0; i < 25000; i++) {
  var seed = nextControl();
  var a = ESRAND.create(seed);
  var b = ESRAND.create(seed);
  assert(signature(seed) === signature(seed), 'repeatable seed signature');

  var op = nextControl() % 8;
  if (op === 0) {
    assert(a.uint32() === b.uint32(), 'uint32 differential');
  } else if (op === 1) {
    var ra = a.random();
    var rb = b.random();
    assert(ra === rb && ra >= 0 && ra < 1, 'random differential/range');
  } else if (op === 2) {
    var lo = (nextControl() % 100000) - 50000;
    var width = (nextControl() % 1000) + 1;
    var ia = a.int(lo, lo + width - 1);
    var ib = b.int(lo, lo + width - 1);
    assert(ia === ib && ia >= lo && ia < lo + width, 'int differential/range');
  } else if (op === 3) {
    var snap = a.getState();
    var clone = ESRAND.fromState(snap);
    assert(a.uint32() === clone.uint32(), 'snapshot continuation');
  } else if (op === 4) {
    var arr = [0, 1, 2, 3, 4, 5, 6, 7];
    var x = a.shuffled(arr);
    var y = b.shuffled(arr);
    assert(x.join(',') === y.join(','), 'shuffle differential');
    x.sort(function (p: number, q: number): number { return p - q; });
    assert(x.join(',') === '0,1,2,3,4,5,6,7', 'shuffle permutation');
  } else if (op === 5) {
    var bytesA = a.bytes(nextControl() % 33);
    var bytesB = b.bytes(bytesA.length);
    assert(bytesA.join(',') === bytesB.join(','), 'bytes differential');
    var bi = 0;
    for (bi = 0; bi < bytesA.length; bi++) {
      assert(bytesA[bi] >= 0 && bytesA[bi] <= 255, 'byte range');
    }
  } else if (op === 6) {
    var old = a.getState();
    var child = a.split();
    assert(JSON.stringify(child.getState().state) === JSON.stringify(old.state), 'split child exact');
    assert(JSON.stringify(a.getState().state) !== JSON.stringify(old.state), 'split parent moved');
  } else {
    var p = (nextControl() % 1001) / 1000;
    assert(a.chance(p) === b.chance(p), 'chance differential');
  }
}

console.log('esrand-fuzz: ' + checks + ' deterministic/property checks passed');
