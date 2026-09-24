export var U32_SIZE = 4294967296;
export var MAX_SAFE_INTEGER_ES = 9007199254740991;

export function toUint32(value: number): number {
  return value >>> 0;
}

export function rotl32(value: number, shift: number): number {
  var x = value >>> 0;
  return ((x << shift) | (x >>> (32 - shift))) >>> 0;
}

/**
 * Exact low-32-bit multiplication using 16-bit limbs.
 * Equivalent to Math.imul(a, b) but valid in ES3 hosts where Math.imul is absent.
 */
export function imul32(a: number, b: number): number {
  var al = a & 0xffff;
  var ah = (a >>> 16) & 0xffff;
  var bl = b & 0xffff;
  var bh = (b >>> 16) & 0xffff;
  return (al * bl + (((ah * bl + al * bh) & 0xffff) << 16)) | 0;
}

/** MurmurHash3 fmix32 avalanche, expressed with exact ES3 imul32. */
export function fmix32(value: number): number {
  var h = value | 0;
  h ^= h >>> 16;
  h = imul32(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = imul32(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

export function isFiniteNumber(value: any): boolean {
  return typeof value === 'number' && isFinite(value);
}

export function isInteger(value: any): boolean {
  return isFiniteNumber(value) && Math.floor(value) === value;
}

export function isSafeInteger(value: any): boolean {
  return isInteger(value) && Math.abs(value) <= MAX_SAFE_INTEGER_ES;
}

export function isArrayValue(value: any): boolean {
  if (value === null || value === void 0) {
    return false;
  }
  try {
    return Object.prototype.toString.call(value) === '[object Array]';
  } catch (e) {
    return false;
  }
}
