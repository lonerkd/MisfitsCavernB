// Posts the nightly review as one GitHub issue (label nightly-review), then closes the earlier open reviews with a pointer to it: their
// unchecked items were carried into this one by the reviewer. Refuses a review that is empty or missing its sections, so a model that
// wandered off fails the run loudly instead of posting nothing useful. Needs GH_TOKEN and GITHUB_REPOSITORY.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { LABEL, issueTitle, validateReview } from './nightly-review-lib.mjs';

const REPO = process.env.GITHUB_REPOSITORY;
const FILE = process.env.NIGHTLY_REVIEW ?? 'nightly-review.md';
const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

let text = '';
try { text = readFileSync(FILE, 'utf8'); } catch { /* validated below */ }
const verdict = validateReview(text);
if (!verdict.ok) {
  console.error(`::error::The nightly review was not posted: ${verdict.why}.`);
  process.exit(1);
}

try { gh('label', 'create', LABEL, '--repo', REPO, '--color', '5319e7', '--description', "The day's review: fix its unchecked items first"); } catch { /* it exists */ }

const earlier = JSON.parse(gh('issue', 'list', '--repo', REPO, '--label', LABEL, '--state', 'open', '--limit', '20', '--json', 'number'));
const url = gh('issue', 'create', '--repo', REPO, '--title', issueTitle(new Date().toISOString()), '--label', LABEL, '--body-file', FILE).trim();
const number = url.split('/').pop();
for (const { number: n } of earlier) {
  try {
    gh('issue', 'comment', String(n), '--repo', REPO, '--body', `Superseded by #${number}: what was still open here was carried over.`);
    gh('issue', 'close', String(n), '--repo', REPO, '--reason', 'not planned');
  } catch (e) { console.warn(`could not close #${n}: ${String(e.message).split('\n')[0]}`); }
}
console.log(`posted ${url} with ${verdict.findings} finding(s) to fix`);
