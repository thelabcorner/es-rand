#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

var ROOT = dirname(fileURLToPath(import.meta.url));
var verifier = join(ROOT, 'esrand-live-verify.mjs');

execFileSync(process.execPath, [verifier], {
  stdio: 'inherit',
  env: Object.assign({}, process.env, {
    ESRAND_VENDOR_FILE: 'dist/vendor-esrand.min.js'
  }),
  timeout: 300000
});
