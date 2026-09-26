#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, statSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

var ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
var SCRIPTS = dirname(ROOT);
var minifier = join(SCRIPTS, 'agent-skills', 'adobe-extendscript-minification', 'scripts', 'minify-jsx.py');
var minConfig = join(SCRIPTS, 'agent-skills', 'adobe-extendscript-minification', 'configs', 'conservative.json');
var estc = join(SCRIPTS, 'extendscript-toolchain', 'bin', 'estc.mjs');
var python = process.env.ESRAND_PYTHON || 'python';

function need(path, label) {
  if (!existsSync(path)) {
    throw new Error(label + ' not found at ' + path + '. This maintainer-only release command expects the shared Scripts workspace tooling.');
  }
}

function run(command, args) {
  execFileSync(command, args, { cwd: ROOT, stdio: 'inherit', timeout: 300000 });
}

function assertNoDescriptorModuleHelpers(path) {
  var source = readFileSync(path, 'utf8');
  var forbidden = [
    'defineProperty',
    'getOwnPropertyDescriptor',
    'getOwnPropertyNames'
  ];
  for (var i = 0; i < forbidden.length; i++) {
    if (source.indexOf(forbidden[i]) !== -1) {
      throw new Error('forbidden ExtendScript module helper dependency ' + forbidden[i] + ': ' + path);
    }
  }
}

need(minifier, 'verified ExtendScript minifier');
need(minConfig, 'verified minifier config');
need(estc, 'shared ExtendScript toolchain');

// Official ExtendScript release artifacts are built through ESTC, not raw
// esbuild. ESTC localizes generated helper dependencies and enforces the
// conservative ES3/ExtendScript output profile.
run(process.execPath, [estc, 'build', '--config', 'extendscript.estc.config.mjs']);
run(process.execPath, [estc, 'build', '--config', 'extendscript.vendor.estc.config.mjs']);

copyFileSync(join(ROOT, 'dist/ESRAND.estc.jsx'), join(ROOT, 'dist/ESRAND.jsx'));
copyFileSync(join(ROOT, 'dist/vendor-esrand.estc.js'), join(ROOT, 'dist/vendor-esrand.js'));
try { unlinkSync(join(ROOT, 'dist/ESRAND.estc.jsx')); } catch (ignore) {}
try { unlinkSync(join(ROOT, 'dist/vendor-esrand.estc.js')); } catch (ignore) {}

var jobs = [
  ['dist/ESRAND.jsx', 'dist/ESRAND.min.jsx'],
  ['dist/vendor-esrand.js', 'dist/vendor-esrand.min.js']
];

for (var i = 0; i < jobs.length; i++) {
  run(python, [minifier, '--in', jobs[i][0], '--config', minConfig, '--out', jobs[i][1]]);
}

var checks = [
  'dist/ESRAND.jsx',
  'dist/ESRAND.min.jsx',
  'dist/vendor-esrand.js',
  'dist/vendor-esrand.min.js'
];
for (var j = 0; j < checks.length; j++) {
  run(process.execPath, [estc, 'check', checks[j], '--no-target']);
  assertNoDescriptorModuleHelpers(join(ROOT, checks[j]));
}

console.log('[release-build] artifacts');
for (var k = 0; k < checks.length; k++) {
  console.log('  ' + checks[k] + ' ' + statSync(join(ROOT, checks[k])).size + ' bytes');
}
console.log('  dist/esrand-core.esm.mjs ' + statSync(join(ROOT, 'dist/esrand-core.esm.mjs')).size + ' bytes');
