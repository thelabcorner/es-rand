#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

var ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
var SCRIPTS = dirname(ROOT);
var estc = join(SCRIPTS, 'extendscript-toolchain', 'bin', 'estc.mjs');

if (!existsSync(estc)) {
  throw new Error('shared ExtendScript toolchain not found at ' + estc);
}

var files = [
  'dist/ESRAND.jsx',
  'dist/ESRAND.min.jsx',
  'dist/vendor-esrand.js',
  'dist/vendor-esrand.min.js'
];

for (var i = 0; i < files.length; i++) {
  execFileSync(process.execPath, [estc, 'check', files[i], '--no-target', '--live', '--launch'], {
    cwd: ROOT,
    stdio: 'inherit',
    timeout: 300000
  });
}
