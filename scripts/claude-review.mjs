#!/usr/bin/env node
// The Claude review check: a high-risk pull request (scripts/pr-risk.mjs) cannot merge on green CI alone. It needs a
// review by a Claude session (or the Claude worker) and the review is bound to the exact commit it read, so it cannot go
// stale: a new push changes the head SHA and the check goes pending until the new head is reviewed.
//
//   node scripts/claude-review.mjs --pr 123                    print the verdict for the current head
//   node scripts/claude-review.mjs --pr 123 --apply            also set the `claude-review` commit status on the head
//   node scripts/claude-review.mjs --pr 123 --post approved --summary "what was reviewed and found"
//   node scripts/claude-review.mjs --pr 123 --post changes  --summary "what must change"
//
// The marker is an HTML comment in a PR comment: <!-- claude-review:v1 sha=<40 hex> verdict=approved|changes -->.
// Only a comment by a trusted author counts (the repository owner, a member or collaborator, or a login in
// CLAUDE_REVIEW_LOGINS), never a bot such as Copilot or the pull request's own description. The latest trusted marker
// for the CURRENT head decides; markers for earlier heads are reported and ignored. Low and medium risk need no marker.
// The workflow that runs this reads the script from the base branch, so a pull request cannot weaken it.
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { classify } from './pr-risk.mjs';

export const CONTEXT = 'claude-review';
const MARKER = /<!--\s*claude-review:v1\s+sha=([0-9a-f]{40})\s+verdict=(approved|changes)\s*-->/gi;
const TRUSTED = new Set(['OWNER', 'MEMBER', 'COLLABORATOR']);

/** Is this comment's author allowed to review? Bots and drive-by contributors are not (unless named in `extra`). */
export function trusted(comment, extra = []) {
  const login = String(comment.user?.login ?? '');
  if (extra.map((l) => l.toLowerCase()).includes(login.toLowerCase())) return true;
  return TRUSTED.has(comment.author_association) && comment.user?.type !== 'Bot';
}

/**
 * ctx: { headSha, tier, comments: [{ id, body, user: { login, type }, author_association, created_at }], extraTrusted? }
 * -> { state: 'success'|'pending'|'failure', description }
 */
export function evaluate(ctx) {
  if (ctx.tier !== 'high') return { state: 'success', description: `Not required: ${ctx.tier} risk.` };
  const marks = [];
  for (const c of ctx.comments ?? []) {
    if (!trusted(c, ctx.extraTrusted)) continue;
    for (const m of String(c.body ?? '').matchAll(MARKER)) marks.push({ sha: m[1].toLowerCase(), verdict: m[2].toLowerCase(), at: c.created_at ?? '', id: c.id ?? 0 });
  }
  const order = (a, b) => (a.at === b.at ? a.id - b.id : a.at < b.at ? -1 : 1);
  const forHead = marks.filter((m) => m.sha === String(ctx.headSha).toLowerCase()).sort(order);
  const last = forHead[forHead.length - 1];
  if (last?.verdict === 'approved') return { state: 'success', description: 'A Claude review approved this exact commit.' };
  if (last?.verdict === 'changes') return { state: 'failure', description: 'The Claude review asked for changes on this commit.' };
  const stale = marks.length > 0;
  return { state: 'pending', description: stale ? 'High risk: reviewed an earlier commit; the new commit needs a Claude review.' : 'High risk: needs a Claude review of this commit.' };
}

/** The comment a reviewer posts. */
export function reviewComment(sha, verdict, summary) {
  return `<!-- claude-review:v1 sha=${sha} verdict=${verdict} -->\n**Claude review: ${verdict === 'approved' ? 'approved' : 'changes requested'}** for \`${sha.slice(0, 8)}\`.\n\n${summary}\n\n<sub>Bound to this commit: a new push needs a new review.</sub>`;
}

const REPO = process.env.GITHUB_REPOSITORY || 'lonerkd/MisfitsCavernB';
const gh = (args, input) => execFileSync('gh', args, { encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'pipe'] });

function main() {
  const a = process.argv.slice(2);
  const arg = (n) => { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : undefined; };
  const pr = arg('--pr');
  if (!/^\d+$/.test(pr || '')) { console.error('usage: claude-review.mjs --pr <n> [--apply] [--post approved|changes --summary "..."]'); process.exit(2); }
  const head = JSON.parse(gh(['api', `repos/${REPO}/pulls/${pr}`])).head.sha;
  if (arg('--post')) {
    const verdict = arg('--post');
    if (!['approved', 'changes'].includes(verdict) || !(arg('--summary') ?? '').trim()) { console.error('--post needs approved|changes and a --summary of what was reviewed'); process.exit(2); }
    gh(['api', `repos/${REPO}/issues/${pr}/comments`, '-f', `body=${reviewComment(head, verdict, arg('--summary'))}`]);
    console.log(`posted ${verdict} for ${head}`);
  }
  const files = gh(['api', `repos/${REPO}/pulls/${pr}/files`, '--paginate', '--jq', '.[].filename']).split('\n').filter(Boolean);
  const comments = JSON.parse(gh(['api', `repos/${REPO}/issues/${pr}/comments`, '--paginate']) || '[]');
  const flat = Array.isArray(comments[0]) ? comments.flat() : comments;
  const result = evaluate({ headSha: head, tier: classify(files).tier, comments: flat, extraTrusted: (process.env.CLAUDE_REVIEW_LOGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean) });
  console.log(`${CONTEXT}: ${result.state} — ${result.description} (head ${head.slice(0, 8)})`);
  if (a.includes('--apply')) {
    gh(['api', `repos/${REPO}/statuses/${head}`, '-f', `state=${result.state}`, '-f', `context=${CONTEXT}`, '-f', `description=${result.description.slice(0, 140)}`]);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
