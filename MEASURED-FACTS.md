# ESRAND measured facts

All measurements are scoped to the stated environment. They are evidence for
ESRAND v0.1.0, not universal claims about every ExtendScript host.

## Release gate — 2026-09-23

Portable verification:

- TypeScript: pass
- unit/reference suite: **28,277 assertions passed**
- MurmurHash3 x86_128 differential: **2,372 / 2,372** vectors match
  `murmurhash3js 3.0.1`
- frozen determinism fingerprint:
  `79f898bd424a75f6d8d53310bf30c1ab4ad790f1cd9011a9c987aa968f2e5b3b`
- deterministic/property fuzz: **58,334 checks passed**
- statistical/avalanche smoke: **8,499 checks passed**
- seed avalanche: **8,192 cases**, mean **64.0570068359375 changed bits / 128**,
  min 38, max 88

The statistical lane is a gross-defect detector and avalanche smoke test. It is
not cryptographic certification.

## ESTC side-effect entry repair — 2026-09-26

A later working-tree ESTC migration temporarily made the JSX entry an exported
module. ESTC/esbuild then synthesized module-namespace descriptor helpers that
were syntactically ES3-valid but failed at runtime in Illustrator because the
required `Object.defineProperty` descriptor path was unavailable.

The repair makes the ExtendScript entry side-effect-only, installs/preserves
`$.global.ESRAND` directly, and adds a build-time rejection gate for emitted
`defineProperty`, `getOwnPropertyDescriptor`, and `getOwnPropertyNames` helper
dependencies.

Portable verification after the repair:

- TypeScript: pass
- unit/reference suite: **28,277 assertions passed**
- MurmurHash3 differential: **2,372 / 2,372**
- determinism fingerprint: unchanged at
  `79f898bd424a75f6d8d53310bf30c1ab4ad790f1cd9011a9c987aa968f2e5b3b`
- deterministic/property fuzz: **58,334 checks passed**
- statistical smoke: **8,499 checks passed**
- all four current ExtendScript artifacts pass ESTC static ES3 checking
- forbidden descriptor-helper scan: **4 / 4 artifacts clean**

Current post-repair artifacts:

| Artifact | Bytes |
|---|---:|
| `dist/ESRAND.jsx` | **37,102** |
| `dist/ESRAND.min.jsx` | **27,485** |
| `dist/vendor-esrand.js` | **37,102** |
| `dist/vendor-esrand.min.js` | **27,485** |
| `dist/esrand-core.esm.mjs` | **50,772** |

Live V2 COM Tool evidence on Adobe Illustrator 30.6.0 / ExtendScript 4.5.6:

- ESRAND all-artifact wrapper/determinism probe: **67 / 67 checks passed**
- same-version facade identity and default-state preservation: pass
- fresh minified/unminified standalone and vendor loads: pass
- downstream ESUUID using the real rebuilt ESRAND artifact: **37 / 37 checks passed**
- no V1 COM fallback was required

Evidence: `evidence/illustrator-30.6.0-estc-wrapper-repair-2026-09-26.json`.

## Release artifact validation

Environment:

- Adobe Illustrator 30.6.0
- ExtendScript 4.5.6
- Windows

Official production JSX is built through ESTC, not raw esbuild.

Final release artifact sizes:

| Artifact | Bytes |
|---|---:|
| `dist/ESRAND.jsx` | **38,156** |
| `dist/ESRAND.min.jsx` | **28,529** |
| `dist/vendor-esrand.js` | **38,765** |
| `dist/vendor-esrand.min.js` | **29,006** |
| `dist/esrand-core.esm.mjs` | **50,772** |

Conservative minification reduced:

- standalone ESTC JSX: 38,156 → 28,529 bytes (**25.2%**)
- persistent vendor: 38,765 → 29,006 bytes (**25.2%**)

Validation:

- static conservative ESTC parse: **4 / 4 release ExtendScript artifacts pass**
- compile-only live Illustrator parse: **4 / 4 pass**
- unminified vendor behavioral parity: **11 / 11 exact groups**
- minified vendor behavioral parity: **11 / 11 exact groups**

Behavioral parity covers:

- package version / algorithm metadata
- number seed
- UTF-16 string seed
- array seed
- canonical direct-state vector
- jump state
- long-jump state
- `random32` / `float32`
- all current bulk-fill lanes
- same-version persistent facade reload
- default-state preservation across compatible reload

## Final v0.1.0 live benchmark

Evidence file:

`evidence/illustrator-30.6.0-live-benchmark-v0.1.0.json`

Environment:

- Adobe Illustrator 30.6.0
- ExtendScript 4.5.6
- Windows
- timing authority: ESTIMER engine lane
- 3 independent benchmark invocations
- each lane: 5 warmups + 9 measured samples
- aggregation: median of per-run ESTIMER medians
- rejected samples: 0 in the reported lanes

### Native reference

| Lane | Median µs/op | Run-median range |
|---|---:|---:|
| `Math.random()` | 0.348 | 0.316–0.535 |

### Construction

| Lane | Median µs/op | Run-median range |
|---|---:|---:|
| `create(number)` single | 15.0 | 15–25 |
| `create(number)` x5 | 13.2 | 12.8–22.4 |
| `create(number)` x25 | 12.4 | 12.28–13.92 |
| `create(string16)` single | 46.0 | 46–47 |
| `create(string16)` x25 | 43.56 | 43.12–43.76 |
| `create(string64)` single | 112.0 | 112–113 |

### Scalar generation

| Lane | Median µs/op | Run-median range |
|---|---:|---:|
| `uint32()` | **1.535** | 1.534–1.587 |
| `random32()` | **1.593** | 1.573–1.745 |
| `random()` 53-bit | **2.333** | 2.317–3.450 |
| `float32(-2.5,9.25)` | 2.521 | 2.507–2.542 |
| `float(-2.5,9.25)` | 3.189 | 3.187–3.360 |
| `int(0,999)` | **2.518** | 2.514–2.554 |
| `int(1e12,+999)` | 3.310 | 3.293–3.337 |
| `bool()` | 1.540 | 1.527–1.540 |
| `chance(0.25)` | 2.773 | 2.737–2.865 |
| `choice(16)` | 2.596 | 2.595–2.597 |

### Collections

| Lane | Median µs/op | Run-median range |
|---|---:|---:|
| `shuffle(64)` core | 80.08 | 79.36–127.20 |
| `shuffled(64)` | 96.96 | 95.96–101.32 |
| `sample(64,8)` | 17.40 | 17.40–17.44 |
| `sample(1000,8)` | **19.12** | 19.00–19.16 |
| `sample(10000,8)` | 47.80 | 47.60–66.00 |
| `sample(1000,500)` | 1,165.80 | 1,080.80–1,228.80 |

### Bytes / hex

| Lane | Median µs/op | Run-median range |
|---|---:|---:|
| `bytes(64)` | 26.99 | 26.19–27.47 |
| `hex(64)` | 27.36 | 24.81–28.34 |
| `fillBytes(64)` | **21.44** | 21.33–21.85 |

### Bulk fills

| Lane | Median µs/op | Run-median range |
|---|---:|---:|
| `fillUint32(64)` | 48.36 | 46.32–73.15 |
| `fillRandom32(64)` | 48.40 | 47.99–78.20 |
| `fillRandom(64)` | 98.67 | 95.20–124.41 |
| `fillFloat32(64)` | 54.77 | 53.93–58.11 |
| `fillFloat(64)` | 103.17 | 99.22–139.21 |
| `fillBool(64)` | 49.09 | 48.45–55.91 |
| `fillChance(64,0.25)` | 98.84 | 96.40–104.17 |
| `fillInt(64,0..999)` | 65.75 | 63.03–67.08 |
| `fillInt(64,-512..511)` | 52.87 | 50.89–54.70 |
| `fillInt(64,1e12..+999)` | 63.98 | 63.58–65.33 |

### State / facade overhead

| Lane | Median µs/op | Run-median range |
|---|---:|---:|
| `getState()` | 2.323 | 2.306–2.340 |
| `clone()` | 1.940 | 1.930–3.210 |
| facade `uint32()` | 1.935 | 1.906–1.944 |
| facade `random()` | 2.702 | 2.674–2.771 |
| facade `int(0,999)` | 2.986 | 2.961–3.043 |

## Native Math.random characterization

Environment:

- Adobe Illustrator 30.6.0
- ExtendScript 4.5.6
- Windows
- 20,000 calls

Final recorded probe:

- unique values: **14,965**
- collisions: **5,035**
- out-of-range: **0**
- minimum observed positive spacing: consistent with `1 / 32768`
- maximum observed value: consistent with `32767 / 32768`
- `x * 32768` integrality violations: **0 / 20,000**

A preceding independent 20,000-call probe recorded 14,920 unique values and the
same minimum spacing.

These runs support a host/version-scoped 1/32768-grid observation only. They do
not identify the native PRNG implementation.

## Determinism / seed evidence

Explicit seed v1 is:

```text
canonical tagged little-endian serialization
    -> MurmurHash3 x86_128(seed = 0x45535231 / "ESR1")
    -> four uint32 xoshiro128** state words
```

The current implementation includes optimized packed-word and fixed-length
Murmur paths. Their correctness is guarded by:

- 2,372 differential vectors against `murmurhash3js 3.0.1`;
- the frozen whole-surface SHA-256 determinism fingerprint;
- exact Node ↔ Illustrator seed/state parity.

See `docs/DETERMINISM.md` for the normative byte-level contract.
