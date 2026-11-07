#!/usr/bin/env node
// Sort a pull request into a risk tier from the files it changes, so review effort goes where a
// mistake would cost the most:
//
//   low     docs, notes, tests            CI is the whole review; merge once it is green
//   medium  app code                      CI plus one AI review (Copilot)
//   high    database, access, CI, agent   a Claude session reviews it; never merge on green alone
//           rules, dependencies
//
//   node scripts/pr-risk.mjs --pr 123                      print the tier and why
//   node scripts/pr-risk.mjs --pr 123 --apply              label the PR and keep one comment current
//   node scripts/pr-risk.mjs --pr 123 --apply --request-copilot
//                                                          also ask Copilot for its (one) review of a
//                                                          medium PR; only after the owner has turned
//                                                          Copilot's automatic review off
//
// Reads only GitHub's own data. No AI, no secrets, no cost.
import { execFileSync } from 'node:child_process';

const REPO = process.env.GITHUB_REPOSITORY || 'lonerkd/MisfitsCavernB';
const MARKER = '<!-- pr-risk -->';
const COPILOT = 'copilot-pull-request-reviewer[bot]';

/**
 * [pattern, what it is] — a match makes the whole pull request high risk.
 * @type {[RegExp, string][]}
 */
const HIGH = [
  [/^supabase\//, 'the database schema or its config'],
  [/^tests\/integration\//, 'the database and access tests'],
  [/^lib\/supabase\//, 'the data layer'],
  [/^proxy\.ts$/, 'sign-in gating'],
  [/^(app|lib|components)\/(.*\/)?auth\//, 'sign-in and accounts'],
  [/^\.github\/workflows\//, 'CI and the agent workflows'],
  [/^\.github\/CODEOWNERS$/, 'who owns what'],
  [/^scripts\/agent-push\.sh$/, 'the agent push boundary'],
  [/^scripts\/pr-risk\.mjs$/, 'the risk classifier itself'],
  [/^(CLAUDE|AGENTS)\.md$|^\.github\/copilot-instructions\.md$|^\.cavern-intelligence\/RULES\.md$/, 'the rules the agents follow'],
  [/^package(-lock)?\.json$/, 'dependencies'],
  [/^vercel\.json$/, 'deployment'],
  [/^\.env/, 'environment settings'],
  [/^(LICENSE|SECURITY\.md)$|^lib\/legal\/|^app\/\(public\)\/(terms|privacy)\//, 'legal text'],
];

/** Anything here, and not high, is low risk: it cannot change what the app does. */
const LOW = [
  /\.md$/,
  /^\.cavern-intelligence\//,
  /^\.github\/(ISSUE_TEMPLATE|pull_request_template)/,
  /\.test\.(ts|tsx)$/,
  /^e2e\//,
];

/** The tier of one file, with the reason when it is high. */
export function classifyFile(path) {
  for (const [pattern, why] of HIGH) if (pattern.test(path)) return { tier: 'high', why };
  if (LOW.some((pattern) => pattern.test(path))) return { tier: 'low' };
  return { tier: 'medium' };
}

/** The tier of a pull request: the riskiest of its files (no files counts as low). */
export function classify(files) {
  const high = [];
  let tier = 'low';
  for (const file of files) {
    const result = classifyFile(file);
    if (result.tier === 'high') high.push({ file, why: result.why });
    else if (result.tier === 'medium' && tier === 'low') tier = 'medium';
  }
  return { tier: high.length ? 'high' : tier, high, fileCount: files.length };
}

const SUMMARY = {
  low: 'Docs, notes or tests only. CI is the whole review: merge once it is green.',
  medium: 'App code. CI plus one AI review (Copilot).',
  high: 'Touches something where a mistake is costly. Do not merge on a green CI alone: it needs a review in a Claude session (and persona tests where it touches data or access). The `claude-review` status stays pending until a review of this exact commit is posted: `node scripts/claude-review.mjs --pr <n> --post approved|changes --summary "..."`. A new push needs a new review.',
};

/**
 * The one comment kept on the pull request.
 * @param {{ tier: string, high: { file: string, why?: string }[], fileCount: number }} result
 * @param {{ copilotRequested?: boolean }} [options]
 */
export function commentBody(result, { copilotRequested = false } = {}) {
  const lines = [MARKER, `**Risk: ${result.tier}.** ${SUMMARY[result.tier]}`];
  if (result.high.length) {
    const shown = result.high.slice(0, 8).map((h) => `- \`${h.file}\` — ${h.why}`);
    const more = result.high.length > 8 ? [`- …and ${result.high.length - 8} more`] : [];
    lines.push('', 'Why:', ...shown, ...more);
  }
  if (copilotRequested) lines.push('', 'Copilot review requested (once per pull request).');
  lines.push('', `<sub>Set by \`scripts/pr-risk.mjs\` from the ${result.fileCount} changed file${result.fileCount === 1 ? '' : 's'}; updated on every push.</sub>`);
  return lines.join('\n');
}

const gh = (args, input) => execFileSync('gh', args, { encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'pipe'] });
const lines = (text) => text.split('\n').map((l) => l.trim()).filter(Boolean);

const COLORS = { low: '0e8a16', medium: 'fbca04', high: 'd93f0b' };

function applyLabel(pr, tier) {
  for (const t of Object.keys(COLORS)) {
    try {
      gh(['api', '-X', 'POST', `repos/${REPO}/labels`, '-f', `name=risk/${t}`, '-f', `color=${COLORS[t]}`, '-f', `description=Review effort: ${t}`]);
    } catch { /* it already exists */ }
  }
  const current = lines(gh(['api', `repos/${REPO}/issues/${pr}/labels`, '--jq', '.[].name']));
  for (const name of current) {
    if (/^risk\//.test(name) && name !== `risk/${tier}`) {
      gh(['api', '-X', 'DELETE', `repos/${REPO}/issues/${pr}/labels/${encodeURIComponent(name)}`]);
    }
  }
  if (!current.includes(`risk/${tier}`)) gh(['api', '-X', 'POST', `repos/${REPO}/issues/${pr}/labels`, '-f', `labels[]=risk/${tier}`]);
}

function upsertComment(pr, body) {
  const mine = lines(gh(['api', `repos/${REPO}/issues/${pr}/comments`, '--paginate', '--jq',
    `.[] | select(.user.login == "github-actions[bot]" and (.body | contains("${MARKER}"))) | .id`]));
  if (mine[0]) gh(['api', '-X', 'PATCH', `repos/${REPO}/issues/comments/${mine[0]}`, '-f', `body=${body}`]);
  else gh(['api', '-X', 'POST', `repos/${REPO}/issues/${pr}/comments`, '-f', `body=${body}`]);
}

/** Is this login Copilot's reviewer (it appears under more than one name)? */
export const isCopilot = (login) => /^copilot(-pull-request-reviewer)?(\[bot\])?$/i.test(String(login ?? ''));

/**
 * Ask Copilot for its review, once: not when it has reviewed this pull request already, and not
 * while an earlier request is still waiting (the reviews list holds only submitted reviews).
 */
function requestCopilot(pr) {
  const reviewed = lines(gh(['api', `repos/${REPO}/pulls/${pr}/reviews`, '--paginate', '--jq', '.[].user.login']));
  const waiting = lines(gh(['api', `repos/${REPO}/pulls/${pr}/requested_reviewers`, '--jq', '.users[].login']));
  if ([...reviewed, ...waiting].some(isCopilot)) return false;
  try {
    gh(['api', '-X', 'POST', `repos/${REPO}/pulls/${pr}/requested_reviewers`, '-f', `reviewers[]=${COPILOT}`]);
    return true;
  } catch (error) {
    console.warn(`could not request the Copilot review: ${String(error.message || error).split('\n')[0]}`);
    return false;
  }
}

function main() {
  const args = process.argv.slice(2);
  const pr = args[args.indexOf('--pr') + 1];
  if (!/^\d+$/.test(pr || '')) { console.error('usage: node scripts/pr-risk.mjs --pr <number> [--apply] [--request-copilot]'); process.exit(2); }
  const files = lines(gh(['api', `repos/${REPO}/pulls/${pr}/files`, '--paginate', '--jq', '.[].filename']));
  const result = classify(files);
  console.log(`#${pr}: ${result.tier} risk (${files.length} files)`);
  for (const h of result.high) console.log(`  high: ${h.file} — ${h.why}`);
  if (!args.includes('--apply')) return;
  applyLabel(pr, result.tier);
  const copilotRequested = result.tier === 'medium' && args.includes('--request-copilot') && requestCopilot(pr);
  upsertComment(pr, commentBody(result, { copilotRequested }));
}

if (process.argv[1]?.endsWith('pr-risk.mjs')) main();
