#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

var ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
var pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
var tag = process.env.ESRAND_RELEASE_TAG || ('v' + pkg.version);
var commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
var fingerprintSource = readFileSync(join(ROOT, 'tests', 'determinism-fingerprint.mjs'), 'utf8');
var match = fingerprintSource.match(/const EXPECTED='([0-9a-f]{64})'/);
if (!match) throw new Error('could not read determinism fingerprint');

var artifactPaths = [
  'dist/ESRAND.jsx',
  'dist/ESRAND.min.jsx',
  'dist/ESRAND.facade.jsx',
  'dist/ESRAND.manifest.json',
  'dist/vendor-esrand.js',
  'dist/vendor-esrand.min.js',
  'dist/esrand-core.esm.mjs'
];

function digest(path) {
  var full = join(ROOT, path);
  var data = readFileSync(full);
  return {
    file: path.replace(/\\/g, '/'),
    bytes: statSync(full).size,
    sha256: createHash('sha256').update(data).digest('hex')
  };
}

var artifacts = [];
for (var i = 0; i < artifactPaths.length; i++) artifacts.push(digest(artifactPaths[i]));

var releaseDir = join(ROOT, 'release');
mkdirSync(releaseDir, { recursive: true });

var lockName = 'esrand-' + tag + '.lock.json';
var lock = {
  project: 'ESRAND',
  version: pkg.version,
  tag: tag,
  commit: commit,
  algorithm: 'xoshiro128**',
  algorithmVersion: 1,
  seedVersion: 1,
  determinismFingerprintSha256: match[1],
  artifacts: artifacts
};
writeFileSync(join(releaseDir, lockName), JSON.stringify(lock, null, 2) + '\n');

var sums = artifacts.map(function (a) {
  return a.sha256 + '  ' + a.file.replace(/^dist\//, '');
});
var lockData = readFileSync(join(releaseDir, lockName));
sums.push(createHash('sha256').update(lockData).digest('hex') + '  ' + lockName);
writeFileSync(join(releaseDir, 'SHA256SUMS.txt'), sums.join('\n') + '\n');

console.log('[release-manifest] ' + tag + ' @ ' + commit);
console.log('[release-manifest] fingerprint ' + match[1]);
console.log('[release-manifest] wrote release/' + lockName + ' and release/SHA256SUMS.txt');
