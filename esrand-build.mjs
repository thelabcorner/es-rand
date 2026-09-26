#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { buildSync } from 'esbuild';
import { copyFileSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

var ROOT = dirname(fileURLToPath(import.meta.url));
var DIST = join(ROOT, 'dist');
var ESM_ENTRY = join(ROOT, 'src', 'index.ts');
var ESTC = join(ROOT, '..', 'extendscript-toolchain', 'bin', 'estc.mjs');

mkdirSync(DIST, { recursive: true });

// Node ESM is a separate host surface and remains an ordinary esbuild bundle.
buildSync({
  entryPoints: [ESM_ENTRY],
  outfile: join(DIST, 'esrand-core.esm.mjs'),
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'es2019',
  logLevel: 'warning'
});

function estcBuild(config) {
  execFileSync(process.execPath, [ESTC, 'build', '--config', config], {
    cwd: ROOT,
    stdio: 'inherit'
  });
}

function assertNoDescriptorModuleHelpers(path) {
  var source = readFileSync(path, 'utf8');
  var forbidden = ['defineProperty', 'getOwnPropertyDescriptor', 'getOwnPropertyNames'];
  for (var i = 0; i < forbidden.length; i++) {
    if (source.indexOf(forbidden[i]) !== -1) {
      throw new Error(
        'ExtendScript artifact contains forbidden esbuild module helper dependency ' +
        forbidden[i] + ': ' + path + '. Keep JSX entry points side-effect-only.'
      );
    }
  }
}

// ESTC is the sole ExtendScript emitter. It owns source linting, host-aware
// typing, ES3 normalization, helper localization, and conservative checking.
estcBuild('./extendscript.estc.config.mjs');
estcBuild('./extendscript.vendor.estc.config.mjs');

copyFileSync(join(DIST, 'ESRAND.estc.jsx'), join(DIST, 'ESRAND.jsx'));
copyFileSync(join(DIST, 'vendor-esrand.estc.js'), join(DIST, 'vendor-esrand.js'));
try { unlinkSync(join(DIST, 'ESRAND.estc.jsx')); } catch (ignore) {}
try { unlinkSync(join(DIST, 'vendor-esrand.estc.js')); } catch (ignore2) {}

assertNoDescriptorModuleHelpers(join(DIST, 'ESRAND.jsx'));
assertNoDescriptorModuleHelpers(join(DIST, 'vendor-esrand.js'));

console.log('[esrand-build] wrote dist/ESRAND.jsx and dist/vendor-esrand.js via ESTC; wrote dist/esrand-core.esm.mjs for Node');
