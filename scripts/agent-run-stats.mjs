#!/usr/bin/env node
// What did one Claude worker run cost? Reads the execution log the action leaves behind and prints
// a comment for the issue it worked: turns, time, cost, refused tool calls. The comment carries a
// machine-readable marker, and scripts/agent-status.mjs adds the recent ones up.
//
//   node scripts/agent-run-stats.mjs <execution-output.json> [--run-url URL]
//
// Prints nothing (and exits 0) when the log is missing or has no result, so a run that died early
// does not fail the workflow. The dollar figure is what the run would cost at API prices: a run on a
// Claude subscription draws on its usage limits instead, so it is a measure of size, not a bill.
import { readFileSync } from 'node:fs';

export const MARKER = 'agent-run';

const num = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);

/** The numbers worth keeping from the action's execution log (an array of messages), or null. */
export function summarize(messages) {
  const list = Array.isArray(messages) ? messages : [];
  const result = [...list].reverse().find((m) => m && m.type === 'result');
  if (!result) return null;
  const init = list.find((m) => m && m.type === 'system' && m.subtype === 'init');
  return {
    turns: Math.round(num(result.num_turns)),
    costUsd: Math.round(num(result.total_cost_usd) * 10000) / 10000,
    durationMs: Math.round(num(result.duration_ms)),
    denials: Array.isArray(result.permission_denials) ? result.permission_denials.length : Math.round(num(result.permission_denials_count)),
    failed: Boolean(result.is_error),
    model: typeof init?.model === 'string' ? init.model.slice(0, 60) : null,
  };
}

const minutes = (ms) => {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
};

/**
 * The comment for the issue.
 * @param {{ turns: number, costUsd: number, durationMs: number, denials: number, failed: boolean, model?: string | null }} stats
 * @param {{ runUrl?: string | null }} [options]
 */
export function commentBody(stats, { runUrl = null } = {}) {
  const data = { ...stats, runUrl: typeof runUrl === 'string' ? runUrl.slice(0, 200) : null };
  // JSON inside an HTML comment must never contain "--": escape every dash (they only occur inside strings).
  const marker = `<!-- ${MARKER}:${JSON.stringify(data).replace(/-/g, '\\u002d')} -->`;
  const parts = [
    `${stats.turns} turn${stats.turns === 1 ? '' : 's'}`,
    minutes(stats.durationMs),
    `about $${stats.costUsd.toFixed(2)} at API prices`,
    stats.denials ? `${stats.denials} tool call${stats.denials === 1 ? '' : 's'} refused` : 'nothing refused',
  ];
  return [
    marker,
    `**Claude worker run${stats.failed ? ' (failed)' : ''}:** ${parts.join(', ')}.${runUrl ? ` [Run log](${runUrl})` : ''}`,
    '',
    '<sub>On a subscription this draws on its usage limits rather than costing the dollar figure; it is a measure of how big the run was.</sub>',
  ].join('\n');
}

/** The stats back out of a comment body, or null when it has no (valid) marker. */
export function parseMarker(body) {
  const match = new RegExp(`<!-- ${MARKER}:(\\{.*?\\}) -->`, 's').exec(String(body ?? ''));
  if (!match) return null;
  try {
    const raw = JSON.parse(match[1]);
    return {
      turns: Math.round(num(raw.turns)),
      costUsd: num(raw.costUsd),
      durationMs: Math.round(num(raw.durationMs)),
      denials: Math.round(num(raw.denials)),
      failed: Boolean(raw.failed),
    };
  } catch {
    return null;
  }
}

/** Totals and averages over a list of parsed runs. */
export function aggregate(runs) {
  const total = (key) => runs.reduce((sum, r) => sum + r[key], 0);
  const count = runs.length;
  return {
    runs: count,
    failed: runs.filter((r) => r.failed).length,
    turns: total('turns'),
    costUsd: Math.round(total('costUsd') * 100) / 100,
    denials: total('denials'),
    avgTurns: count ? Math.round(total('turns') / count) : 0,
    avgCostUsd: count ? Math.round((total('costUsd') / count) * 100) / 100 : 0,
  };
}

function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--') && a !== args[args.indexOf('--run-url') + 1]);
  const runUrl = args.includes('--run-url') ? args[args.indexOf('--run-url') + 1] : null;
  if (!file) return;
  let stats = null;
  try { stats = summarize(JSON.parse(readFileSync(file, 'utf8'))); } catch { /* no usable log */ }
  if (stats) console.log(commentBody(stats, { runUrl }));
}

if (process.argv[1]?.endsWith('agent-run-stats.mjs')) main();
