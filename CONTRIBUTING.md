# Contributing

ESRAND targets Adobe ExtendScript's ES3-era runtime. A change is not complete
merely because TypeScript or Node accepts it.

## Local verification

```bash
npm ci
npm run verify
```

The portable CI gate covers type checking, build output, unit/reference vectors,
MurmurHash differential tests, the frozen determinism fingerprint, deterministic
property fuzzing, and statistical defect detectors.

## Illustrator verification

Maintainers with Adobe Illustrator available also run:

```bash
npm run live-verify
npm run live-benchmark:aggregate
```

Release artifacts additionally pass the shared ExtendScript toolchain/minifier
and live verification of the minified vendor bundle.

## Determinism contract

Changes to seeded output are breaking changes even when the public method
signatures stay the same. Before changing the generator transition, explicit
seed serialization/hash, scalar mapping, integer rejection math, byte order, or
jump constants, read `docs/DETERMINISM.md`.

The SHA-256 determinism fingerprint in
`tests/determinism-fingerprint.mjs` must not be updated merely to make a test
pass. A fingerprint change requires an intentional contract/version decision
and release-note migration guidance.

## Runtime rules

- Keep runtime code compatible with the generated ExtendScript artifacts.
- Do not assume modern built-ins such as `Math.imul`.
- Do not use `$.hiresTimer` directly; live timing belongs to ESTIMER.
- Do not replace Fisher-Yates with randomized `Array.sort`.
- Do not make ESRAND cryptographic by implication or wording.
- Preserve the JSX-safe facade handling for ES3 reserved names such as
  `float` and `int`.

## Pull requests

Keep changes focused and include the exact verification commands/results that
support correctness or performance claims.
