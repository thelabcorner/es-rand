export type Seed = number | string | number[];

export interface RandSnapshot {
  algorithm: string;
  algorithmVersion: number;
  seedVersion: number;
  state: number[];
}

export interface AlgorithmInfo {
  id: string;
  name: string;
  version: number;
  seedVersion: number;
  stateBits: number;
  period: string;
  cryptographic: boolean;
}

export interface CapabilityReport {
  engine: string;
  algorithm: string;
  nativeMathRandom: boolean;
  estimerPresent: boolean;
  deterministic: boolean;
  cryptographic: boolean;
}

export interface RandGenerator {
  uint32(): number;
  int32(): number;
  random(): number;
  random32(): number;
  float(min: number, max: number): number;
  float32(min: number, max: number): number;
  int(min: number, max: number): number;
  bool(): boolean;
  chance(probability: number): boolean;
  choice<T>(values: ArrayLike<T>): T;
  sample<T>(values: ArrayLike<T>, count: number): T[];
  shuffle<T>(values: T[]): T[];
  shuffled<T>(values: ArrayLike<T>): T[];
  bytes(count: number): number[];
  fillUint32(target: number[], count?: number): number[];
  fillRandom(target: number[], count?: number): number[];
  fillRandom32(target: number[], count?: number): number[];
  fillFloat(target: number[], min: number, max: number, count?: number): number[];
  fillFloat32(target: number[], min: number, max: number, count?: number): number[];
  fillBool(target: boolean[], count?: number): boolean[];
  fillChance(target: boolean[], probability: number, count?: number): boolean[];
  fillInt(target: number[], min: number, max: number, count?: number): number[];
  fillBytes(target: number[], count?: number): number[];
  hex(byteCount: number): string;
  getState(): RandSnapshot;
  setState(snapshotOrWords: RandSnapshot | number[]): RandGenerator;
  clone(): RandGenerator;
  jump(): RandGenerator;
  longJump(): RandGenerator;
  split(): RandGenerator;
}
