import {
  algorithm, bool, bytes, capabilities, chance, choice, constants, create,
  fillBool, fillBytes, fillChance, fillFloat, fillFloat32, fillInt, fillRandom, fillRandom32, fillUint32, float32, floating, fromState,
  getState, hex, int32, integer, jump, longJump, random, random32, reseed, sample,
  setState, shuffle, shuffled, split, uint32, version
} from './index';

export function makeFacade(): any {
  var api: any = {
    version: version,
    algorithm: algorithm,
    constants: constants,
    capabilities: capabilities,
    create: create,
    fromState: fromState,
    reseed: reseed,
    getState: getState,
    setState: setState,
    uint32: uint32,
    int32: int32,
    random: random,
    random32: random32,
    float32: float32,
    bool: bool,
    chance: chance,
    choice: choice,
    sample: sample,
    shuffle: shuffle,
    shuffled: shuffled,
    bytes: bytes,
    fillUint32: fillUint32,
    fillRandom: fillRandom,
    fillRandom32: fillRandom32,
    fillFloat: fillFloat,
    fillFloat32: fillFloat32,
    fillBool: fillBool,
    fillChance: fillChance,
    fillInt: fillInt,
    fillBytes: fillBytes,
    hex: hex,
    jump: jump,
    longJump: longJump,
    split: split
  };
  api['float'] = floating;
  api['int'] = integer;
  return api;
}
