#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

var ROOT = dirname(fileURLToPath(import.meta.url));
var args = process.argv.slice(2);
var runCount = 3;
var outPath = '';

for (var ai = 0; ai < args.length; ai++) {
  if (args[ai] === '--runs' && ai + 1 < args.length) {
    runCount = Number(args[++ai]);
  } else if (args[ai] === '--out' && ai + 1 < args.length) {
    outPath = args[++ai];
  }
}
if (!Number.isInteger(runCount) || runCount < 1 || runCount > 20) {
  throw new Error('--runs must be an integer in [1,20]');
}

function median(values) {
  var copy = values.slice().sort(function (a, b) { return a - b; });
  var mid = Math.floor(copy.length / 2);
  return copy.length % 2 ? copy[mid] : (copy[mid - 1] + copy[mid]) / 2;
}

function parseReport(stdout) {
  var lines = stdout.trim().split(/\r?\n/);
  for (var i = lines.length - 1; i >= 0; i--) {
    if (lines[i].charAt(0) === '{') {
      var value = JSON.parse(lines[i]);
      if (value && value.host && value.lanes) return value;
    }
  }
  throw new Error('live benchmark produced no structured JSON report');
}

var reports = [];
for (var run = 0; run < runCount; run++) {
  process.stderr.write('[aggregate] live benchmark ' + (run + 1) + '/' + runCount + '\n');
  var stdout = execFileSync(process.execPath, [join(ROOT, 'live-benchmark.mjs')], {
    encoding: 'utf8',
    timeout: 300000
  });
  reports.push(parseReport(stdout));
}

var first = reports[0];
var laneMap = {};
for (var r = 0; r < reports.length; r++) {
  var report = reports[r];
  if (report.host !== first.host || report.engine !== first.engine) {
    throw new Error('benchmark host/engine changed between runs');
  }
  for (var li = 0; li < report.lanes.length; li++) {
    var lane = report.lanes[li];
    if (!laneMap[lane.lane]) {
      laneMap[lane.lane] = {
        lane: lane.lane,
        batch: lane.batch,
        medianUsRuns: [],
        usPerOpRuns: [],
        rejectedTotal: 0
      };
    }
    var row = laneMap[lane.lane];
    if (row.batch !== lane.batch) {
      throw new Error('batch changed between runs for ' + lane.lane);
    }
    row.medianUsRuns.push(lane.medianUs);
    row.usPerOpRuns.push(lane.usPerOp);
    row.rejectedTotal += lane.rejected || 0;
  }
}

var aggregated = [];
var laneNames = Object.keys(laneMap);
for (var ni = 0; ni < laneNames.length; ni++) {
  var row = laneMap[laneNames[ni]];
  aggregated.push({
    lane: row.lane,
    batch: row.batch,
    medianOfMedianUs: median(row.medianUsRuns),
    medianUsPerOp: median(row.usPerOpRuns),
    minUsPerOpAcrossRuns: Math.min.apply(Math, row.usPerOpRuns),
    maxUsPerOpAcrossRuns: Math.max.apply(Math, row.usPerOpRuns),
    rejectedTotal: row.rejectedTotal,
    runUsPerOp: row.usPerOpRuns
  });
}

var result = {
  generatedAt: new Date().toISOString(),
  runs: runCount,
  host: first.host,
  engine: first.engine,
  timer: first.timer,
  aggregation: 'median of per-run ESTIMER medians',
  lanes: aggregated
};

console.log('ESRAND live benchmark aggregate — ' + first.host + ' / ExtendScript ' + first.engine);
console.log('runs=' + runCount + '; aggregation=median of per-run ESTIMER medians');
for (var oi = 0; oi < aggregated.length; oi++) {
  var x = aggregated[oi];
  console.log(
    x.lane + ': ' + x.medianUsPerOp + ' us/op' +
    ' [runs ' + x.minUsPerOpAcrossRuns + ' .. ' + x.maxUsPerOpAcrossRuns + ']'
  );
}

if (outPath) {
  var abs = resolve(process.cwd(), outPath);
  writeFileSync(abs, JSON.stringify(result, null, 2) + '\n');
  console.log('wrote ' + abs);
}

console.log(JSON.stringify(result));
