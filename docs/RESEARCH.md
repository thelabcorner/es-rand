# ESRAND research notes

This document records source selection, measured host behavior, and the boundaries
of claims made by ESRAND v0.1.0.

## Generator source

ESRAND v1 uses `xoshiro128**` 1.1 by David Blackman and Sebastiano Vigna.

Primary references:

- <https://prng.di.unimi.it/>
- <https://prng.di.unimi.it/xoshiro128starstar.c>

The published reference supplies the generator transition/output function and the
official `2^64` jump / `2^96` long-jump constants used by ESRAND.

Why this family fits ExtendScript:

- 32-bit state words map directly onto JavaScript bitwise operators;
- no BigInt or 64-bit integer emulation is required;
- four-word state remains small enough for scripting workloads;
- the published jump polynomials provide deterministic stream partitioning;
- the generator is explicitly non-cryptographic, matching ESRAND's intended use.

The xoshiro authors' material is the source of the generator algorithm. ESRAND's
seed serialization and API mappings are separate, documented contracts.

## Seed hash source

Explicit seed contract v1 serializes the seed domain canonically and hashes the
result with **MurmurHash3 x86_128**.

Primary reference:

- Austin Appleby's public-domain SMHasher implementation:
  <https://github.com/aappleby/smhasher/blob/master/src/MurmurHash3.cpp>

ESRAND uses the x86_128 variant because the target runtime has 32-bit bitwise
operators and no `Math.imul`.

The release gate differential-tests ESRAND's generic/optimized x86_128 paths
against `murmurhash3js 3.0.1` on **2,372 vectors**.

The canonical seed format, tag words, hash seed, all-zero-state repair, and
snapshot compatibility rules are defined normatively in
[DETERMINISM.md](DETERMINISM.md).

## Why not native Math.random?

Adobe Illustrator's scripting examples use `Math.random()`, so the native
primitive is legitimate for ordinary convenience randomness.

ESRAND's goals are different: explicit seeding, replayable state, exact
cross-runtime sequences, unbiased bounded integers, snapshots, and stream
partitioning.

A live characterization on:

- Adobe Illustrator 30.6.0
- ExtendScript 4.5.6
- Windows
- 2026-09-23

sampled 20,000 native outputs and observed:

- 14,965 distinct values
- 5,035 repeated samples
- 0 out-of-range values
- minimum positive spacing consistent with `1 / 32768`
- 0 / 20,000 violations of
  `x * 32768 === floor(x * 32768)`

A preceding independent 20,000-call run produced 14,920 distinct values and the
same minimum spacing.

That supports the narrow host/version-scoped statement that Illustrator
30.6.0 / ExtendScript 4.5.6 emitted values on a 1/32768 grid during the probes.
It does **not** identify the underlying native algorithm and does not imply all
ExtendScript hosts behave the same way.

Native `Math.random()` remains one ingredient in ESRAND's automatic
(non-reproducible, non-cryptographic) seeding path.

## Why both random32() and random()?

The xoshiro engine emits a 32-bit word per step.

`random32()` maps one complete word directly to `[0,1)` by dividing by
`2^32`. It is the lower-cost fraction lane.

`random()` consumes two words, takes 27 + 26 high bits, and constructs a
53-bit binary64 fraction. This follows the common high-resolution JavaScript
mapping used when the caller values fraction resolution over one-word state
consumption.

Both mappings are frozen by the determinism contract.

## Why rejection sampling for integers?

A direct `uint32() % width` mapping is biased whenever `width` does not
divide `2^32`.

ESRAND rejects the high tail above the greatest multiple of `width` that
fits inside the uint32 domain, then applies modulo. The same contract is used by
`int()`, `choice()`, Fisher-Yates index draws, and `fillInt()`.

Bulk power-of-two ranges may use a bit mask where it is exactly equivalent to
modulo and the rejection domain is the full uint32 range.

## Why sparse remapping for sample()?

A conventional partial Fisher-Yates implementation begins by copying the entire
input, which makes small samples from large array-like values pay `O(length)`
copy cost.

ESRAND's current implementation stores only logical positions that diverge
from their original index. It preserves the same partial-Fisher-Yates index
selection and RNG draw sequence while using `O(count)` temporary remap
storage.

The final v0.1.0 live benchmark measured:

- `sample(64,8)`: 17.40 µs
- `sample(1000,8)`: 19.12 µs
- `sample(10000,8)`: 47.80 µs

on Illustrator 30.6.0 / ExtendScript 4.5.6 using ESTIMER.

## ExtendScript arithmetic choices

Illustrator 30.6.0 / ExtendScript 4.5.6 does not expose `Math.imul`.

ESRAND therefore implements exact low-32-bit multiplication using 16-bit limbs.
The optimized Murmur seed paths inline fixed-constant versions of the same
arithmetic to avoid expensive nested function calls in the old engine.

The xoshiro hot state is stored as signed int32 values internally. This is
mathematically equivalent modulo `2^32`; outputs and snapshots normalize to
uint32. The frozen fingerprint proves the optimized representation has not
changed the v1 sequence.

## Build portability

Plain esbuild IIFE output may materialize helper calls to APIs such as
`Object.defineProperty`, `Object.getOwnPropertyDescriptor`, and
`Object.getOwnPropertyNames`.

Illustrator 30.6.0 exposes those APIs, but ESRAND does not make that
version-specific availability the portability contract.

Official release JSX is therefore produced through the shared ExtendScript
Toolchain (ESTC), which:

- localizes known generated-helper dependencies;
- normalizes output to the conservative ES3/ExtendScript profile;
- checks emitted syntax and reserved-property behavior;
- supports compile-only live Illustrator parsing.

Release artifacts are then conservatively minified using the verified
ExtendScript minification pipeline and tested again in the live engine.

## Timing discipline

ESRAND never reads `$.hiresTimer` directly.

All ExtendScript timings reported by this project use sibling project
**ESTIMER**, which owns:

- first-read/priming behavior;
- engine timer delta semantics;
- wrap handling;
- sample validation/rejection;
- medians and metadata.

This separation is intentional:

- ESRAND owns randomness;
- ESTIMER owns timing.

No performance number should be generalized to another Adobe host/version
without a fresh ESTIMER-backed run.

## Security boundary

ESRAND is **not a cryptographic random-number generator**.

Do not use ESRAND-generated values for:

- passwords
- authentication/session tokens
- cryptographic keys
- security nonces
- adversarial lotteries
- financial/security decisions requiring unpredictable randomness

Its intended jobs are deterministic procedural work, randomized testing,
sampling, shuffling, simulation, reproducible fixtures, randomized layout, and
other non-adversarial scripting tasks.

A future OS-CSPRNG bridge, if created, should be a separate capability and must
not alter the deterministic xoshiro contract.
