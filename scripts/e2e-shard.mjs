#!/usr/bin/env node
// Splits e2e/*.spec.ts across CI shards by how long each file takes, so no
// shard waits on the others. (Playwright's own --shard splits files by test
// count in name order, which put the three slowest files on one shard.)
//
//   node scripts/e2e-shard.mjs <shard> <total>    → the files for that shard
//   node scripts/e2e-shard.mjs --update <report>   → refresh e2e/timings.json
//                                                     from a Playwright JSON report
//
// Every spec in e2e/ lands on exactly one shard; a spec with no recorded time
// counts as the median, so a new one is never left out.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const TIMINGS = 'e2e/timings.json';
const specs = readdirSync('e2e').filter((f) => f.endsWith('.spec.ts')).sort();

if (process.argv[2] === '--update') {
  const report = JSON.parse(readFileSync(process.argv[3], 'utf8'));
  const secs = {};
  const walk = (suite) => {
    for (const spec of suite.specs ?? []) {
      for (const t of spec.tests) {
        const first = t.results[0];
        if (first) secs[spec.file] = (secs[spec.file] ?? 0) + first.duration / 1000;
      }
    }
    for (const s of suite.suites ?? []) walk(s);
  };
  for (const s of report.suites) walk(s);
  const out = Object.fromEntries(Object.keys(secs).sort().map((f) => [f, Math.round(secs[f])]));
  writeFileSync(TIMINGS, JSON.stringify(out, null, 2) + '\n');
  console.log(`${TIMINGS}: ${Object.keys(out).length} specs`);
  process.exit(0);
}

const shard = Number(process.argv[2]);
const total = Number(process.argv[3]);
if (!(shard >= 1 && shard <= total)) {
  console.error('usage: e2e-shard.mjs <shard> <total>  |  --update <playwright-report.json>');
  process.exit(2);
}

let known = {};
try { known = JSON.parse(readFileSync(TIMINGS, 'utf8')); } catch { /* no timings yet: all equal */ }
const values = Object.values(known).sort((a, b) => a - b);
const median = values.length ? values[Math.floor(values.length / 2)] : 1;
const weight = (f) => known[f] ?? median;

// Longest first onto the lightest shard (ties by name, so every shard agrees).
const bins = Array.from({ length: total }, () => ({ secs: 0, files: [] }));
for (const f of [...specs].sort((a, b) => weight(b) - weight(a) || a.localeCompare(b))) {
  const bin = bins.reduce((lo, b) => (b.secs < lo.secs ? b : lo));
  bin.secs += weight(f);
  bin.files.push(`e2e/${f}`);
}
process.stdout.write(bins[shard - 1].files.join(' '));
