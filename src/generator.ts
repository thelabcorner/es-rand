import { RandGenerator, RandSnapshot } from './types';
import { MAX_SAFE_INTEGER_ES, U32_SIZE, isInteger, isSafeInteger } from './u32';

export var ALGORITHM_ID = 'xoshiro128**';
export var ALGORITHM_VERSION = 1;
export var SEED_VERSION = 1;

var JUMP: number[] = [0x8764000b, 0xf542d2d3, 0x6fa035c3, 0x77f2db5b];
var LONG_JUMP: number[] = [0xb523952e, 0x0b6f099f, 0xccf5a0ef, 0x1c580662];
var TWO_POW_26 = 67108864;
var TWO_POW_32 = 4294967296;
var TWO_POW_53 = 9007199254740992;
var HEX = '0123456789abcdef';
var HEX_BYTE: string[] | null = null;

function validateStateWords(words: any): number[] {
  if (!words || typeof words.length !== 'number' || words.length !== 4) {
    throw new TypeError('ESRAND state must contain exactly four uint32 words');
  }
  var out: number[] = [];
  var i = 0;
  for (i = 0; i < 4; i++) {
    if (!isInteger(words[i]) || words[i] < -2147483648 || words[i] > 4294967295) {
      throw new RangeError('ESRAND state words must be 32-bit integers');
    }
    out[i] = words[i] >>> 0;
  }
  if ((out[0] | out[1] | out[2] | out[3]) === 0) {
    throw new RangeError('ESRAND xoshiro128** state cannot be all zero');
  }
  return out;
}

function wordsFromSnapshot(value: any): number[] {
  if (value && typeof value === 'object' && value.state !== void 0) {
    if (value.algorithm !== ALGORITHM_ID || value.algorithmVersion !== ALGORITHM_VERSION) {
      throw new RangeError('ESRAND snapshot algorithm/version is incompatible');
    }
    if (value.seedVersion !== SEED_VERSION) {
      throw new RangeError('ESRAND snapshot seed version is incompatible');
    }
    return validateStateWords(value.state);
  }
  return validateStateWords(value);
}

function validateArrayLike(values: any, allowEmpty: boolean): number {
  if (values === null || values === void 0) {
    throw new TypeError('ESRAND expected an array-like value');
  }
  var rawLength = values.length;
  var len = rawLength;
  if ((len >>> 0) !== len) {
    len = Number(rawLength);
    if (!isSafeInteger(len) || len < 0 || len > 4294967295) {
      throw new RangeError('ESRAND array-like length must be an integer in [0, 2^32-1]');
    }
  }
  if (!allowEmpty && len === 0) {
    throw new RangeError('ESRAND cannot choose from an empty collection');
  }
  return len;
}

function resolveFillCount(target: any, count: any): number {
  if (target === null || target === void 0 || typeof target.length !== 'number') {
    throw new TypeError('ESRAND fill target must be an array-like object');
  }
  if (count === void 0) {
    count = target.length;
  }
  if ((count | 0) !== count || count < 0) {
    throw new RangeError('ESRAND fill count must be a non-negative 31-bit integer');
  }
  return count;
}

function GeneratorCtor(this: any, s0: number, s1: number, s2: number, s3: number): void {
  this._s0 = s0 | 0;
  this._s1 = s1 | 0;
  this._s2 = s2 | 0;
  this._s3 = s3 | 0;
}

var proto: any = (GeneratorCtor as any).prototype;

proto.uint32 = function (this: any): number {
  var s0 = this._s0, s1 = this._s1, s2 = this._s2, s3 = this._s3;
  var x = s1 * 5;
  var result = ((x << 7) | (x >>> 25)) * 9;
  var t = s1 << 9;
  s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t;
  s3 = (s3 << 11) | (s3 >>> 21);
  this._s0 = s0; this._s1 = s1; this._s2 = s2; this._s3 = s3;
  return result >>> 0;
};

proto.int32 = function (this: any): number {
  var s0 = this._s0, s1 = this._s1, s2 = this._s2, s3 = this._s3;
  var x = s1 * 5;
  var result = ((x << 7) | (x >>> 25)) * 9;
  var t = s1 << 9;
  s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t;
  s3 = (s3 << 11) | (s3 >>> 21);
  this._s0 = s0; this._s1 = s1; this._s2 = s2; this._s3 = s3;
  return result | 0;
};

proto.random = function (this: any): number {
  var s0 = this._s0, s1 = this._s1, s2 = this._s2, s3 = this._s3;
  var x = s1 * 5;
  var result = ((x << 7) | (x >>> 25)) * 9;
  var t = s1 << 9;
  s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t;
  s3 = (s3 << 11) | (s3 >>> 21);
  var hi = result >>> 5;

  x = s1 * 5;
  result = ((x << 7) | (x >>> 25)) * 9;
  t = s1 << 9;
  s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t;
  s3 = (s3 << 11) | (s3 >>> 21);
  var lo = result >>> 6;

  this._s0 = s0; this._s1 = s1; this._s2 = s2; this._s3 = s3;
  return (hi * TWO_POW_26 + lo) / TWO_POW_53;
};

proto.random32 = function (this: any): number {
  var s0 = this._s0, s1 = this._s1, s2 = this._s2, s3 = this._s3;
  var x = s1 * 5;
  var result = ((x << 7) | (x >>> 25)) * 9;
  var t = s1 << 9;
  s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t;
  s3 = (s3 << 11) | (s3 >>> 21);
  this._s0 = s0; this._s1 = s1; this._s2 = s2; this._s3 = s3;
  return (result >>> 0) / TWO_POW_32;
};

proto.bool = function (this: any): boolean {
  var s0 = this._s0, s1 = this._s1, s2 = this._s2, s3 = this._s3;
  var x = s1 * 5;
  var result = ((x << 7) | (x >>> 25)) * 9;
  var t = s1 << 9;
  s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t;
  s3 = (s3 << 11) | (s3 >>> 21);
  this._s0 = s0; this._s1 = s1; this._s2 = s2; this._s3 = s3;
  return (result & 0x80000000) !== 0;
};

proto.chance = function (this: any, probability: number): boolean {
  if (typeof probability !== 'number' || probability !== probability || probability < 0 || probability > 1) {
    throw new RangeError('ESRAND chance probability must be in [0,1]');
  }
  var s0 = this._s0, s1 = this._s1, s2 = this._s2, s3 = this._s3;
  var x = s1 * 5;
  var result = ((x << 7) | (x >>> 25)) * 9;
  var t = s1 << 9;
  s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t;
  s3 = (s3 << 11) | (s3 >>> 21);
  var hi = result >>> 5;

  x = s1 * 5;
  result = ((x << 7) | (x >>> 25)) * 9;
  t = s1 << 9;
  s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t;
  s3 = (s3 << 11) | (s3 >>> 21);
  var lo = result >>> 6;

  this._s0 = s0; this._s1 = s1; this._s2 = s2; this._s3 = s3;
  return ((hi * TWO_POW_26 + lo) / TWO_POW_53) < probability;
};

proto.choice = function (this: any, values: any): any {
  if (values === null || values === void 0) {
    throw new TypeError('ESRAND expected an array-like value');
  }
  var rawLength = values.length;
  var len = rawLength;
  if ((len >>> 0) !== len) {
    len = Number(rawLength);
    if (!isSafeInteger(len) || len < 0 || len > 4294967295) {
      throw new RangeError('ESRAND array-like length must be an integer in [0, 2^32-1]');
    }
  }
  if (len === 0) {
    throw new RangeError('ESRAND cannot choose from an empty collection');
  }
  if (len === 1) {
    return values[0];
  }

  var s0 = this._s0, s1 = this._s1, s2 = this._s2, s3 = this._s3;
  var x = s1 * 5;
  var result = ((x << 7) | (x >>> 25)) * 9;
  var t = s1 << 9;
  s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t;
  s3 = (s3 << 11) | (s3 >>> 21);
  var word = result >>> 0;
  var limit = U32_SIZE - (U32_SIZE % len);

  while (word >= limit) {
    x = s1 * 5;
    result = ((x << 7) | (x >>> 25)) * 9;
    t = s1 << 9;
    s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t;
    s3 = (s3 << 11) | (s3 >>> 21);
    word = result >>> 0;
  }

  this._s0 = s0; this._s1 = s1; this._s2 = s2; this._s3 = s3;
  return values[word % len];
};

proto.sample = function (this: any, values: any, count: number): any[] {
  if (values === null || values === void 0) {
    throw new TypeError('ESRAND expected an array-like value');
  }
  var rawLength = values.length;
  var len = rawLength;
  if ((len >>> 0) !== len) {
    len = Number(rawLength);
    if (!isSafeInteger(len) || len < 0 || len > 4294967295) {
      throw new RangeError('ESRAND array-like length must be an integer in [0, 2^32-1]');
    }
  }
  if ((count | 0) !== count) {
    if (!isInteger(count)) {
      throw new RangeError('ESRAND sample count must be an integer in [0,length]');
    }
  }
  if (count < 0 || count > len) {
    throw new RangeError('ESRAND sample count must be an integer in [0,length]');
  }

  var out: any[] = [];
  if (count === 0) {
    return out;
  }

  // Exact partial-Fisher–Yates without copying all len elements. remap stores
  // only logical positions that differ from their original index. At step i,
  // position i is retired after selection, so only j's new original index must
  // survive. This preserves every sampled value and every RNG draw while
  // reducing temporary storage/copy work from O(len) to O(count).
  var remap: any = {};
  var s0 = this._s0, s1 = this._s1, s2 = this._s2, s3 = this._s3;
  var i = 0, j = 0, width = 0, limit = 0, word = 0;
  var x = 0, result = 0, t = 0;
  var indexI = 0, indexJ = 0;
  var mapped: any;

  while (i < count) {
    width = len - i;
    if (width === 1) {
      j = i;
    } else {
      x = s1 * 5;
      result = ((x << 7) | (x >>> 25)) * 9;
      t = s1 << 9;
      s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t;
      s3 = (s3 << 11) | (s3 >>> 21);
      word = result >>> 0;
      limit = U32_SIZE - (U32_SIZE % width);
      while (word >= limit) {
        x = s1 * 5;
        result = ((x << 7) | (x >>> 25)) * 9;
        t = s1 << 9;
        s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t;
        s3 = (s3 << 11) | (s3 >>> 21);
        word = result >>> 0;
      }
      j = i + (word % width);
    }

    mapped = remap[i];
    indexI = mapped === void 0 ? i : mapped;
    mapped = remap[j];
    indexJ = mapped === void 0 ? j : mapped;

    out[i] = values[indexJ];
    remap[j] = indexI;
    i++;
  }

  this._s0 = s0; this._s1 = s1; this._s2 = s2; this._s3 = s3;
  return out;
};

proto.shuffle = function (this: any, values: any[]): any[] {
  if (values === null || values === void 0) {
    throw new TypeError('ESRAND expected an array-like value');
  }
  var rawLength = values.length;
  var len = rawLength;
  if ((len >>> 0) !== len) {
    len = Number(rawLength);
    if (!isSafeInteger(len) || len < 0 || len > 4294967295) {
      throw new RangeError('ESRAND array-like length must be an integer in [0, 2^32-1]');
    }
  }
  if (len <= 1) {
    return values;
  }

  var s0 = this._s0, s1 = this._s1, s2 = this._s2, s3 = this._s3;
  var i = 0, j = 0, width = 0, limit = 0, word = 0;
  var x = 0, result = 0, t = 0;
  var temp: any;

  i = len - 1;
  while (i > 0) {
    width = i + 1;
    x = s1 * 5;
    result = ((x << 7) | (x >>> 25)) * 9;
    t = s1 << 9;
    s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t;
    s3 = (s3 << 11) | (s3 >>> 21);
    word = result >>> 0;
    limit = U32_SIZE - (U32_SIZE % width);
    while (word >= limit) {
      x = s1 * 5;
      result = ((x << 7) | (x >>> 25)) * 9;
      t = s1 << 9;
      s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t;
      s3 = (s3 << 11) | (s3 >>> 21);
      word = result >>> 0;
    }
    j = word % width;
    temp = values[i]; values[i] = values[j]; values[j] = temp;
    i--;
  }

  this._s0 = s0; this._s1 = s1; this._s2 = s2; this._s3 = s3;
  return values;
};

proto.shuffled = function (this: any, values: any): any[] {
  if (values === null || values === void 0) {
    throw new TypeError('ESRAND expected an array-like value');
  }
  var rawLength = values.length;
  var len = rawLength;
  if ((len >>> 0) !== len) {
    len = Number(rawLength);
    if (!isSafeInteger(len) || len < 0 || len > 4294967295) {
      throw new RangeError('ESRAND array-like length must be an integer in [0, 2^32-1]');
    }
  }
  var out: any[] = [];
  var i = 0;
  for (i = 0; i < len; i++) {
    out[i] = values[i];
  }
  if (len <= 1) {
    return out;
  }

  var s0 = this._s0, s1 = this._s1, s2 = this._s2, s3 = this._s3;
  var j = 0, width = 0, limit = 0, word = 0;
  var x = 0, result = 0, t = 0;
  var temp: any;

  i = len - 1;
  while (i > 0) {
    width = i + 1;
    x = s1 * 5;
    result = ((x << 7) | (x >>> 25)) * 9;
    t = s1 << 9;
    s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t;
    s3 = (s3 << 11) | (s3 >>> 21);
    word = result >>> 0;
    limit = U32_SIZE - (U32_SIZE % width);
    while (word >= limit) {
      x = s1 * 5;
      result = ((x << 7) | (x >>> 25)) * 9;
      t = s1 << 9;
      s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t;
      s3 = (s3 << 11) | (s3 >>> 21);
      word = result >>> 0;
    }
    j = word % width;
    temp = out[i]; out[i] = out[j]; out[j] = temp;
    i--;
  }

  this._s0 = s0; this._s1 = s1; this._s2 = s2; this._s3 = s3;
  return out;
};

proto.fillUint32 = function (this: any, target: number[], count?: number): number[] {
  var n = resolveFillCount(target, count);
  if (n === 0) { return target; }

  var s0 = this._s0, s1 = this._s1, s2 = this._s2, s3 = this._s3;
  var i = 0;
  var full = n - (n & 3);
  var x = 0, result = 0, t = 0;
  while (i < full) {
    x = s1 * 5; result = ((x << 7) | (x >>> 25)) * 9; t = s1 << 9;
    s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t; s3 = (s3 << 11) | (s3 >>> 21);
    target[i++] = result >>> 0;

    x = s1 * 5; result = ((x << 7) | (x >>> 25)) * 9; t = s1 << 9;
    s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t; s3 = (s3 << 11) | (s3 >>> 21);
    target[i++] = result >>> 0;

    x = s1 * 5; result = ((x << 7) | (x >>> 25)) * 9; t = s1 << 9;
    s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t; s3 = (s3 << 11) | (s3 >>> 21);
    target[i++] = result >>> 0;

    x = s1 * 5; result = ((x << 7) | (x >>> 25)) * 9; t = s1 << 9;
    s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t; s3 = (s3 << 11) | (s3 >>> 21);
    target[i++] = result >>> 0;
  }
  while (i < n) {
    x = s1 * 5; result = ((x << 7) | (x >>> 25)) * 9; t = s1 << 9;
    s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t; s3 = (s3 << 11) | (s3 >>> 21);
    target[i++] = result >>> 0;
  }

  this._s0 = s0; this._s1 = s1; this._s2 = s2; this._s3 = s3;
  return target;
};

proto.fillRandom32 = function (this: any, target: number[], count?: number): number[] {
  var n = resolveFillCount(target, count);
  if (n === 0) { return target; }

  var s0 = this._s0, s1 = this._s1, s2 = this._s2, s3 = this._s3;
  var i = 0;
  var full = n - (n & 3);
  var x = 0, result = 0, t = 0;
  while (i < full) {
    x = s1 * 5; result = ((x << 7) | (x >>> 25)) * 9; t = s1 << 9;
    s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t; s3 = (s3 << 11) | (s3 >>> 21);
    target[i++] = (result >>> 0) / TWO_POW_32;

    x = s1 * 5; result = ((x << 7) | (x >>> 25)) * 9; t = s1 << 9;
    s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t; s3 = (s3 << 11) | (s3 >>> 21);
    target[i++] = (result >>> 0) / TWO_POW_32;

    x = s1 * 5; result = ((x << 7) | (x >>> 25)) * 9; t = s1 << 9;
    s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t; s3 = (s3 << 11) | (s3 >>> 21);
    target[i++] = (result >>> 0) / TWO_POW_32;

    x = s1 * 5; result = ((x << 7) | (x >>> 25)) * 9; t = s1 << 9;
    s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t; s3 = (s3 << 11) | (s3 >>> 21);
    target[i++] = (result >>> 0) / TWO_POW_32;
  }
  while (i < n) {
    x = s1 * 5; result = ((x << 7) | (x >>> 25)) * 9; t = s1 << 9;
    s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t; s3 = (s3 << 11) | (s3 >>> 21);
    target[i++] = (result >>> 0) / TWO_POW_32;
  }

  this._s0 = s0; this._s1 = s1; this._s2 = s2; this._s3 = s3;
  return target;
};

proto.fillRandom = function (this: any, target: number[], count?: number): number[] {
  var n = resolveFillCount(target, count);
  if (n === 0) { return target; }

  var s0 = this._s0, s1 = this._s1, s2 = this._s2, s3 = this._s3;
  var i = 0;
  while (i < n) {
    var x = s1 * 5;
    var result = ((x << 7) | (x >>> 25)) * 9;
    var t = s1 << 9;
    s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t;
    s3 = (s3 << 11) | (s3 >>> 21);
    var hi = result >>> 5;

    x = s1 * 5;
    result = ((x << 7) | (x >>> 25)) * 9;
    t = s1 << 9;
    s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t;
    s3 = (s3 << 11) | (s3 >>> 21);
    var lo = result >>> 6;

    target[i++] = (hi * TWO_POW_26 + lo) / TWO_POW_53;
  }

  this._s0 = s0; this._s1 = s1; this._s2 = s2; this._s3 = s3;
  return target;
};

proto.fillFloat = function (
  this: any,
  target: number[],
  min: number,
  max: number,
  count?: number
): number[] {
  var n = resolveFillCount(target, count);
  if (
    typeof min !== 'number' || typeof max !== 'number' ||
    (min - min) !== 0 || (max - max) !== 0
  ) {
    throw new TypeError('ESRAND float bounds must be finite numbers');
  }
  if (max < min) {
    throw new RangeError('ESRAND float max must be >= min');
  }
  if (n === 0) {
    return target;
  }
  if (max === min) {
    var sameI = 0;
    for (sameI = 0; sameI < n; sameI++) { target[sameI] = min; }
    return target;
  }
  var span = max - min;
  if ((span - span) !== 0) {
    throw new RangeError('ESRAND float span must be finite');
  }

  var s0 = this._s0, s1 = this._s1, s2 = this._s2, s3 = this._s3;
  var i = 0;
  while (i < n) {
    var x = s1 * 5;
    var result = ((x << 7) | (x >>> 25)) * 9;
    var t = s1 << 9;
    s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t;
    s3 = (s3 << 11) | (s3 >>> 21);
    var hi = result >>> 5;

    x = s1 * 5;
    result = ((x << 7) | (x >>> 25)) * 9;
    t = s1 << 9;
    s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t;
    s3 = (s3 << 11) | (s3 >>> 21);
    var lo = result >>> 6;

    target[i++] = min + span * ((hi * TWO_POW_26 + lo) / TWO_POW_53);
  }

  this._s0 = s0; this._s1 = s1; this._s2 = s2; this._s3 = s3;
  return target;
};

proto.fillFloat32 = function (
  this: any,
  target: number[],
  min: number,
  max: number,
  count?: number
): number[] {
  var n = resolveFillCount(target, count);
  if (
    typeof min !== 'number' || typeof max !== 'number' ||
    (min - min) !== 0 || (max - max) !== 0
  ) {
    throw new TypeError('ESRAND float32 bounds must be finite numbers');
  }
  if (max < min) {
    throw new RangeError('ESRAND float32 max must be >= min');
  }
  if (n === 0) {
    return target;
  }
  if (max === min) {
    var sameI = 0;
    for (sameI = 0; sameI < n; sameI++) { target[sameI] = min; }
    return target;
  }
  var span = max - min;
  if ((span - span) !== 0) {
    throw new RangeError('ESRAND float32 span must be finite');
  }

  var s0 = this._s0, s1 = this._s1, s2 = this._s2, s3 = this._s3;
  var i = 0;
  while (i < n) {
    var x = s1 * 5;
    var result = ((x << 7) | (x >>> 25)) * 9;
    var t = s1 << 9;
    s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t;
    s3 = (s3 << 11) | (s3 >>> 21);
    target[i++] = min + span * ((result >>> 0) / TWO_POW_32);
  }

  this._s0 = s0; this._s1 = s1; this._s2 = s2; this._s3 = s3;
  return target;
};

proto.fillBool = function (this: any, target: boolean[], count?: number): boolean[] {
  var n = resolveFillCount(target, count);
  if (n === 0) { return target; }

  var s0 = this._s0, s1 = this._s1, s2 = this._s2, s3 = this._s3;
  var i = 0;
  while (i < n) {
    var x = s1 * 5;
    var result = ((x << 7) | (x >>> 25)) * 9;
    var t = s1 << 9;
    s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t;
    s3 = (s3 << 11) | (s3 >>> 21);
    target[i++] = (result & 0x80000000) !== 0;
  }

  this._s0 = s0; this._s1 = s1; this._s2 = s2; this._s3 = s3;
  return target;
};

proto.fillChance = function (
  this: any,
  target: boolean[],
  probability: number,
  count?: number
): boolean[] {
  var n = resolveFillCount(target, count);
  if (
    typeof probability !== 'number' ||
    (probability - probability) !== 0 ||
    probability < 0 || probability > 1
  ) {
    throw new RangeError('ESRAND chance probability must be in [0,1]');
  }
  if (n === 0) { return target; }

  var s0 = this._s0, s1 = this._s1, s2 = this._s2, s3 = this._s3;
  var i = 0;
  while (i < n) {
    var x = s1 * 5;
    var result = ((x << 7) | (x >>> 25)) * 9;
    var t = s1 << 9;
    s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t;
    s3 = (s3 << 11) | (s3 >>> 21);
    var hi = result >>> 5;

    x = s1 * 5;
    result = ((x << 7) | (x >>> 25)) * 9;
    t = s1 << 9;
    s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t;
    s3 = (s3 << 11) | (s3 >>> 21);
    var lo = result >>> 6;

    target[i++] = ((hi * TWO_POW_26 + lo) / TWO_POW_53) < probability;
  }

  this._s0 = s0; this._s1 = s1; this._s2 = s2; this._s3 = s3;
  return target;
};

proto.fillInt = function (
  this: any,
  target: number[],
  min: number,
  max: number,
  count?: number
): number[] {
  var n = resolveFillCount(target, count);

  if ((min | 0) !== min || (max | 0) !== max) {
    if (
      typeof min !== 'number' || typeof max !== 'number' ||
      min < -MAX_SAFE_INTEGER_ES || min > MAX_SAFE_INTEGER_ES ||
      max < -MAX_SAFE_INTEGER_ES || max > MAX_SAFE_INTEGER_ES ||
      min % 1 !== 0 || max % 1 !== 0
    ) {
      throw new TypeError('ESRAND int bounds must be safe integers');
    }
  }
  if (max < min) {
    throw new RangeError('ESRAND int max must be >= min');
  }

  var width = max - min + 1;
  if (!(width > 0) || width > U32_SIZE) {
    throw new RangeError('ESRAND inclusive int range width must be <= 2^32');
  }
  if (n === 0) {
    return target;
  }

  var i = 0;
  if (width === 1) {
    for (i = 0; i < n; i++) {
      target[i] = min;
    }
    return target;
  }

  var s0 = this._s0, s1 = this._s1, s2 = this._s2, s3 = this._s3;
  var x = 0, result = 0, t = 0, word = 0;

  // Batch-only power-of-two lane. For widths <= 2^31, masking is exactly
  // equivalent to modulo and the rejection interval is the full uint32 domain.
  // Paying this branch once per fill avoids penalizing scalar/generic int().
  if (width <= 2147483648 && (width & (width - 1)) === 0) {
    var mask = width - 1;
    while (i < n) {
      x = s1 * 5;
      result = ((x << 7) | (x >>> 25)) * 9;
      t = s1 << 9;
      s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t;
      s3 = (s3 << 11) | (s3 >>> 21);
      target[i++] = min + ((result >>> 0) & mask);
    }
    this._s0 = s0; this._s1 = s1; this._s2 = s2; this._s3 = s3;
    return target;
  }

  var limit = width === U32_SIZE ? U32_SIZE : U32_SIZE - (U32_SIZE % width);

  while (i < n) {
    x = s1 * 5;
    result = ((x << 7) | (x >>> 25)) * 9;
    t = s1 << 9;
    s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t;
    s3 = (s3 << 11) | (s3 >>> 21);
    word = result >>> 0;

    while (word >= limit) {
      x = s1 * 5;
      result = ((x << 7) | (x >>> 25)) * 9;
      t = s1 << 9;
      s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t;
      s3 = (s3 << 11) | (s3 >>> 21);
      word = result >>> 0;
    }

    target[i++] = min + (width === U32_SIZE ? word : word % width);
  }

  this._s0 = s0; this._s1 = s1; this._s2 = s2; this._s3 = s3;
  return target;
};

proto.fillBytes = function (this: any, target: number[], count?: number): number[] {
  var n = resolveFillCount(target, count);
  if (n === 0) { return target; }

  var s0 = this._s0, s1 = this._s1, s2 = this._s2, s3 = this._s3;
  var i = 0;
  var full = n - (n & 3);
  var x = 0, result = 0, t = 0;

  while (i < full) {
    x = s1 * 5;
    result = ((x << 7) | (x >>> 25)) * 9;
    t = s1 << 9;
    s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t;
    s3 = (s3 << 11) | (s3 >>> 21);

    target[i] = result & 255;
    target[i + 1] = (result >>> 8) & 255;
    target[i + 2] = (result >>> 16) & 255;
    target[i + 3] = (result >>> 24) & 255;
    i += 4;
  }

  if (i < n) {
    x = s1 * 5;
    result = ((x << 7) | (x >>> 25)) * 9;
    t = s1 << 9;
    s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t;
    s3 = (s3 << 11) | (s3 >>> 21);

    target[i++] = result & 255;
    if (i < n) { target[i++] = (result >>> 8) & 255; }
    if (i < n) { target[i++] = (result >>> 16) & 255; }
  }

  this._s0 = s0; this._s1 = s1; this._s2 = s2; this._s3 = s3;
  return target;
};

proto.bytes = function (this: any, count: number): number[] {
  if ((count | 0) !== count || count < 0) {
    throw new RangeError('ESRAND byte count must be a non-negative 31-bit integer');
  }
  var out: number[] = [];
  if (count === 0) {
    return out;
  }

  var s0 = this._s0, s1 = this._s1, s2 = this._s2, s3 = this._s3;
  var i = 0;
  var full = count - (count & 3);
  var x = 0, result = 0, t = 0;

  while (i < full) {
    x = s1 * 5;
    result = ((x << 7) | (x >>> 25)) * 9;
    t = s1 << 9;
    s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t;
    s3 = (s3 << 11) | (s3 >>> 21);

    out[i] = result & 255;
    out[i + 1] = (result >>> 8) & 255;
    out[i + 2] = (result >>> 16) & 255;
    out[i + 3] = (result >>> 24) & 255;
    i += 4;
  }

  if (i < count) {
    x = s1 * 5;
    result = ((x << 7) | (x >>> 25)) * 9;
    t = s1 << 9;
    s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t;
    s3 = (s3 << 11) | (s3 >>> 21);

    out[i++] = result & 255;
    if (i < count) { out[i++] = (result >>> 8) & 255; }
    if (i < count) { out[i++] = (result >>> 16) & 255; }
  }

  this._s0 = s0; this._s1 = s1; this._s2 = s2; this._s3 = s3;
  return out;
};

proto.hex = function (this: any, byteCount: number): string {
  if ((byteCount | 0) !== byteCount || byteCount < 0) {
    throw new RangeError('ESRAND byte count must be a non-negative 31-bit integer');
  }
  if (byteCount === 0) {
    return '';
  }

  var hexByte = HEX_BYTE;
  if (hexByte === null) {
    hexByte = [];
    var hexByteInit = 0;
    for (hexByteInit = 0; hexByteInit < 256; hexByteInit++) {
      hexByte[hexByteInit] =
        HEX.charAt((hexByteInit >>> 4) & 15) + HEX.charAt(hexByteInit & 15);
    }
    HEX_BYTE = hexByte;
  }

  var out = '';
  var s0 = this._s0, s1 = this._s1, s2 = this._s2, s3 = this._s3;
  var i = 0;
  var full = byteCount - (byteCount & 3);
  var x = 0, result = 0, t = 0;

  while (i < full) {
    x = s1 * 5;
    result = ((x << 7) | (x >>> 25)) * 9;
    t = s1 << 9;
    s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t;
    s3 = (s3 << 11) | (s3 >>> 21);

    out +=
      hexByte[result & 255] +
      hexByte[(result >>> 8) & 255] +
      hexByte[(result >>> 16) & 255] +
      hexByte[(result >>> 24) & 255];
    i += 4;
  }

  if (i < byteCount) {
    x = s1 * 5;
    result = ((x << 7) | (x >>> 25)) * 9;
    t = s1 << 9;
    s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t;
    s3 = (s3 << 11) | (s3 >>> 21);

    out += hexByte[result & 255]; i++;
    if (i < byteCount) { out += hexByte[(result >>> 8) & 255]; i++; }
    if (i < byteCount) { out += hexByte[(result >>> 16) & 255]; i++; }
  }

  this._s0 = s0; this._s1 = s1; this._s2 = s2; this._s3 = s3;
  return out;
};

proto.getState = function (this: any): RandSnapshot {
  return {
    algorithm: ALGORITHM_ID,
    algorithmVersion: ALGORITHM_VERSION,
    seedVersion: SEED_VERSION,
    state: [this._s0 >>> 0, this._s1 >>> 0, this._s2 >>> 0, this._s3 >>> 0]
  };
};

proto.setState = function (this: any, snapshotOrWords: RandSnapshot | number[]): RandGenerator {
  var words = wordsFromSnapshot(snapshotOrWords);
  this._s0 = words[0] | 0;
  this._s1 = words[1] | 0;
  this._s2 = words[2] | 0;
  this._s3 = words[3] | 0;
  return this as RandGenerator;
};

proto.clone = function (this: any): RandGenerator {
  return createGeneratorTrustedWords(this._s0, this._s1, this._s2, this._s3);
};

function applyJump(target: any, poly: number[]): void {
  var s0 = target._s0, s1 = target._s1, s2 = target._s2, s3 = target._s3;
  var a = 0, b = 0, c = 0, d = 0;
  var i = 0, bit = 0, x = 0, result = 0, t = 0;
  var polyLen = poly.length;

  for (i = 0; i < polyLen; i++) {
    for (bit = 0; bit < 32; bit++) {
      if ((poly[i] & (1 << bit)) !== 0) {
        a ^= s0; b ^= s1; c ^= s2; d ^= s3;
      }
      x = s1 * 5;
      result = ((x << 7) | (x >>> 25)) * 9;
      t = s1 << 9;
      s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t;
      s3 = (s3 << 11) | (s3 >>> 21);
    }
  }

  target._s0 = a; target._s1 = b; target._s2 = c; target._s3 = d;
}

proto.jump = function (this: any): RandGenerator {
  applyJump(this, JUMP);
  return this as RandGenerator;
};

proto.longJump = function (this: any): RandGenerator {
  applyJump(this, LONG_JUMP);
  return this as RandGenerator;
};

proto.split = function (this: any): RandGenerator {
  var child = createGeneratorTrustedWords(this._s0, this._s1, this._s2, this._s3);
  applyJump(this, JUMP);
  return child;
};

proto['float'] = function (this: any, min: number, max: number): number {
  if (
    typeof min !== 'number' || typeof max !== 'number' ||
    (min - min) !== 0 || (max - max) !== 0
  ) {
    throw new TypeError('ESRAND float bounds must be finite numbers');
  }
  if (max < min) {
    throw new RangeError('ESRAND float max must be >= min');
  }
  if (max === min) {
    return min;
  }
  var span = max - min;
    if ((span - span) !== 0) {
      throw new RangeError('ESRAND float span must be finite');
    }

  var s0 = this._s0, s1 = this._s1, s2 = this._s2, s3 = this._s3;
  var x = s1 * 5;
  var result = ((x << 7) | (x >>> 25)) * 9;
  var t = s1 << 9;
  s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t;
  s3 = (s3 << 11) | (s3 >>> 21);
  var hi = result >>> 5;

  x = s1 * 5;
  result = ((x << 7) | (x >>> 25)) * 9;
  t = s1 << 9;
  s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t;
  s3 = (s3 << 11) | (s3 >>> 21);
  var lo = result >>> 6;

  this._s0 = s0; this._s1 = s1; this._s2 = s2; this._s3 = s3;
  return min + span * ((hi * TWO_POW_26 + lo) / TWO_POW_53);
};

proto.float32 = function (this: any, min: number, max: number): number {
  if (
    typeof min !== 'number' || typeof max !== 'number' ||
    (min - min) !== 0 || (max - max) !== 0
  ) {
    throw new TypeError('ESRAND float32 bounds must be finite numbers');
  }
  if (max < min) {
    throw new RangeError('ESRAND float32 max must be >= min');
  }
  if (max === min) {
    return min;
  }
  var span = max - min;
  if ((span - span) !== 0) {
    throw new RangeError('ESRAND float32 span must be finite');
  }

  var s0 = this._s0, s1 = this._s1, s2 = this._s2, s3 = this._s3;
  var x = s1 * 5;
  var result = ((x << 7) | (x >>> 25)) * 9;
  var t = s1 << 9;
  s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t;
  s3 = (s3 << 11) | (s3 >>> 21);
  this._s0 = s0; this._s1 = s1; this._s2 = s2; this._s3 = s3;
  return min + span * ((result >>> 0) / TWO_POW_32);
};

proto['int'] = function (this: any, min: number, max: number): number {
  if ((min | 0) !== min || (max | 0) !== max) {
    if (
      typeof min !== 'number' || typeof max !== 'number' ||
      min < -MAX_SAFE_INTEGER_ES || min > MAX_SAFE_INTEGER_ES ||
      max < -MAX_SAFE_INTEGER_ES || max > MAX_SAFE_INTEGER_ES ||
      min % 1 !== 0 || max % 1 !== 0
    ) {
      throw new TypeError('ESRAND int bounds must be safe integers');
    }
  }
  if (max < min) {
    throw new RangeError('ESRAND int max must be >= min');
  }
  var width = max - min + 1;
  if (!(width > 0) || width > U32_SIZE) {
    throw new RangeError('ESRAND inclusive int range width must be <= 2^32');
  }
  if (width === 1) {
    return min;
  }

  var s0 = this._s0, s1 = this._s1, s2 = this._s2, s3 = this._s3;
  var x = s1 * 5;
  var result = ((x << 7) | (x >>> 25)) * 9;
  var t = s1 << 9;
  s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t;
  s3 = (s3 << 11) | (s3 >>> 21);
  var word = result >>> 0;

  if (width !== U32_SIZE) {
    var limit = U32_SIZE - (U32_SIZE % width);
    while (word >= limit) {
      x = s1 * 5;
      result = ((x << 7) | (x >>> 25)) * 9;
      t = s1 << 9;
      s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t;
      s3 = (s3 << 11) | (s3 >>> 21);
      word = result >>> 0;
    }
    word = word % width;
  }

  this._s0 = s0; this._s1 = s1; this._s2 = s2; this._s3 = s3;
  return min + word;
};

function createGeneratorTrustedWords(s0: number, s1: number, s2: number, s3: number): RandGenerator {
  return new (GeneratorCtor as any)(s0, s1, s2, s3) as RandGenerator;
}

function createGeneratorTrusted(initial: number[]): RandGenerator {
  return createGeneratorTrustedWords(initial[0], initial[1], initial[2], initial[3]);
}

export function createGenerator(initialWords: number[]): RandGenerator {
  return createGeneratorTrusted(validateStateWords(initialWords));
}

export function createGeneratorFromTrustedState(initialWords: number[]): RandGenerator {
  return createGeneratorTrusted(initialWords);
}

export function stateWordsFromSnapshot(snapshotOrWords: RandSnapshot | number[]): number[] {
  return wordsFromSnapshot(snapshotOrWords);
}
