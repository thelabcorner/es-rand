import { murmurHash3x86_128TwoWordsFast, murmurHash3x86_128WordsFast } from './murmur128';
import { Seed } from './types';
import { U32_SIZE, isArrayValue, isFiniteNumber } from './u32';

var NUMBER_TAG = 0x4e554d31; // "NUM1"
var STRING_TAG = 0x53545231; // "STR1"
var ARRAY_TAG = 0x41525231;  // "ARR1"
var SEED_HASH_SEED = 0x45535231; // "ESR1"
var ZERO_REHASH_SEED = (SEED_HASH_SEED ^ 0x9e3779b9) >>> 0;
var MAX_SERIALIZED_SEED_BYTES = 0x7fffffff;
var SMALL_SEED_WORD_LIMIT = 256;
var smallSeedWords: number[] = [];
var smallSeedWordsBusy = false;
var autoCounter = 0;

function nonZeroStateInto(words: number[], byteLength: number, out: number[]): number[] {
  murmurHash3x86_128WordsFast(words, byteLength, SEED_HASH_SEED, out);
  if ((out[0] | out[1] | out[2] | out[3]) !== 0) {
    return out;
  }

  // xoshiro's one forbidden state is astronomically unlikely as a 128-bit
  // hash result, but make the repair deterministic without introducing a
  // direct-state alias.
  murmurHash3x86_128WordsFast(words, byteLength, ZERO_REHASH_SEED, out);
  if ((out[0] | out[1] | out[2] | out[3]) !== 0) {
    return out;
  }

  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out.length = 4;
  return out;
}

function acquireWords(wordCount: number): number[] {
  if (!smallSeedWordsBusy && wordCount <= SMALL_SEED_WORD_LIMIT) {
    smallSeedWordsBusy = true;
    smallSeedWords.length = wordCount;
    return smallSeedWords;
  }
  var fresh: number[] = [];
  fresh.length = wordCount;
  return fresh;
}

function releaseWords(words: number[]): void {
  if (words === smallSeedWords) {
    smallSeedWordsBusy = false;
  }
}

function numberStateInto(value: number, out: number[]): number[] {
  // Specialized canonical MurmurHash3 x86_128 len=8 path for:
  // [NUMBER_TAG, uint32(value)] with SEED_HASH_SEED.
  // The first serialized word and fixed seed/length lanes are pre-mixed:
  //   mixed(NUMBER_TAG) = 0xa9b4c582
  //   h1 after tag+len   = 0xece797bb
  //   h3/h4 after len    = 0x45535239
  // Only the caller's uint32 value remains variable.
  var al = 0;
  var ah = 0;
  var k2 = value >>> 0;

  al = k2 & 0xffff; ah = (k2 >>> 16) & 0xffff;
  k2 = (al * 0x9789 + (((ah * 0x9789 + al * 0xab0e) & 0xffff) << 16)) | 0;
  k2 = ((k2 << 16) | (k2 >>> 16)) >>> 0;
  al = k2 & 0xffff; ah = (k2 >>> 16) & 0xffff;
  k2 = (al * 0x4ae5 + (((ah * 0x4ae5 + al * 0x38b3) & 0xffff) << 16)) | 0;

  var h1 = 0xece797bb >>> 0;
  var h2 = (0x45535239 ^ k2) >>> 0;
  var h3 = 0x45535239 >>> 0;
  var h4 = 0x45535239 >>> 0;

  h1 = (h1 + h2 + h3 + h4) >>> 0;
  h2 = (h2 + h1) >>> 0;
  h3 = (h3 + h1) >>> 0;
  h4 = (h4 + h1) >>> 0;

  h1 ^= h1 >>> 16;
  al = h1 & 0xffff; ah = (h1 >>> 16) & 0xffff;
  h1 = (al * 0xca6b + (((ah * 0xca6b + al * 0x85eb) & 0xffff) << 16)) | 0;
  h1 ^= h1 >>> 13;
  al = h1 & 0xffff; ah = (h1 >>> 16) & 0xffff;
  h1 = (al * 0xae35 + (((ah * 0xae35 + al * 0xc2b2) & 0xffff) << 16)) | 0;
  h1 = (h1 ^ (h1 >>> 16)) >>> 0;

  h2 ^= h2 >>> 16;
  al = h2 & 0xffff; ah = (h2 >>> 16) & 0xffff;
  h2 = (al * 0xca6b + (((ah * 0xca6b + al * 0x85eb) & 0xffff) << 16)) | 0;
  h2 ^= h2 >>> 13;
  al = h2 & 0xffff; ah = (h2 >>> 16) & 0xffff;
  h2 = (al * 0xae35 + (((ah * 0xae35 + al * 0xc2b2) & 0xffff) << 16)) | 0;
  h2 = (h2 ^ (h2 >>> 16)) >>> 0;

  h3 ^= h3 >>> 16;
  al = h3 & 0xffff; ah = (h3 >>> 16) & 0xffff;
  h3 = (al * 0xca6b + (((ah * 0xca6b + al * 0x85eb) & 0xffff) << 16)) | 0;
  h3 ^= h3 >>> 13;
  al = h3 & 0xffff; ah = (h3 >>> 16) & 0xffff;
  h3 = (al * 0xae35 + (((ah * 0xae35 + al * 0xc2b2) & 0xffff) << 16)) | 0;
  h3 = (h3 ^ (h3 >>> 16)) >>> 0;

  h4 ^= h4 >>> 16;
  al = h4 & 0xffff; ah = (h4 >>> 16) & 0xffff;
  h4 = (al * 0xca6b + (((ah * 0xca6b + al * 0x85eb) & 0xffff) << 16)) | 0;
  h4 ^= h4 >>> 13;
  al = h4 & 0xffff; ah = (h4 >>> 16) & 0xffff;
  h4 = (al * 0xae35 + (((ah * 0xae35 + al * 0xc2b2) & 0xffff) << 16)) | 0;
  h4 = (h4 ^ (h4 >>> 16)) >>> 0;

  h1 = (h1 + h2 + h3 + h4) >>> 0;
  h2 = (h2 + h1) >>> 0;
  h3 = (h3 + h1) >>> 0;
  h4 = (h4 + h1) >>> 0;

  out[0] = h1;
  out[1] = h2;
  out[2] = h3;
  out[3] = h4;
  out.length = 4;

  if ((h1 | h2 | h3 | h4) !== 0) {
    return out;
  }

  // Preserve the contract's deterministic all-zero repair path exactly.
  murmurHash3x86_128TwoWordsFast(NUMBER_TAG, value >>> 0, ZERO_REHASH_SEED, out);
  if ((out[0] | out[1] | out[2] | out[3]) !== 0) {
    return out;
  }
  out[0] = 1; out[1] = 0; out[2] = 0; out[3] = 0; out.length = 4;
  return out;
}

/**
 * Seed contract v1 canonical serialization, packed directly as little-endian
 * uint32 words before MurmurHash3 x86_128.
 *
 * Packing is only an implementation optimization: the byte stream is exactly
 * the same as the original byte-array serializer.
 */
export function stateFromSeedInto(seed: Seed, out: number[]): number[] {
  var words: number[];
  var len = 0;
  var i = 0;

  if (typeof seed === 'number') {
    if (!isFiniteNumber(seed)) {
      throw new TypeError('ESRAND seed number must be finite');
    }
    return numberStateInto(seed, out);
  }

  if (typeof seed === 'string') {
    len = seed.length;
    var stringByteLength = 8 + len * 2;
    if (stringByteLength > MAX_SERIALIZED_SEED_BYTES) {
      throw new RangeError('ESRAND string seed is too large');
    }
    var stringWordCount = 2 + Math.floor((len + 1) / 2);
    words = acquireWords(stringWordCount);
    try {
      words[0] = STRING_TAG;
      words[1] = len >>> 0;
      var wi = 2;
      // Old ExtendScript pays heavily for loop/control overhead around
      // charCodeAt. Pack four uint32 words (eight UTF-16 code units) per
      // iteration, then handle the short tail with the canonical scalar path.
      for (i = 0; i + 7 < len; i += 8) {
        words[wi++] = (
          (seed.charCodeAt(i) & 0xffff) |
          ((seed.charCodeAt(i + 1) & 0xffff) << 16)
        ) >>> 0;
        words[wi++] = (
          (seed.charCodeAt(i + 2) & 0xffff) |
          ((seed.charCodeAt(i + 3) & 0xffff) << 16)
        ) >>> 0;
        words[wi++] = (
          (seed.charCodeAt(i + 4) & 0xffff) |
          ((seed.charCodeAt(i + 5) & 0xffff) << 16)
        ) >>> 0;
        words[wi++] = (
          (seed.charCodeAt(i + 6) & 0xffff) |
          ((seed.charCodeAt(i + 7) & 0xffff) << 16)
        ) >>> 0;
      }
      for (; i < len; i += 2) {
        var packed = seed.charCodeAt(i) & 0xffff;
        if (i + 1 < len) {
          packed |= (seed.charCodeAt(i + 1) & 0xffff) << 16;
        }
        words[wi++] = packed >>> 0;
      }
      return nonZeroStateInto(words, stringByteLength, out);
    } finally {
      releaseWords(words);
    }
  }

  if (isArrayValue(seed)) {
    var input = seed as number[];
    len = input.length;
    var arrayByteLength = 8 + len * 4;
    if (arrayByteLength > MAX_SERIALIZED_SEED_BYTES) {
      throw new RangeError('ESRAND array seed is too large');
    }
    words = acquireWords(len + 2);
    try {
      words[0] = ARRAY_TAG;
      words[1] = len >>> 0;
      for (i = 0; i < len; i++) {
        if (!isFiniteNumber(input[i])) {
          throw new TypeError('ESRAND array seeds must contain only finite numbers');
        }
        words[i + 2] = input[i] >>> 0;
      }
      return nonZeroStateInto(words, arrayByteLength, out);
    } finally {
      releaseWords(words);
    }
  }

  throw new TypeError('ESRAND seed must be a number, string, or number[]');
}

/** Allocate an independent state array for callers that need to retain it. */
export function stateFromSeed(seed: Seed): number[] {
  return stateFromSeedInto(seed, []);
}

export function autoSeedWords(): number[] {
  autoCounter = (autoCounter + 1) >>> 0;
  var ms = new Date().getTime();
  var low = ms >>> 0;
  var high = Math.floor(ms / U32_SIZE) >>> 0;
  var nativeWordA = 0;
  var nativeWordB = 0;
  try {
    if (typeof Math.random === 'function') {
      // Illustrator 30.6.0 / ExtendScript 4.5.6 exposed an observed 15-bit
      // native grid in live probes. Keep two independent draws as separate
      // seed words rather than pretending one scaled draw carries 32 bits.
      nativeWordA = Math.floor(Math.random() * U32_SIZE) >>> 0;
      nativeWordB = Math.floor(Math.random() * U32_SIZE) >>> 0;
    }
  } catch (e) {
    nativeWordA = 0;
    nativeWordB = 0;
  }
  return [low, high, nativeWordA, nativeWordB, autoCounter];
}
