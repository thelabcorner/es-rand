<div align="center">

# ESRAND: Deterministic Random Infrastructure for Adobe ExtendScript (ES3)

## ExtendScript RANDom = E.S.RAND

### Seeded `xoshiro128**` streams, unbiased sampling, snapshots, stream splitting, and bulk generation for Adobe ExtendScript

[![Deterministic](https://img.shields.io/badge/deterministic-contract%20v1-success)](#validation)
[![Fuzz](https://img.shields.io/badge/fuzz-58%2C334%20checks-purple)](#validation)
[![MurmurHash3](https://img.shields.io/badge/MurmurHash3-2%2C372%2F2%2C372-purple)](#validation)
[![Illustrator](https://img.shields.io/badge/Illustrator%2030.6.0-11%2F11%20live-success)](#compatibility)
[![Engine](https://img.shields.io/badge/ExtendScript-ES3-green)](#compatibility)
[![Size](https://img.shields.io/badge/vendor.min-28.3%20KB-orange)](#which-artifact-should-i-use)
[![License](https://img.shields.io/badge/license-GPL%203.0--or--later-blue)](LICENSE)

</div>

---

## Part Of The Same Toolkit

> Production-grade infrastructure for Adobe ExtendScript.

<table>
<tr>
<td width="50%" valign="top">

### Runtime Primitives

**[ESON](https://github.com/thelabcorner/eson)**  
Strict RFC 8259 JSON for ExtendScript.

**[ESB64](https://github.com/thelabcorner/es-b64)**  
Base64 and UTF-8 utilities.

**[ESARR](https://github.com/thelabcorner/es-arr)**  
ES5+ Array compatibility methods.

**[ESSTR](https://github.com/thelabcorner/es-str)**  
String whitespace and trim methods.

**[ESCHARS](https://github.com/thelabcorner/es-chars)**  
Native bulk byte operations.

**[ESHTTP](https://github.com/thelabcorner/es-http)**  
HTTP transport for ExtendScript automation.

**[ESTIMER](https://github.com/thelabcorner/es-timer)**  
Microsecond timing for ExtendScript automation.

**[ESRAND](https://github.com/thelabcorner/es-rand)**  
Deterministic random streams and sampling for ExtendScript.

**[ESUUID](https://github.com/thelabcorner/es-uuid)**  
RFC 9562 UUID generation, parsing, and conversion for ExtendScript.

</td>
<td width="50%" valign="top">

### Build & Integration Tools

**[ESPACK](https://github.com/thelabcorner/espack)**  
Self-extracting ExternalObject bundles.

**[ESMIN](https://github.com/thelabcorner/es-min)**  
Minification for shipped JSX bundles.

**[ESABI](https://github.com/thelabcorner/esabi)**  
Modern ExternalObject ABI declarations for native integrations.

**[VectorIPC](https://github.com/thelabcorner/vector-ipc)**  
Bounded local IPC for scripting hosts and native plug-ins.

**[ESTC](https://github.com/thelabcorner/estc)**  
TypeScript-to-ExtendScript build, compatibility, and live-parse tooling.

**[ESDB](https://github.com/thelabcorner/esdb)**  
Native state and durable storage for Adobe tooling.

**[COMTool](https://github.com/thelabcorner/COMTool)**  
Guarded COM, ExtendScript, plug-in, and debugger automation for Adobe desktop apps.

**ESOBF** <sub>coming soon</sub>  
Obfuscation for hardened JSX distribution.

</td>
</tr>
</table>

Also from the same team: **[ArcFit.dev](https://arcfit.dev)**, deterministic arc warp for Illustrator.

---

## Table of Contents

- [Why ESRAND?](#why-esrand)
- [Features](#features)
- [Which artifact should I use?](#which-artifact-should-i-use)
- [Get the Release](#get-the-release)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Validation](#validation)
- [Performance](#performance)
- [Security Model](#security-model)
- [Compatibility](#compatibility)
- [Engine quirks that shaped the design](#engine-quirks-that-shaped-the-design)
- [Development](#development)
- [Repository layout](#repository-layout)
- [Known limitations](#known-limitations)
- [Credits](#credits)
- [License](#license)

---

## Why ESRAND?

ExtendScript exposes `Math.random()`, but it does not provide a reproducible random infrastructure layer: no seed input, no portable state snapshot, no versioned sequence contract, no unbiased bounded-integer helper, and no jump/split primitive for deterministic independent streams.

The native generator's output resolution is also host-specific. On **Adobe Illustrator 30.6.0 / ExtendScript 4.5.6**, a live 20,000-call probe observed:

- **14,965 distinct outputs** and **5,035 collisions**;
- **0 out-of-range outputs**;
- minimum positive spacing consistent with **`1 / 32768`**;
- **0 / 20,000 violations** of `x * 32768 === floor(x * 32768)`.

A preceding independent 20,000-call probe observed the same minimum spacing and 14,920 distinct values. Those measurements support only the host/version-scoped statement that Illustrator 30.6.0 / ExtendScript 4.5.6 emitted values on a **1/32768 grid during these probes**.

ESRAND makes the sequence explicit instead:

- `xoshiro128**` 1.1 with four 32-bit state words;
- canonical tagged seed serialization hashed with MurmurHash3 x86_128;
- 32-bit and 53-bit `[0,1)` lanes;
- unbiased inclusive integers;
- snapshot/restore;
- official `2^64` / `2^96` jumps;
- deterministic bulk-fill APIs.

---

## Features

- **Frozen deterministic contract v1** — algorithm version 1 and seed version 1 are embedded in snapshots and pinned by a SHA-256 whole-surface fingerprint.
- **128-bit generator state** — `xoshiro128**` 1.1 has period `2^128 - 1`; the all-zero state is rejected.
- **Canonical MurmurHash3 x86_128 seeding** — number, UTF-16 string, and finite `number[]` domains are type-tagged and differential-tested against `murmurhash3js`.
- **Two fraction lanes** — `random32()` consumes one word; `random()` combines 27 + 26 high bits from two words into a 53-bit binary64 fraction.
- **Unbiased inclusive integers** — rejection sampling removes modulo bias for widths up to `2^32`.
- **Fisher-Yates collection semantics** — `shuffle()`, `shuffled()`, and `sample()` never use a randomized sort comparator.
- **O(count) sparse sampling scratch** — small samples from large collections avoid copying the entire source while preserving partial-Fisher-Yates draw semantics.
- **Official stream partitioning** — `jump()`, `longJump()`, and `split()` use the published xoshiro jump polynomials.
- **Bulk generation** — fill arrays with uint32, 32/53-bit fractions, floats, booleans, Bernoulli draws, unbiased integers, and bytes without repeated facade overhead.
- **Versioned snapshots** — persisted state carries algorithm ID, algorithm version, seed version, and all four state words.
- **Persistent-engine reload preservation** — the vendor build retains an already-installed compatible `$.global.ESRAND` instead of silently resetting its default stream.
- **ESTC release output** — official ExtendScript assets are built through the shared ExtendScript toolchain, then conservatively minified and live parsed.
- **ESTIMER-only live timing** — ESRAND runtime code never reads `$.hiresTimer` directly.

---

## Which artifact should I use?

| Artifact | Size | Installs | Best for |
|---|---:|---|---|
| `ESRAND.min.jsx` | **27,485 B** | `$.global.ESRAND`, preserving a compatible facade | Recommended standalone release build |
| `vendor-esrand.min.js` | **27,485 B** | `$.global.ESRAND`, preserving a compatible facade | Recommended persistent/shared-engine build |
| `ESRAND.jsx` | **37,102 B** | `$.global.ESRAND`, preserving a compatible facade | Readable standalone debugging |
| `vendor-esrand.js` | **37,102 B** | `$.global.ESRAND`, preserving a compatible facade | Readable persistent-engine debugging |
| `esrand-core.esm.mjs` | **50,772 B** | ESM exports | Node reference/tests/tooling |

**Rule of thumb:** use `ESRAND.min.jsx` for a self-contained script and `vendor-esrand.min.js` when multiple scripts share ESRAND through a persistent ExtendScript engine. Their runtime facade semantics are intentionally identical; the names distinguish packaging intent.

The official JSX release artifacts are ESTC-normalized builds. `npm run build` emits the Node reference ESM plus readable ESTC JSX/vendor artifacts; `npm run build:release` adds conservative minification and final static portability gates. Both JSX paths intentionally require the shared sibling ESTC workspace.

---

## Get the Release

**[ESRAND v0.1.0](https://github.com/thelabcorner/es-rand/releases/tag/v0.1.0)** is the first public release.

Release assets:

- `ESRAND.min.jsx` — recommended standalone ExtendScript bundle;
- `vendor-esrand.min.js` — recommended persistent-engine vendor bundle;
- `ESRAND.jsx` and `vendor-esrand.js` — readable ESTC-normalized counterparts;
- `esrand-core.esm.mjs` — Node/reference ESM build;
- `esrand-v0.1.0.lock.json` — tag, commit, determinism fingerprint, sizes, and per-artifact SHA-256;
- `SHA256SUMS.txt` — release-asset checksums.

For reproducible production use, pin the **v0.1.0** tag or release asset rather than a mutable branch.

---

## Installation

### Standalone ExtendScript

Download `ESRAND.min.jsx` from the release and load/include it:

```jsx
#include "/absolute/path/to/ESRAND.min.jsx"

var rng = ESRAND.create("poster-v1");
var value = rng.uint32();
```

The standalone artifact deliberately contains no `#target illustrator`; the runtime core has no Illustrator DOM dependency.

### Persistent ExtendScript engine

```jsx
$.evalFile(File("/absolute/path/to/vendor-esrand.min.js"));

var rng = $.global.ESRAND.create("poster-v1");
var value = rng.uint32();
```

Re-evaluating a compatible vendor build preserves the existing installed facade and its lazy default stream.

### Source / Node reference build

```bash
git clone https://github.com/thelabcorner/es-rand.git
cd es-rand
npm ci
npm run verify
```

`npm run build` produces the Node ESM reference artifact plus development JSX. Official production JSX is generated by the maintainer `build:release` pipeline through the shared ESTC/minification toolchain.

---

## Quick Start

```jsx
var rng = ESRAND.create("cover-art-2026");

var fastUnit = rng.random32();      // one generator word
var unit = rng.random();            // full 53-bit construction
var die = rng.int(1, 6);            // inclusive, unbiased
var jitter = rng.float(-5, 5);
var enabled = rng.chance(0.25);

var order = ["ink", "type", "texture", "marks"];
rng.shuffle(order);

var picked = rng.sample(order, 2);

var bulk = [];
rng.fillUint32(bulk, 64);

var snapshot = rng.getState();
var next = rng.uint32();

var replay = ESRAND.fromState(snapshot);
var sameNext = replay.uint32();     // exactly equal to next
```

For reproducible work, prefer an explicit `ESRAND.create(seed)` generator over the lazily auto-seeded module-level convenience methods.

---

## API Reference

### Facade

The top-level `ESRAND` facade exposes:

| API | Behavior |
|---|---|
| `version()` | Package version. |
| `algorithm()` | Algorithm ID/version, seed version, state width, period, crypto flag. |
| `constants()` | Numeric/contract constants. |
| `capabilities()` | Runtime capability report. |
| `create(seed?)` | Independent generator; explicit seed is deterministic. |
| `fromState(snapshotOrWords)` | Restore from versioned snapshot or raw four-word expert state. |
| `reseed(seed?)` | Replace the lazy default generator. |
| `getState()` / `setState(...)` | Snapshot/restore the default generator. |

All scalar, collection, bulk, byte, and jump methods below are also exposed by the facade and forward to its lazy default generator.

### Scalar generation

| API | State use | Result |
|---|---:|---|
| `uint32()` | 1 word | unsigned 32-bit integer |
| `int32()` | 1 word | signed 32-bit integer |
| `random32()` | 1 word | `[0,1)`, `uint32 / 2^32` |
| `random()` | 2 words | 53-bit binary64 fraction in `[0,1)` |
| `float32(min,max)` | 1 word for unequal bounds | scaled `random32()` |
| `float(min,max)` | 2 words for unequal bounds | scaled 53-bit `random()` |
| `int(min,max)` | 1+ words when rejection is possible | unbiased inclusive safe integer |
| `bool()` | 1 word | high-bit boolean |
| `chance(p)` | 2 words | 53-bit Bernoulli draw |

Equal float bounds and singleton integer ranges return the sole value without consuming state.

### Collections

| API | Behavior |
|---|---|
| `choice(values)` | Uniform member selection; empty input throws. |
| `sample(values,count)` | Without replacement; exact partial-Fisher-Yates semantics with sparse remapping. |
| `shuffle(array)` | In-place Fisher-Yates; returns the same array. |
| `shuffled(values)` | Copies, shuffles, returns the copy. |

### Bulk generation

Each fill method writes from index 0 and returns the supplied target.

```text
fillUint32(target, count?)
fillRandom32(target, count?)
fillRandom(target, count?)
fillFloat32(target, min, max, count?)
fillFloat(target, min, max, count?)
fillBool(target, count?)
fillChance(target, probability, count?)
fillInt(target, min, max, count?)
fillBytes(target, count?)
```

When `count` is omitted, the target's existing length is used. Each bulk lane is contract-equivalent to repeated calls to its corresponding scalar operation.

### Bytes and hex

| API | Behavior |
|---|---|
| `bytes(count)` | Numeric byte array; four little-endian bytes per generator word. |
| `fillBytes(target,count?)` | Bulk form of canonical byte emission. |
| `hex(byteCount)` | Lowercase hex of the same generated byte stream. |

### State and streams

| API | Behavior |
|---|---|
| `getState()` | Versioned snapshot. |
| `setState(snapshotOrWords)` | Restore this generator. |
| `clone()` | Independent generator at the identical current state. |
| `jump()` | Official `2^64` xoshiro jump. |
| `longJump()` | Official `2^96` xoshiro long jump. |
| `split()` | Return clone at old state; advance parent by one `2^64` jump. |

Snapshot schema:

```js
{
  algorithm: "xoshiro128**",
  algorithmVersion: 1,
  seedVersion: 1,
  state: [s0, s1, s2, s3]
}
```

Persist the complete snapshot rather than raw words when long-term compatibility matters.

### Explicit seed v1

Explicit seeds support finite `number`, `string`, and finite `number[]`.

Canonical serialization is type-tagged and little-endian, then hashed with MurmurHash3 x86_128 using seed `0x45535231` (`"ESR1"`):

- numeric: `NUM1 || uint32(seed)`;
- string: `STR1 || u32(length) || UTF-16LE code units`;
- array: `ARR1 || u32(length) || u32(element)...`.

Numeric seeds are intentionally uint32-coerced, so `1` and `4294967297` identify the same numeric seed. Type domains stay distinct: `123`, `"123"`, and `[123]` do not alias.

The complete normative contract is in **[docs/DETERMINISM.md](docs/DETERMINISM.md)**.

---

## Validation

| Check | Command | Result |
|---|---|---|
| Strict TypeScript | `npm run typecheck` | pass |
| Unit/reference vectors | `npm test` | **28,277 assertions passed** |
| MurmurHash3 differential | `npm run murmur-differential` | **2,372 / 2,372** x86_128 vectors match `murmurhash3js 3.0.1` |
| Frozen sequence fingerprint | `npm run determinism-fingerprint` | **79f898bd…2e5b3b** |
| Deterministic/property fuzz | `npm run fuzz` | **58,334 checks passed** |
| Statistical + seed-avalanche smoke | `npm run statistical` | **8,499 checks passed**; 8,192-case avalanche mean **64.057 / 128 bits** |
| Release ES3 static checks | `npm run build:release` | **4 / 4** ExtendScript artifacts pass ESTC conservative parser checks |
| Release live compile-only parse | `npm run release:live-parse` | **4 / 4** pass on Illustrator 30.6.0 / ExtendScript 4.5.6 |
| Unminified vendor parity | release gate | **11 / 11** exact Node ↔ Illustrator groups |
| Minified vendor parity | `npm run live-verify:minified` | **11 / 11** exact Node ↔ Illustrator groups |

The frozen whole-surface fingerprint covers 512 seeded cases across raw words, 53-bit fractions, bounded integers, shuffled/sampled collections, bytes/hex, snapshots, and jump states.

The statistical suite is a deterministic gross-defect detector and avalanche smoke test. It is **not** a cryptographic certification.

---

## Performance

All ExtendScript timing is performed through **ESTIMER**. ESRAND runtime code never reads `$.hiresTimer` directly.

Environment:

```text
Adobe Illustrator 30.6.0
ExtendScript 4.5.6
Windows
ESTIMER engine timing lane
3 independent benchmark invocations
5 warmups + 9 measured samples per lane per invocation
reported value = median of per-run ESTIMER medians
0 rejected samples in the reported lanes
```

### Scalar and construction lanes

| Lane | Median µs/op | Run-median range µs/op |
|---|---:|---:|
| native `Math.random()` | 0.348 | 0.316–0.535 |
| `create(number)` single | 15.0 | 15–25 |
| `create(string16)` single | 46.0 | 46–47 |
| `create(string64)` single | 112.0 | 112–113 |
| `uint32()` | **1.535** | 1.534–1.587 |
| `random32()` | **1.593** | 1.573–1.745 |
| `random()` 53-bit | **2.333** | 2.317–3.450 |
| `float32(-2.5,9.25)` | 2.521 | 2.507–2.542 |
| `float(-2.5,9.25)` | 3.189 | 3.187–3.360 |
| `int(0,999)` | **2.518** | 2.514–2.554 |
| `bool()` | 1.540 | 1.527–1.540 |
| `chance(0.25)` | 2.773 | 2.737–2.865 |
| `choice(16)` | 2.596 | 2.595–2.597 |

### Collections and bulk lanes

| Lane | Median µs/op | Run-median range µs/op |
|---|---:|---:|
| `shuffle(64)` core | 80.08 | 79.36–127.20 |
| `shuffled(64)` | 96.96 | 95.96–101.32 |
| `sample(64,8)` | 17.40 | 17.40–17.44 |
| `sample(1000,8)` | **19.12** | 19.00–19.16 |
| `sample(10000,8)` | 47.80 | 47.60–66.00 |
| `bytes(64)` | 26.99 | 26.19–27.47 |
| `hex(64)` | 27.36 | 24.81–28.34 |
| `fillBytes(64)` | **21.44** | 21.33–21.85 |
| `fillUint32(64)` | 48.36 | 46.32–73.15 |
| `fillRandom32(64)` | 48.40 | 47.99–78.20 |
| `fillRandom(64)` | 98.67 | 95.20–124.41 |
| `fillInt(64,-512..511)` | 52.87 | 50.89–54.70 |

The native scalar remains faster. ESRAND spends additional time to provide explicit deterministic state, 32/53-bit mappings, unbiased bounded integers, snapshots, and jump-separated streams.

The complete structured benchmark record is in **[evidence/illustrator-30.6.0-live-benchmark-v0.1.0.json](evidence/illustrator-30.6.0-live-benchmark-v0.1.0.json)**.

---

## Security Model

ESRAND is a **non-cryptographic deterministic PRNG**.

The runtime does not evaluate strings, load native code, perform network I/O, write files, or replace `Math.random`. The persistent vendor artifact may install `$.global.ESRAND`; a compatible installed facade is retained on reload.

Automatic seeding mixes wall-clock milliseconds, two independent native `Math.random()` draws when available, and an engine-local counter, then feeds that array through seed contract v1. This is convenience entropy, not a CSPRNG.

Do not use ESRAND for:

- passwords;
- authentication/session tokens;
- cryptographic keys;
- security nonces;
- adversarial lotteries or financial fairness;
- any decision requiring unpredictable randomness against an attacker.

See **[SECURITY.md](SECURITY.md)** for vulnerability reporting.

---

## Compatibility

| Target | Status |
|---|---|
| Adobe Illustrator 30.6.0 / ExtendScript 4.5.6 | **Live verified: 11/11 exact behavioral groups; 4/4 release artifacts live parse** |
| Node 20 / 22 portable verification | CI matrix configured; local Node gate passes |
| ES3-compatible ExtendScript syntax | Official release artifacts pass ESTC's conservative ES3 parser/profile |
| Other Adobe ExtendScript hosts | Core is host-agnostic by design; **not yet live-verified** |
| Cryptographic use | Unsupported by design |

Official release JSX deliberately contains no `#target illustrator`; the runtime core has no Illustrator DOM dependency.

---

## Engine quirks that shaped the design

### Native `Math.random()` exposed a 1/32768 grid in the measured host

On Adobe Illustrator 30.6.0 / ExtendScript 4.5.6, the final 20,000-call probe produced 14,965 unique values and 5,035 collisions, with zero violations of `x * 32768 === floor(x * 32768)`.

That observation is version-scoped evidence, not a claim about every ExtendScript host.

### `Math.imul` is absent

The live host probe reports no `Math.imul`. ESRAND performs exact low-32-bit multiplication with 16-bit limbs and uses inlined fixed-constant equivalents in hot Murmur lanes.

### `float` and `int` are ES3 reserved identifiers

The early raw generated JSX failed at the parser when modern tooling materialized those names in unsafe syntactic positions. Public calls such as `rng.float(...)` remain ergonomic; the JSX facade constructs the reserved keys safely, and ESTC rewrites emitted representations to the portable profile.

### ESTC is the ExtendScript portability boundary

An exported esbuild/ESTC entry can synthesize module-namespace helpers around APIs such as `Object.defineProperty`, `Object.getOwnPropertyDescriptor`, and `Object.getOwnPropertyNames`. A live Illustrator 30.6.0 / ExtendScript 4.5.6 V2 probe demonstrated that the descriptor path is not available there, so syntactically valid output can still be runtime-invalid.

ESRAND therefore makes its ExtendScript entry **side-effect-only**: it installs or preserves `$.global.ESRAND` directly and exports no entry binding for esbuild to wrap. The build and release-build paths additionally reject any emitted artifact containing those descriptor-helper names. ESTC remains the normalization/type/lint boundary; plain esbuild remains only on the separate Node ESM surface.

### Persistent engines make stale-build verification possible

A same-version vendor reload intentionally preserves `$.global.ESRAND`. The live verifier first clears the installed global before loading the artifact under test, then separately verifies same-build reload preservation. This prevents a stale resident facade from masquerading as a successful verification run.

---

## Development

Portable gate:

```bash
npm ci
npm run verify
```

Illustrator development checks:

```bash
npm run live-verify
npm run live-benchmark:aggregate
npm run probe:math-random
```

Maintainer release gate inside the shared Scripts workspace:

```bash
npm run release:gate
npm run release:manifest
```

`release:gate` performs the portable verification suite, ESTC production build, conservative ExtendScript minification, static ES3 checks, four compile-only live parses, unminified behavioral parity, and minified behavioral parity.

`npm publish` is wired through the same gate via `prepublishOnly`; this is intentional. The publish lifecycle rebuilds and revalidates the same ESTC-owned artifacts that ship to ExtendScript.

---

## Repository layout

```text
src/
  generator.ts       xoshiro state machine + scalar/collection/bulk APIs
  seed.ts            canonical seed v1 serialization and optimized seed paths
  murmur128.ts       ES3-safe MurmurHash3 x86_128
  index.ts           modern/default facade
  jsx-entry.ts       ES3-safe JSX facade boundary
  types.ts           public TypeScript contracts
  u32.ts             exact 32-bit helpers

docs/
  DETERMINISM.md      normative v1 sequence contract
  RESEARCH.md         source selection and evidence notes

tests/
  esrand-test.mjs
  murmur-differential.mjs
  determinism-fingerprint.mjs
  fuzz.mjs
  statistical.mjs
  esrand-live-verify.mjs
  esrand-v2-live-probe.jsx
  minified-live-verify.mjs
  live-benchmark.mjs
  live-benchmark-aggregate.mjs
  math-random-live.mjs

evidence/
  measured live-host JSON records

tooling/
  release-build.mjs
  release-live-parse.mjs
  release-manifest.mjs
```

---

## Known limitations

- ESRAND is not cryptographic.
- Explicit numeric seeds are uint32-coerced by contract.
- Inclusive `int(min,max)` range width is limited to `2^32`, even when endpoints are larger safe integers.
- Other Adobe ExtendScript hosts have not yet received the same live behavioral certification as Illustrator 30.6.0.
- ExtendScript JSX builds require the shared sibling ESTC workspace used by the ES* projects. A standalone clone can run the portable Node verification, but canonical JSX emission intentionally has no raw-esbuild fallback.
- Statistical smoke tests detect gross defects; they do not replace a dedicated statistical-test battery or cryptographic analysis.

---

## Credits

ESRAND builds on:

- **David Blackman and Sebastiano Vigna** — xoshiro/xoroshiro family and the published `xoshiro128**` 1.1 jump constants: <https://prng.di.unimi.it/>;
- **Austin Appleby / SMHasher** — public-domain MurmurHash3 x86_128 reference: <https://github.com/aappleby/smhasher>;
- **Docs for Adobe / Types-for-Adobe** — ExtendScript and host typing/reference work: <https://github.com/docsforadobe/Types-for-Adobe>;
- **ESTIMER** — the sibling timing layer used for every reported live benchmark.

---

## License

GPL-3.0-or-later. See [LICENSE](LICENSE).

---

<p align="center"><small>ESRAND: deterministic random infrastructure for ExtendScript-era JavaScript.</small></p>
