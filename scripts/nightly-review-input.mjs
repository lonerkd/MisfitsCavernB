// Gathers the day's changes for the nightly review: pull requests merged into main, commits on main, branches pushed and not merged,
// production deployments, runs that did not succeed, and the diff on main, plus the previous review if one is still open. Writes
// nightly-input.md and tells the workflow whether the day was quiet. Read-only: it only reads GitHub and git. The deciding parts are
// in nightly-review-lib.mjs (tested). Needs GH_TOKEN and GITHUB_REPOSITORY; a full-history checkout (fetch-depth: 0).
import { execFileSync } from 'node:child_process';
import { appendFileSync, writeFileSync } from 'node:fs';
import { LABEL, buildInput, windowStart } from './nightly-review-lib.mjs';

const REPO = process.env.GITHUB_REPOSITORY;
const OUT = process.env.NIGHTLY_INPUT ?? 'nightly-input.md';
const problems = [];

const run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
/** A read that must not stop the review: what could not be read is named in the input instead. */
const tryRead = (what, fn, fallback) => {
  try { return fn(); } catch (e) { problems.push(`${what}: ${String(e.stderr || e.message || e).split('\n')[0]}`); return fallback; }
};
const gh = (...args) => run('gh', args);
const git = (...args) => run('git', args);

const now = new Date().toISOString();

const previous = tryRead('the previous review', () => {
  const rows = JSON.parse(gh('issue', 'list', '--repo', REPO, '--label', LABEL, '--state', 'open', '--limit', '1', '--json', 'number,body,createdAt'));
  return rows[0] ?? null;
}, null);

const since = windowStart(previous?.createdAt ?? null, now);

const merged = tryRead('merged pull requests', () => JSON.parse(gh('pr', 'list', '--repo', REPO, '--state', 'merged', '--base', 'main', '--search', `merged:>=${since}`, '--limit', '100', '--json', 'number,title,author,mergedAt,additions,deletions,changedFiles'))
  .map((p) => ({ ...p, author: p.author?.login ?? 'unknown' })), []);

const commits = tryRead('commits on main', () => git('log', 'origin/main', `--since=${since}`, '--pretty=format:%H%x09%s%x09%an').split('\n').filter(Boolean)
  .map((l) => { const [sha, subject, author] = l.split('\t'); return { sha, subject, author }; }), []);

const branches = tryRead('branches', () => {
  const refs = git('for-each-ref', '--format=%(refname:short)', 'refs/remotes/origin/claude', 'refs/remotes/origin/copilot', 'refs/remotes/origin/dependabot', 'refs/remotes/origin/codex').split('\n').filter(Boolean);
  const rows = [];
  for (const ref of refs) {
    const log = git('log', `origin/main..${ref}`, `--since=${since}`, '--pretty=format:%s').split('\n').filter(Boolean);
    if (log.length) rows.push({ name: ref.replace(/^origin\//, ''), commits: log.length, subject: log[0] });
  }
  return rows;
}, []);

const deployments = tryRead('deployments', () => {
  const rows = JSON.parse(gh('api', `repos/${REPO}/deployments?environment=Production&per_page=20`));
  const out = [];
  for (const d of rows) {
    if (d.created_at < since) continue;
    const status = JSON.parse(gh('api', `repos/${REPO}/deployments/${d.id}/statuses?per_page=1`))[0];
    out.push({ createdAt: d.created_at, environment: d.environment, state: status?.state ?? 'unknown', sha: d.sha, description: status?.description ?? '' });
  }
  return out;
}, []);

const runs = tryRead('workflow runs', () => JSON.parse(gh('run', 'list', '--repo', REPO, '--created', `>=${since}`, '--status', 'failure', '--limit', '60', '--json', 'name,headBranch,conclusion,createdAt,url,event'))
  .filter((r) => r.headBranch === 'main' || r.event === 'schedule').map((r) => ({ ...r, branch: r.headBranch })), []);

// What changed on main, from the last commit before the window to now.
const NOISE = [':(exclude)package-lock.json', ':(exclude)*.snap', ':(exclude).cavern-intelligence/bible/screens', ':(exclude)public/*.png', ':(exclude)supabase/schema.fingerprint'];
const base = tryRead('the start of the window', () => git('rev-list', '-1', `--before=${since}`, 'origin/main').trim(), '');
const stat = base ? tryRead('the change summary', () => git('diff', '--stat=120', base, 'origin/main', '--', '.', ...NOISE), '') : '';
const diff = base ? tryRead('the diff', () => git('diff', '--unified=2', base, 'origin/main', '--', '.', ...NOISE), '') : '';

let { md, quiet } = buildInput({ since, until: now, merged, commits, branches, deployments, runs, stat, diff, previous });
if (problems.length) md += `\n## Could not read\n${problems.map((p) => `- ${p}`).join('\n')}\n`;
writeFileSync(OUT, md);

const out = process.env.GITHUB_OUTPUT;
if (out) appendFileSync(out, `quiet=${quiet}\nsince=${since}\nuntil=${now}\n`);
console.log(`nightly review input: ${quiet ? 'a quiet day, nothing to review' : `${merged.length} merged, ${commits.length} commits, ${branches.length} branches, ${deployments.length} deployments, ${runs.length} failed runs`}; ${problems.length} problem(s) reading`);
