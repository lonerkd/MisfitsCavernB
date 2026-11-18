import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// scripts/vercel-ignore.sh decides which pushes earn a Vercel deployment (the free plan allows 100 a day).
// Exit 0 = skip the deployment, 1 = build it. Each case makes a throwaway repo and a commit, then asks.
const SCRIPT = resolve('scripts/vercel-ignore.sh');
let dir;
// No GIT_* variable from the outside: a git hook (the pre-push that runs these tests) exports GIT_DIR and GIT_INDEX_FILE, and a
// `git commit` here would then land in the REAL repository instead of the throwaway one.
const cleanEnv = () => Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
const git = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8', env: { ...cleanEnv(), GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } }).trim();
const write = (f, s = 'x') => { mkdirSync(join(dir, f, '..'), { recursive: true }); writeFileSync(join(dir, f), s + Math.random()); };
const commit = (...files) => { for (const f of files) write(f); git('add', '-A'); git('commit', '-qm', 'c'); return git('rev-parse', 'HEAD'); };
const ask = (env = {}) => spawnSync('bash', [SCRIPT], { cwd: dir, env: { ...cleanEnv(), VERCEL_GIT_COMMIT_REF: 'claude/x', VERCEL_GIT_PREVIOUS_SHA: '', ...env } }).status;

beforeAll(() => { dir = mkdtempSync(join(tmpdir(), 'vi-')); git('init', '-q', '-b', 'main'); commit('app/page.tsx'); });
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('vercel-ignore: a push builds only when it can change the app', () => {
  it('skips notes, docs and the agent files', () => {
    commit('README.md', '.cavern-intelligence/sessions/n.md', '.claude/settings.json');
    expect(ask()).toBe(0);
  });
  it('skips CI, hooks, tests and e2e', () => {
    commit('.github/workflows/x.yml', '.githooks/pre-push', 'e2e/a.spec.ts', 'lib/a.test.ts', 'components/b.test.tsx', 'scripts/x.test.mjs', 'tests/integration/y.test.ts');
    expect(ask()).toBe(0);
  });
  it('skips migrations, baselines and dev scripts', () => {
    commit('supabase/migrations/1.sql', 'supabase/schema.fingerprint', 'eslint-suppressions.json', 'scripts/theme-scan.mjs');
    expect(ask()).toBe(0);
  });
  it('builds when the app changes', () => {
    for (const f of ['app/page.tsx', 'components/a.tsx', 'lib/a.ts', 'public/sw.js', 'next.config.js', 'package.json', 'proxy.ts', 'app/globals.css']) {
      commit(f);
      expect(ask(), f).toBe(1);
    }
  });
  it('builds when next.config.js requires a script (preview-env-guard counts, other scripts do not)', () => {
    commit('scripts/preview-env-guard.js');
    expect(ask()).toBe(1);
  });
  it('looks at everything since the last deployment, not only the tip commit', () => {
    const deployed = commit('docs.md');
    commit('components/changed.tsx');   // earlier commit changes the app...
    commit('.cavern-intelligence/note.md'); // ...the tip is a note: the old rule skipped this
    expect(ask({ VERCEL_GIT_PREVIOUS_SHA: deployed })).toBe(1);
  });
  it('skips when everything since the last deployment is irrelevant', () => {
    const deployed = commit('components/z.tsx');
    commit('e2e/q.spec.ts');
    commit('README.md');
    expect(ask({ VERCEL_GIT_PREVIOUS_SHA: deployed })).toBe(0);
  });
  it('judges main like a branch, since the last production deployment; with none known it builds', () => {
    const deployed = commit('components/p.tsx');
    commit('README.md', 'e2e/z.spec.ts');
    expect(ask({ VERCEL_GIT_COMMIT_REF: 'main', VERCEL_GIT_PREVIOUS_SHA: deployed })).toBe(0);   // a merge of notes and tests
    commit('lib/app-change.ts');
    expect(ask({ VERCEL_GIT_COMMIT_REF: 'main', VERCEL_GIT_PREVIOUS_SHA: deployed })).toBe(1);   // the app changed
    expect(ask({ VERCEL_GIT_COMMIT_REF: 'main' })).toBe(1);                                      // previous unknown: build
    expect(ask({ VERCEL_GIT_COMMIT_REF: 'main', VERCEL_GIT_PREVIOUS_SHA: 'deadbeef'.repeat(5) })).toBe(1);
  });
  it('never builds a dependency bot branch', () => {
    commit('package.json');
    expect(ask({ VERCEL_GIT_COMMIT_REF: 'dependabot/npm_and_yarn/x' })).toBe(0);
  });
  it('builds when it cannot tell (an unknown previous commit falls back to the parent)', () => {
    commit('lib/q.ts');
    expect(ask({ VERCEL_GIT_PREVIOUS_SHA: 'deadbeef'.repeat(5) })).toBe(1);
  });
});
