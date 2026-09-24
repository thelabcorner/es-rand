#!/usr/bin/env node
import { buildSync } from 'esbuild';
import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

var ROOT = dirname(fileURLToPath(import.meta.url));
var BUNDLE = join(ROOT, '.esrand-statistical.bundle.mjs');
buildSync({
  entryPoints: [join(ROOT, 'statistical-entry.ts')],
  outfile: BUNDLE,
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'es2019',
  logLevel: 'warning'
});
try {
  await import(pathToFileURL(BUNDLE).href + '?t=' + Date.now());
} finally {
  try { rmSync(BUNDLE); } catch (ignore) {}
}
