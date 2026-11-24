#!/usr/bin/env node
// Do the hand-written facts in the docs still match the repository? check-state-freshness.mjs only compares
// DATES, so a handoff whose date was bumped but whose content aged passed for two weeks. This compares claims
// with what is on disk:
//   fail  every workflow in .github/workflows/ is named in tools-and-access.md (a new one with no doc fails)
//   warn  STATE.md says production and staging match `main` "through <version>", but the newest migration
//         file is a later one (a migration is applied by hand AFTER merge, so this is advice, never a gate:
//         apply it, run the drift check, then update the line)
//   warn  the mobile audit's route count written in tools-and-access.md differs from the baseline's
// Usage: node scripts/check-state-facts.mjs [--quiet]. Exit 1 only on a `fail`. Pure functions are exported for tests.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// The first 14-digit version after "match `main`" ... "through" in STATE.md, or null.
export function claimedMigration(stateText) {
  const line = stateText.split('\n').find((l) => /match `main`/.test(l) && /through/.test(l));
  const m = line && /through\s+`?(\d{14})/.exec(line);
  return m ? m[1] : null;
}

// The newest 14-digit migration version among file names.
export function newestMigration(fileNames) {
  const versions = fileNames.map((n) => /^(\d{14})_/.exec(n)?.[1]).filter(Boolean).sort();
  return versions.length ? versions[versions.length - 1] : null;
}

// Workflow files whose name does not appear in the doc.
export function undocumentedWorkflows(workflowNames, docText) {
  return workflowNames.filter((n) => /\.ya?ml$/.test(n) && !docText.includes(n));
}

// "over N routes" in the doc's phone-audit row, or null.
export function claimedRouteCount(docText) {
  const m = /iPhone 15 Pro, portrait and landscape, over (\d+) routes/.exec(docText);
  return m ? Number(m[1]) : null;
}

// Distinct routes in the audit baseline ("portrait /x", "landscape /x").
export function baselineRouteCount(baseline) {
  return new Set(Object.keys(baseline).map((k) => k.replace(/^\w+ /, ''))).size;
}

export function findFacts({ stateText, migrationFiles, workflowFiles, toolsText, baseline }) {
  const out = [];
  const claimed = claimedMigration(stateText);
  const newest = newestMigration(migrationFiles);
  if (!claimed) out.push({ level: 'warn', message: 'STATE.md has no "match `main` ... through <version>" line for production and staging.' });
  else if (newest && claimed < newest) out.push({ level: 'warn', message: `STATE.md says production and staging match main through ${claimed}, but the newest migration is ${newest}. Apply it (database-and-security.md section 3), run the drift check, then update that line.` });
  for (const name of undocumentedWorkflows(workflowFiles, toolsText)) out.push({ level: 'fail', message: `.github/workflows/${name} is not described in tools-and-access.md. Add it to section 7 or 8.` });
  const routes = claimedRouteCount(toolsText);
  const actual = baseline ? baselineRouteCount(baseline) : null;
  if (routes !== null && actual !== null && routes !== actual) out.push({ level: 'warn', message: `tools-and-access.md says the phone audit covers ${routes} routes; the baseline has ${actual}.` });
  return out;
}

function main() {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const intel = join(root, '.cavern-intelligence');
  const findings = findFacts({
    stateText: readFileSync(join(intel, 'STATE.md'), 'utf8'),
    migrationFiles: readdirSync(join(root, 'supabase', 'migrations')),
    workflowFiles: readdirSync(join(root, '.github', 'workflows')),
    toolsText: readFileSync(join(intel, 'tools-and-access.md'), 'utf8'),
    baseline: JSON.parse(readFileSync(join(root, 'scripts', 'mobile-audit-baseline.json'), 'utf8')),
  });
  const quiet = process.argv.includes('--quiet');
  for (const f of findings) {
    const tag = f.level === 'fail' ? 'error' : 'warning';
    console.log(process.env.GITHUB_ACTIONS ? `::${tag}::${f.message}` : `${f.level.toUpperCase()}  ${f.message}`);
  }
  if (!findings.length && !quiet) console.log('The docs match the repository: migrations, workflows and audit routes.');
  return findings.some((f) => f.level === 'fail') ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = main();
