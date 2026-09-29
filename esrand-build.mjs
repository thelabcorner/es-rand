#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { buildSync } from 'esbuild';
import { copyFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
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

function gitHead() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch (ignore) {
    return '';
  }
}

async function buildCompositionManifest() {
  var espackRoot = process.env.ESPACK_ROOT || join(ROOT, '..', 'espack');
  var librariesPath = join(espackRoot, 'espack-libraries.mjs');
  var buildPath = join(espackRoot, 'espack-build.mjs');
  if (!existsSync(librariesPath) || !existsSync(buildPath)) {
    console.log('[esrand-build] ESPACK v2 manifest skipped: sibling ESPACK is unavailable');
    return;
  }
  var packageInfo = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  var facadePath = join(DIST, 'ESRAND.facade.jsx');
  var facade = readFileSync(join(DIST, 'ESRAND.jsx'), 'utf8') +
    '\n// ESRAND.facade.jsx - loader-free ESRAND global activation for ESPACK v2 composition\n';
  writeFileSync(facadePath, facade, 'utf8');
  var buildApi = await import(new URL('../espack/espack-build.mjs', import.meta.url).href);
  var librariesApi = await import(new URL('../espack/espack-libraries.mjs', import.meta.url).href);
  var library = librariesApi.libraryFromFile({
    id: 'esrand',
    version: packageInfo.version,
    global: 'ESRAND',
    path: facadePath,
    contract: [
      { name: 'bytes', type: 'function' },
      { name: 'create', type: 'function' },
      { name: 'uint32', type: 'function' }
    ],
    provenance: {
      package: packageInfo.name,
      repository: packageInfo.repository && packageInfo.repository.url,
      commit: gitHead(),
      artifact: 'dist/ESRAND.facade.jsx'
    }
  });
  var manifest = buildApi.makeManifest({
    bundleName: 'esrand',
    cacheDir: '',
    payloads: [],
    accel: null,
    libraries: [library],
    entries: [{ id: 'esrand', range: '=' + packageInfo.version }]
  });
  writeFileSync(join(DIST, 'ESRAND.manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
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
await buildCompositionManifest();

console.log('[esrand-build] wrote standalone artifacts plus ESPACK v2 composition manifest');
