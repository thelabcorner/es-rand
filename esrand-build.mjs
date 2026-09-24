#!/usr/bin/env node
import { buildSync } from 'esbuild';
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

var ROOT = dirname(fileURLToPath(import.meta.url));
var DIST = join(ROOT, 'dist');
var ESM_ENTRY = join(ROOT, 'src', 'index.ts');
var JSX_ENTRY = join(ROOT, 'src', 'jsx-entry.ts');

mkdirSync(DIST, { recursive: true });

function stripStrict(path) {
  var s = readFileSync(path, 'utf8').replace(/"use strict";?\s*/g, '');
  writeFileSync(path, s);
  return s;
}

buildSync({
  entryPoints: [ESM_ENTRY],
  outfile: join(DIST, 'esrand-core.esm.mjs'),
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'es2019',
  logLevel: 'warning'
});

// JSX uses a safe one-export entry. This avoids old ExtendScript rejecting
// module-namespace object keys such as unquoted "float" or "int".
var bodyPath = join(DIST, '.jsx-entry.js');
buildSync({
  entryPoints: [JSX_ENTRY],
  outfile: bodyPath,
  bundle: true,
  format: 'iife',
  globalName: '__ESRAND_ENTRY__',
  platform: 'neutral',
  target: 'es5',
  logLevel: 'warning'
});
var body = stripStrict(bodyPath);

var standaloneFooter = [
  'var ESRAND = __ESRAND_ENTRY__.makeFacade();',
  ''
].join('\n');
writeFileSync(join(DIST, 'ESRAND.jsx'), body + '\n' + standaloneFooter);

var vendorFooter = [
  '(function () {',
  '  var g = null;',
  '  try { if (typeof $ !== "undefined" && $.global) { g = $.global; } } catch (e1) {}',
  '  if (!g) { try { g = (function () { return this; })(); } catch (e2) {} }',
  '  var built = __ESRAND_ENTRY__.makeFacade();',
  '  if (!g) { __ESRAND_ENTRY__.installed = built; return; }',
  '  var keep = false;',
  '  try {',
  '    var old = g.ESRAND;',
  '    var na = built.algorithm();',
  '    var oa = old && typeof old.algorithm === "function" ? old.algorithm() : null;',
  '    keep = !!(old && typeof old.version === "function" && old.version() === built.version() &&',
  '      oa && oa.id === na.id && oa.version === na.version && oa.seedVersion === na.seedVersion);',
  '    if (keep) { built = old; }',
  '  } catch (e3) { keep = false; }',
  '  if (!keep) { g.ESRAND = built; }',
  '  __ESRAND_ENTRY__.installed = built;',
  '})();',
  'var ESRAND = __ESRAND_ENTRY__.installed;',
  ''
].join('\n');
writeFileSync(join(DIST, 'vendor-esrand.js'), body + '\n' + vendorFooter);
try { unlinkSync(bodyPath); } catch (ignore) {}

console.log('[esrand-build] wrote dist/ESRAND.jsx, dist/vendor-esrand.js, dist/esrand-core.esm.mjs');
