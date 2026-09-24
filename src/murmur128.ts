// MurmurHash3 x86_128, translated to ES3-safe TypeScript from Austin
// Appleby's public-domain reference implementation.
//
// Reference:
// https://github.com/aappleby/smhasher/blob/master/src/MurmurHash3.cpp
//
// The x86_128 variant is deliberately used here because ESRAND targets a
// 32-bit-bitwise JavaScript engine. All 32-bit multiplication flows through
// imul32(), so output is exact even when Math.imul is unavailable.
import { fmix32, imul32, rotl32 } from './u32';

var C1 = 0x239b961b;
var C2 = 0xab0e9789;
var C3 = 0x38b34ae5;
var C4 = 0xa1e38b93;

function readU32LE(bytes: number[], offset: number): number {
  return (
    (bytes[offset] & 255) |
    ((bytes[offset + 1] & 255) << 8) |
    ((bytes[offset + 2] & 255) << 16) |
    ((bytes[offset + 3] & 255) << 24)
  ) >>> 0;
}

function add32(a: number, b: number): number {
  return (a + b) >>> 0;
}

function mulAdd5(a: number, constant: number): number {
  return (imul32(a, 5) + constant) >>> 0;
}

export function murmurHash3x86_128(bytes: number[], seed?: number): number[] {
  var len = bytes.length >>> 0;
  var hashSeed = seed === void 0 ? 0 : seed >>> 0;
  var nblocks = Math.floor(len / 16);

  var h1 = hashSeed;
  var h2 = hashSeed;
  var h3 = hashSeed;
  var h4 = hashSeed;

  var i = 0;
  var offset = 0;
  var k1 = 0;
  var k2 = 0;
  var k3 = 0;
  var k4 = 0;

  for (i = 0; i < nblocks; i++) {
    offset = i * 16;
    k1 = readU32LE(bytes, offset);
    k2 = readU32LE(bytes, offset + 4);
    k3 = readU32LE(bytes, offset + 8);
    k4 = readU32LE(bytes, offset + 12);

    k1 = imul32(k1, C1) >>> 0;
    k1 = rotl32(k1, 15);
    k1 = imul32(k1, C2) >>> 0;
    h1 = (h1 ^ k1) >>> 0;

    h1 = rotl32(h1, 19);
    h1 = add32(h1, h2);
    h1 = mulAdd5(h1, 0x561ccd1b);

    k2 = imul32(k2, C2) >>> 0;
    k2 = rotl32(k2, 16);
    k2 = imul32(k2, C3) >>> 0;
    h2 = (h2 ^ k2) >>> 0;

    h2 = rotl32(h2, 17);
    h2 = add32(h2, h3);
    h2 = mulAdd5(h2, 0x0bcaa747);

    k3 = imul32(k3, C3) >>> 0;
    k3 = rotl32(k3, 17);
    k3 = imul32(k3, C4) >>> 0;
    h3 = (h3 ^ k3) >>> 0;

    h3 = rotl32(h3, 15);
    h3 = add32(h3, h4);
    h3 = mulAdd5(h3, 0x96cd1c35);

    k4 = imul32(k4, C4) >>> 0;
    k4 = rotl32(k4, 18);
    k4 = imul32(k4, C1) >>> 0;
    h4 = (h4 ^ k4) >>> 0;

    h4 = rotl32(h4, 13);
    h4 = add32(h4, h1);
    h4 = mulAdd5(h4, 0x32ac3b17);
  }

  // Tail. Fall-through is intentional and mirrors the canonical reference.
  offset = nblocks * 16;
  k1 = 0;
  k2 = 0;
  k3 = 0;
  k4 = 0;

  switch (len & 15) {
    case 15: k4 ^= (bytes[offset + 14] & 255) << 16;
    case 14: k4 ^= (bytes[offset + 13] & 255) << 8;
    case 13:
      k4 ^= bytes[offset + 12] & 255;
      k4 = imul32(k4, C4) >>> 0;
      k4 = rotl32(k4, 18);
      k4 = imul32(k4, C1) >>> 0;
      h4 = (h4 ^ k4) >>> 0;
    case 12: k3 ^= (bytes[offset + 11] & 255) << 24;
    case 11: k3 ^= (bytes[offset + 10] & 255) << 16;
    case 10: k3 ^= (bytes[offset + 9] & 255) << 8;
    case 9:
      k3 ^= bytes[offset + 8] & 255;
      k3 = imul32(k3, C3) >>> 0;
      k3 = rotl32(k3, 17);
      k3 = imul32(k3, C4) >>> 0;
      h3 = (h3 ^ k3) >>> 0;
    case 8: k2 ^= (bytes[offset + 7] & 255) << 24;
    case 7: k2 ^= (bytes[offset + 6] & 255) << 16;
    case 6: k2 ^= (bytes[offset + 5] & 255) << 8;
    case 5:
      k2 ^= bytes[offset + 4] & 255;
      k2 = imul32(k2, C2) >>> 0;
      k2 = rotl32(k2, 16);
      k2 = imul32(k2, C3) >>> 0;
      h2 = (h2 ^ k2) >>> 0;
    case 4: k1 ^= (bytes[offset + 3] & 255) << 24;
    case 3: k1 ^= (bytes[offset + 2] & 255) << 16;
    case 2: k1 ^= (bytes[offset + 1] & 255) << 8;
    case 1:
      k1 ^= bytes[offset] & 255;
      k1 = imul32(k1, C1) >>> 0;
      k1 = rotl32(k1, 15);
      k1 = imul32(k1, C2) >>> 0;
      h1 = (h1 ^ k1) >>> 0;
  }

  h1 = (h1 ^ len) >>> 0;
  h2 = (h2 ^ len) >>> 0;
  h3 = (h3 ^ len) >>> 0;
  h4 = (h4 ^ len) >>> 0;

  h1 = add32(add32(add32(h1, h2), h3), h4);
  h2 = add32(h2, h1);
  h3 = add32(h3, h1);
  h4 = add32(h4, h1);

  h1 = fmix32(h1);
  h2 = fmix32(h2);
  h3 = fmix32(h3);
  h4 = fmix32(h4);

  h1 = add32(add32(add32(h1, h2), h3), h4);
  h2 = add32(h2, h1);
  h3 = add32(h3, h1);
  h4 = add32(h4, h1);

  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}


function lowBytes(word: number, count: number): number {
  if (count >= 4) { return word >>> 0; }
  if (count === 3) { return word & 0x00ffffff; }
  if (count === 2) { return word & 0x0000ffff; }
  if (count === 1) { return word & 0x000000ff; }
  return 0;
}

/**
 * MurmurHash3 x86_128 over little-endian packed uint32 words.
 *
 * This is byte-for-byte equivalent to murmurHash3x86_128() when the supplied
 * words contain the same byte stream. It exists to let ESRAND's canonical seed
 * serializer avoid expanding aligned seed data into a much larger byte array.
 * The final partial word must have zeroes in bytes beyond byteLength.
 */
export function murmurHash3x86_128Words(words: number[], byteLength: number, seed?: number): number[] {
  var len = byteLength >>> 0;
  var hashSeed = seed === void 0 ? 0 : seed >>> 0;
  var nblocks = Math.floor(len / 16);

  var h1 = hashSeed;
  var h2 = hashSeed;
  var h3 = hashSeed;
  var h4 = hashSeed;

  var i = 0;
  var offset = 0;
  var k1 = 0;
  var k2 = 0;
  var k3 = 0;
  var k4 = 0;

  for (i = 0; i < nblocks; i++) {
    offset = i * 4;
    k1 = words[offset] >>> 0;
    k2 = words[offset + 1] >>> 0;
    k3 = words[offset + 2] >>> 0;
    k4 = words[offset + 3] >>> 0;

    k1 = imul32(k1, C1) >>> 0;
    k1 = ((k1 << 15) | (k1 >>> 17)) >>> 0;
    k1 = imul32(k1, C2) >>> 0;
    h1 = (h1 ^ k1) >>> 0;
    h1 = ((h1 << 19) | (h1 >>> 13)) >>> 0;
    h1 = (h1 + h2) >>> 0;
    h1 = (h1 * 5 + 0x561ccd1b) >>> 0;

    k2 = imul32(k2, C2) >>> 0;
    k2 = ((k2 << 16) | (k2 >>> 16)) >>> 0;
    k2 = imul32(k2, C3) >>> 0;
    h2 = (h2 ^ k2) >>> 0;
    h2 = ((h2 << 17) | (h2 >>> 15)) >>> 0;
    h2 = (h2 + h3) >>> 0;
    h2 = (h2 * 5 + 0x0bcaa747) >>> 0;

    k3 = imul32(k3, C3) >>> 0;
    k3 = ((k3 << 17) | (k3 >>> 15)) >>> 0;
    k3 = imul32(k3, C4) >>> 0;
    h3 = (h3 ^ k3) >>> 0;
    h3 = ((h3 << 15) | (h3 >>> 17)) >>> 0;
    h3 = (h3 + h4) >>> 0;
    h3 = (h3 * 5 + 0x96cd1c35) >>> 0;

    k4 = imul32(k4, C4) >>> 0;
    k4 = ((k4 << 18) | (k4 >>> 14)) >>> 0;
    k4 = imul32(k4, C1) >>> 0;
    h4 = (h4 ^ k4) >>> 0;
    h4 = ((h4 << 13) | (h4 >>> 19)) >>> 0;
    h4 = (h4 + h1) >>> 0;
    h4 = (h4 * 5 + 0x32ac3b17) >>> 0;
  }

  offset = nblocks * 4;
  var rem = len & 15;

  if (rem > 12) {
    k4 = lowBytes(words[offset + 3] >>> 0, rem - 12);
    k4 = imul32(k4, C4) >>> 0;
    k4 = ((k4 << 18) | (k4 >>> 14)) >>> 0;
    k4 = imul32(k4, C1) >>> 0;
    h4 = (h4 ^ k4) >>> 0;
  }
  if (rem > 8) {
    k3 = lowBytes(words[offset + 2] >>> 0, rem - 8);
    k3 = imul32(k3, C3) >>> 0;
    k3 = ((k3 << 17) | (k3 >>> 15)) >>> 0;
    k3 = imul32(k3, C4) >>> 0;
    h3 = (h3 ^ k3) >>> 0;
  }
  if (rem > 4) {
    k2 = lowBytes(words[offset + 1] >>> 0, rem - 4);
    k2 = imul32(k2, C2) >>> 0;
    k2 = ((k2 << 16) | (k2 >>> 16)) >>> 0;
    k2 = imul32(k2, C3) >>> 0;
    h2 = (h2 ^ k2) >>> 0;
  }
  if (rem > 0) {
    k1 = lowBytes(words[offset] >>> 0, rem);
    k1 = imul32(k1, C1) >>> 0;
    k1 = ((k1 << 15) | (k1 >>> 17)) >>> 0;
    k1 = imul32(k1, C2) >>> 0;
    h1 = (h1 ^ k1) >>> 0;
  }

  h1 = (h1 ^ len) >>> 0;
  h2 = (h2 ^ len) >>> 0;
  h3 = (h3 ^ len) >>> 0;
  h4 = (h4 ^ len) >>> 0;

  h1 = (h1 + h2 + h3 + h4) >>> 0;
  h2 = (h2 + h1) >>> 0;
  h3 = (h3 + h1) >>> 0;
  h4 = (h4 + h1) >>> 0;

  h1 = fmix32(h1);
  h2 = fmix32(h2);
  h3 = fmix32(h3);
  h4 = fmix32(h4);

  h1 = (h1 + h2 + h3 + h4) >>> 0;
  h2 = (h2 + h1) >>> 0;
  h3 = (h3 + h1) >>> 0;
  h4 = (h4 + h1) >>> 0;

  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}


/**
 * ExtendScript-optimized packed-word MurmurHash3 x86_128.
 *
 * Fixed-constant 32-bit multiplications are expanded into the same 16-bit-limb
 * arithmetic as imul32(). This removes expensive nested function calls in old
 * ExtendScript while remaining bit-identical to murmurHash3x86_128Words().
 */
export function murmurHash3x86_128WordsFast(words: number[], byteLength: number, seed?: number, output?: number[]): number[] {
  var len = byteLength >>> 0;
  var hashSeed = seed === void 0 ? 0 : seed >>> 0;
  var nblocks = Math.floor(len / 16);

  var h1 = hashSeed;
  var h2 = hashSeed;
  var h3 = hashSeed;
  var h4 = hashSeed;

  var i = 0, offset = 0;
  var k1 = 0, k2 = 0, k3 = 0, k4 = 0;
  var al = 0, ah = 0;

  for (i = 0; i < nblocks; i++) {
    offset = i * 4;
    k1 = words[offset] >>> 0;
    k2 = words[offset + 1] >>> 0;
    k3 = words[offset + 2] >>> 0;
    k4 = words[offset + 3] >>> 0;

    al = k1 & 0xffff; ah = (k1 >>> 16) & 0xffff;
    k1 = (al * 0x961b + (((ah * 0x961b + al * 0x239b) & 0xffff) << 16)) | 0;
    k1 = ((k1 << 15) | (k1 >>> 17)) >>> 0;
    al = k1 & 0xffff; ah = (k1 >>> 16) & 0xffff;
    k1 = (al * 0x9789 + (((ah * 0x9789 + al * 0xab0e) & 0xffff) << 16)) | 0;
    h1 = (h1 ^ k1) >>> 0;
    h1 = ((h1 << 19) | (h1 >>> 13)) >>> 0;
    h1 = (h1 + h2) >>> 0;
    h1 = (h1 * 5 + 0x561ccd1b) >>> 0;

    al = k2 & 0xffff; ah = (k2 >>> 16) & 0xffff;
    k2 = (al * 0x9789 + (((ah * 0x9789 + al * 0xab0e) & 0xffff) << 16)) | 0;
    k2 = ((k2 << 16) | (k2 >>> 16)) >>> 0;
    al = k2 & 0xffff; ah = (k2 >>> 16) & 0xffff;
    k2 = (al * 0x4ae5 + (((ah * 0x4ae5 + al * 0x38b3) & 0xffff) << 16)) | 0;
    h2 = (h2 ^ k2) >>> 0;
    h2 = ((h2 << 17) | (h2 >>> 15)) >>> 0;
    h2 = (h2 + h3) >>> 0;
    h2 = (h2 * 5 + 0x0bcaa747) >>> 0;

    al = k3 & 0xffff; ah = (k3 >>> 16) & 0xffff;
    k3 = (al * 0x4ae5 + (((ah * 0x4ae5 + al * 0x38b3) & 0xffff) << 16)) | 0;
    k3 = ((k3 << 17) | (k3 >>> 15)) >>> 0;
    al = k3 & 0xffff; ah = (k3 >>> 16) & 0xffff;
    k3 = (al * 0x8b93 + (((ah * 0x8b93 + al * 0xa1e3) & 0xffff) << 16)) | 0;
    h3 = (h3 ^ k3) >>> 0;
    h3 = ((h3 << 15) | (h3 >>> 17)) >>> 0;
    h3 = (h3 + h4) >>> 0;
    h3 = (h3 * 5 + 0x96cd1c35) >>> 0;

    al = k4 & 0xffff; ah = (k4 >>> 16) & 0xffff;
    k4 = (al * 0x8b93 + (((ah * 0x8b93 + al * 0xa1e3) & 0xffff) << 16)) | 0;
    k4 = ((k4 << 18) | (k4 >>> 14)) >>> 0;
    al = k4 & 0xffff; ah = (k4 >>> 16) & 0xffff;
    k4 = (al * 0x961b + (((ah * 0x961b + al * 0x239b) & 0xffff) << 16)) | 0;
    h4 = (h4 ^ k4) >>> 0;
    h4 = ((h4 << 13) | (h4 >>> 19)) >>> 0;
    h4 = (h4 + h1) >>> 0;
    h4 = (h4 * 5 + 0x32ac3b17) >>> 0;
  }

  offset = nblocks * 4;
  var rem = len & 15;

  if (rem > 12) {
    k4 = lowBytes(words[offset + 3] >>> 0, rem - 12);
    al = k4 & 0xffff; ah = (k4 >>> 16) & 0xffff;
    k4 = (al * 0x8b93 + (((ah * 0x8b93 + al * 0xa1e3) & 0xffff) << 16)) | 0;
    k4 = ((k4 << 18) | (k4 >>> 14)) >>> 0;
    al = k4 & 0xffff; ah = (k4 >>> 16) & 0xffff;
    k4 = (al * 0x961b + (((ah * 0x961b + al * 0x239b) & 0xffff) << 16)) | 0;
    h4 = (h4 ^ k4) >>> 0;
  }
  if (rem > 8) {
    k3 = lowBytes(words[offset + 2] >>> 0, rem - 8);
    al = k3 & 0xffff; ah = (k3 >>> 16) & 0xffff;
    k3 = (al * 0x4ae5 + (((ah * 0x4ae5 + al * 0x38b3) & 0xffff) << 16)) | 0;
    k3 = ((k3 << 17) | (k3 >>> 15)) >>> 0;
    al = k3 & 0xffff; ah = (k3 >>> 16) & 0xffff;
    k3 = (al * 0x8b93 + (((ah * 0x8b93 + al * 0xa1e3) & 0xffff) << 16)) | 0;
    h3 = (h3 ^ k3) >>> 0;
  }
  if (rem > 4) {
    k2 = lowBytes(words[offset + 1] >>> 0, rem - 4);
    al = k2 & 0xffff; ah = (k2 >>> 16) & 0xffff;
    k2 = (al * 0x9789 + (((ah * 0x9789 + al * 0xab0e) & 0xffff) << 16)) | 0;
    k2 = ((k2 << 16) | (k2 >>> 16)) >>> 0;
    al = k2 & 0xffff; ah = (k2 >>> 16) & 0xffff;
    k2 = (al * 0x4ae5 + (((ah * 0x4ae5 + al * 0x38b3) & 0xffff) << 16)) | 0;
    h2 = (h2 ^ k2) >>> 0;
  }
  if (rem > 0) {
    k1 = lowBytes(words[offset] >>> 0, rem);
    al = k1 & 0xffff; ah = (k1 >>> 16) & 0xffff;
    k1 = (al * 0x961b + (((ah * 0x961b + al * 0x239b) & 0xffff) << 16)) | 0;
    k1 = ((k1 << 15) | (k1 >>> 17)) >>> 0;
    al = k1 & 0xffff; ah = (k1 >>> 16) & 0xffff;
    k1 = (al * 0x9789 + (((ah * 0x9789 + al * 0xab0e) & 0xffff) << 16)) | 0;
    h1 = (h1 ^ k1) >>> 0;
  }

  h1 = (h1 ^ len) >>> 0;
  h2 = (h2 ^ len) >>> 0;
  h3 = (h3 ^ len) >>> 0;
  h4 = (h4 ^ len) >>> 0;

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

  var out = output === void 0 ? [] : output;
  out[0] = h1 >>> 0;
  out[1] = h2 >>> 0;
  out[2] = h3 >>> 0;
  out[3] = h4 >>> 0;
  out.length = 4;
  return out;
}


/**
 * Specialized MurmurHash3 x86_128 for exactly two little-endian uint32 words
 * (8 bytes). Numeric ESRAND seeds always serialize to this shape:
 * [NUMBER_TAG, uint32(seed)].
 *
 * This is the exact len=8 tail/finalization path of murmurHash3x86_128WordsFast
 * with generic array access, remainder branches, and scratch allocation removed.
 */
export function murmurHash3x86_128TwoWordsFast(
  word0: number,
  word1: number,
  seed?: number,
  output?: number[]
): number[] {
  var hashSeed = seed === void 0 ? 0 : seed >>> 0;
  var h1 = hashSeed;
  var h2 = hashSeed;
  var h3 = hashSeed;
  var h4 = hashSeed;
  var al = 0;
  var ah = 0;

  var k2 = word1 >>> 0;
  al = k2 & 0xffff; ah = (k2 >>> 16) & 0xffff;
  k2 = (al * 0x9789 + (((ah * 0x9789 + al * 0xab0e) & 0xffff) << 16)) | 0;
  k2 = ((k2 << 16) | (k2 >>> 16)) >>> 0;
  al = k2 & 0xffff; ah = (k2 >>> 16) & 0xffff;
  k2 = (al * 0x4ae5 + (((ah * 0x4ae5 + al * 0x38b3) & 0xffff) << 16)) | 0;
  h2 = (h2 ^ k2) >>> 0;

  var k1 = word0 >>> 0;
  al = k1 & 0xffff; ah = (k1 >>> 16) & 0xffff;
  k1 = (al * 0x961b + (((ah * 0x961b + al * 0x239b) & 0xffff) << 16)) | 0;
  k1 = ((k1 << 15) | (k1 >>> 17)) >>> 0;
  al = k1 & 0xffff; ah = (k1 >>> 16) & 0xffff;
  k1 = (al * 0x9789 + (((ah * 0x9789 + al * 0xab0e) & 0xffff) << 16)) | 0;
  h1 = (h1 ^ k1) >>> 0;

  h1 = (h1 ^ 8) >>> 0;
  h2 = (h2 ^ 8) >>> 0;
  h3 = (h3 ^ 8) >>> 0;
  h4 = (h4 ^ 8) >>> 0;

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

  var out = output === void 0 ? [] : output;
  out[0] = h1 >>> 0;
  out[1] = h2 >>> 0;
  out[2] = h3 >>> 0;
  out[3] = h4 >>> 0;
  out.length = 4;
  return out;
}
