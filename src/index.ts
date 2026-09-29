import { ALGORITHM_ID, ALGORITHM_VERSION, SEED_VERSION, createGeneratorFromTrustedState, stateWordsFromSnapshot } from './generator';
import { autoSeedWords, stateFromSeed, stateFromSeedInto } from './seed';
import { AlgorithmInfo, CapabilityReport, RandGenerator, RandSnapshot, Seed } from './types';
import { U32_SIZE, MAX_SAFE_INTEGER_ES } from './u32';

var PACKAGE_VERSION = '0.2.0';
var defaultGenerator: RandGenerator | null = null;
var createStateScratch: number[] = [];
var createStateScratchBusy = false;

export function version(): string {
  return PACKAGE_VERSION;
}

export function algorithm(): AlgorithmInfo {
  return {
    id: ALGORITHM_ID,
    name: 'xoshiro128** 1.1',
    version: ALGORITHM_VERSION,
    seedVersion: SEED_VERSION,
    stateBits: 128,
    period: '2^128-1',
    cryptographic: false
  };
}

export function constants(): any {
  return {
    U32_SIZE: U32_SIZE,
    MAX_SAFE_INTEGER: MAX_SAFE_INTEGER_ES,
    ALGORITHM_ID: ALGORITHM_ID,
    ALGORITHM_VERSION: ALGORITHM_VERSION,
    SEED_VERSION: SEED_VERSION
  };
}

export function capabilities(): CapabilityReport {
  var engine = '';
  var hasEstimer = false;
  try {
    if (typeof $ !== 'undefined' && $) {
      if ($.version) { engine = String($.version); }
      if ($.global && $.global.ESTIMER) { hasEstimer = true; }
    }
  } catch (e) {
    engine = '';
  }
  return {
    engine: engine,
    algorithm: ALGORITHM_ID,
    nativeMathRandom: typeof Math.random === 'function',
    estimerPresent: hasEstimer,
    deterministic: true,
    cryptographic: false
  };
}

function createSeeded(seed: Seed): RandGenerator {
  if (!createStateScratchBusy) {
    createStateScratchBusy = true;
    try {
      stateFromSeedInto(seed, createStateScratch);
      // GeneratorCtor copies the four words synchronously before the scratch
      // buffer can be reused.
      return createGeneratorFromTrustedState(createStateScratch);
    } finally {
      createStateScratchBusy = false;
    }
  }

  // Re-entrant fallback (for example, an exotic array getter that calls back
  // into ESRAND while its outer seed is being serialized).
  return createGeneratorFromTrustedState(stateFromSeed(seed));
}

export function create(seed?: Seed): RandGenerator {
  if (arguments.length === 0 || seed === void 0) {
    return createSeeded(autoSeedWords());
  }
  return createSeeded(seed as Seed);
}

export function fromState(snapshotOrWords: RandSnapshot | number[]): RandGenerator {
  return createGeneratorFromTrustedState(stateWordsFromSnapshot(snapshotOrWords));
}

export function reseed(seed?: Seed): RandSnapshot {
  defaultGenerator = (arguments.length === 0 || seed === void 0) ? create() : create(seed as Seed);
  return defaultGenerator.getState();
}

export function getState(): RandSnapshot {
  if (defaultGenerator === null) { defaultGenerator = create(); }
  return defaultGenerator.getState();
}
export function setState(state: RandSnapshot | number[]): RandGenerator {
  defaultGenerator = fromState(state);
  return defaultGenerator;
}
export function uint32(): number {
  if (defaultGenerator === null) { defaultGenerator = create(); }
  return defaultGenerator.uint32();
}
export function int32(): number {
  if (defaultGenerator === null) { defaultGenerator = create(); }
  return defaultGenerator.int32();
}
export function random(): number {
  if (defaultGenerator === null) { defaultGenerator = create(); }
  return defaultGenerator.random();
}
export function random32(): number {
  if (defaultGenerator === null) { defaultGenerator = create(); }
  return defaultGenerator.random32();
}

// Safe implementation identifiers: float/int are reserved as standalone
// identifiers by ExtendScript. ESM re-exports the ergonomic names below.
export function floating(min: number, max: number): number {
  if (defaultGenerator === null) { defaultGenerator = create(); }
  return defaultGenerator['float'](min, max);
}
export function integer(min: number, max: number): number {
  if (defaultGenerator === null) { defaultGenerator = create(); }
  return defaultGenerator['int'](min, max);
}
export function float32(min: number, max: number): number {
  if (defaultGenerator === null) { defaultGenerator = create(); }
  return defaultGenerator.float32(min, max);
}

export function bool(): boolean {
  if (defaultGenerator === null) { defaultGenerator = create(); }
  return defaultGenerator.bool();
}
export function chance(probability: number): boolean {
  if (defaultGenerator === null) { defaultGenerator = create(); }
  return defaultGenerator.chance(probability);
}
export function choice<T>(values: ArrayLike<T>): T {
  if (defaultGenerator === null) { defaultGenerator = create(); }
  return defaultGenerator.choice(values);
}
export function sample<T>(values: ArrayLike<T>, count: number): T[] {
  if (defaultGenerator === null) { defaultGenerator = create(); }
  return defaultGenerator.sample(values, count);
}
export function shuffle<T>(values: T[]): T[] {
  if (defaultGenerator === null) { defaultGenerator = create(); }
  return defaultGenerator.shuffle(values);
}
export function shuffled<T>(values: ArrayLike<T>): T[] {
  if (defaultGenerator === null) { defaultGenerator = create(); }
  return defaultGenerator.shuffled(values);
}
export function bytes(count: number): number[] {
  if (defaultGenerator === null) { defaultGenerator = create(); }
  return defaultGenerator.bytes(count);
}
export function fillUint32(target: number[], count?: number): number[] {
  if (defaultGenerator === null) { defaultGenerator = create(); }
  return defaultGenerator.fillUint32(target, count);
}
export function fillRandom(target: number[], count?: number): number[] {
  if (defaultGenerator === null) { defaultGenerator = create(); }
  return defaultGenerator.fillRandom(target, count);
}
export function fillRandom32(target: number[], count?: number): number[] {
  if (defaultGenerator === null) { defaultGenerator = create(); }
  return defaultGenerator.fillRandom32(target, count);
}
export function fillFloat(target: number[], min: number, max: number, count?: number): number[] {
  if (defaultGenerator === null) { defaultGenerator = create(); }
  return defaultGenerator.fillFloat(target, min, max, count);
}
export function fillFloat32(target: number[], min: number, max: number, count?: number): number[] {
  if (defaultGenerator === null) { defaultGenerator = create(); }
  return defaultGenerator.fillFloat32(target, min, max, count);
}
export function fillBool(target: boolean[], count?: number): boolean[] {
  if (defaultGenerator === null) { defaultGenerator = create(); }
  return defaultGenerator.fillBool(target, count);
}
export function fillChance(target: boolean[], probability: number, count?: number): boolean[] {
  if (defaultGenerator === null) { defaultGenerator = create(); }
  return defaultGenerator.fillChance(target, probability, count);
}
export function fillInt(target: number[], min: number, max: number, count?: number): number[] {
  if (defaultGenerator === null) { defaultGenerator = create(); }
  return defaultGenerator.fillInt(target, min, max, count);
}
export function fillBytes(target: number[], count?: number): number[] {
  if (defaultGenerator === null) { defaultGenerator = create(); }
  return defaultGenerator.fillBytes(target, count);
}
export function hex(byteCount: number): string {
  if (defaultGenerator === null) { defaultGenerator = create(); }
  return defaultGenerator.hex(byteCount);
}
export function jump(): RandGenerator {
  if (defaultGenerator === null) { defaultGenerator = create(); }
  return defaultGenerator.jump();
}
export function longJump(): RandGenerator {
  if (defaultGenerator === null) { defaultGenerator = create(); }
  return defaultGenerator.longJump();
}
export function split(): RandGenerator {
  if (defaultGenerator === null) { defaultGenerator = create(); }
  return defaultGenerator.split();
}

// Modern ESM consumers retain the concise aliases. JSX builds use jsx-entry.ts,
// which constructs these two reserved property names by bracket assignment.
export { floating as float, integer as int };
