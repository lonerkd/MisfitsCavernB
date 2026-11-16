#!/usr/bin/env node
// Is the STATE.md handoff still current? The "Resume here (handoff, YYYY-MM-DD)"
// date must not be more than MAX_LAG_DAYS older than the newest session note
// (.cavern-intelligence/sessions/YYYY-MM-DD-slug.md). Exit 1 with a message
// when it is; exit 0 otherwise. Runs in CI's `checks` job (BACKLOG 3.40c).
// The parsing lives in pure exported functions so it can be unit-tested
// (scripts/check-state-freshness.test.mjs).

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const MAX_LAG_DAYS = 3;

const HANDOFF = /## Resume here \(handoff, (\d{4}-\d{2}-\d{2})/;
const NOTE_PREFIX = /^(\d{4}-\d{2}-\d{2})-/;
const DAY_MS = 24 * 60 * 60 * 1000;

// The date in STATE.md's "## Resume here (handoff, YYYY-MM-DD" heading, or null.
export function parseHandoffDate(stateText) {
  const match = HANDOFF.exec(stateText);
  return match ? match[1] : null;
}

// The newest YYYY-MM-DD prefix among session note file names (README.md and
// other names without a date prefix are ignored), or null.
export function newestNoteDate(fileNames) {
  let newest = null;
  for (const name of fileNames) {
    const match = NOTE_PREFIX.exec(name);
    if (match && isRealDate(match[1]) && (newest === null || match[1] > newest)) newest = match[1];
  }
  return newest;
}

// Whole days from `from` to `to` (both YYYY-MM-DD), counted in UTC so the
// time zone and daylight saving never change the answer. Positive when `to`
// is later.
export function daysBetween(from, to) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

// The verdict: `handoff` is stale when it lags the newest note by more than
// `maxLag` days. A missing heading or a missing note is a failure too, because
// the check cannot prove freshness without them.
export function checkFreshness({ handoff, newest, maxLag = MAX_LAG_DAYS }) {
  if (!handoff) return { ok: false, message: 'STATE.md has no "## Resume here (handoff, YYYY-MM-DD" heading: restore it with the date of the last handoff.' };
  if (!newest) return { ok: false, message: 'No dated session note found in .cavern-intelligence/sessions/ (expected YYYY-MM-DD-slug.md).' };
  const lag = daysBetween(handoff, newest);
  if (lag > maxLag) {
    return {
      ok: false,
      lag,
      message: `STATE.md handoff is dated ${handoff}, but the newest session note is ${newest} (${lag} days later; the limit is ${maxLag}). Reread "Resume here" against the newest notes in .cavern-intelligence/sessions/, update what has changed, and set the handoff date to today.`,
    };
  }
  return { ok: true, lag, message: `STATE.md handoff (${handoff}) is within ${maxLag} days of the newest session note (${newest}).` };
}

function isRealDate(value) {
  const ms = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === value;
}

function main() {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const stateText = readFileSync(join(root, '.cavern-intelligence', 'STATE.md'), 'utf8');
  const notes = readdirSync(join(root, '.cavern-intelligence', 'sessions'));
  const result = checkFreshness({ handoff: parseHandoffDate(stateText), newest: newestNoteDate(notes) });
  if (result.ok) {
    console.log(result.message);
    return 0;
  }
  console.error(`check-state-freshness: ${result.message}`);
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main();
}
