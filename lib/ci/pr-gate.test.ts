import { describe, it, expect } from 'vitest';
import { evaluate, LIMITS } from '../../scripts/pr-gate.mjs';

type F = { path: string; status: 'A' | 'M' | 'D' | 'R'; added: string[] };
const lines = (n: number, text = 'const x = 1;') => Array.from({ length: n }, () => text);
const file = (path: string, status: F['status'] = 'M', n = 5, text?: string): F => ({ path, status, added: lines(n, text) });

const base = { title: 'feat(x): a thing', body: '', definerDoc: '', definedTokens: new Set<string>(['--fg', '--accent', '--warn']), grep: () => false };
const run = (files: F[], over: Partial<typeof base> = {}) => {
  const results = evaluate({ ...base, ...over, files }) as Array<{ id: string; ok: boolean; message: string }>;
  const byId = Object.fromEntries(results.map((r) => [r.id, r]));
  return { results, byId, failed: results.filter((r) => !r.ok).map((r) => r.id) };
};
const NOTE = file('.cavern-intelligence/sessions/2026-11-07-x.md', 'A');
const TEST = file('lib/x/x.test.ts', 'A', 30);

describe('the merge gate', () => {
  it('passes a small change with a test and a note', () => {
    expect(run([file('lib/x/x.ts', 'M', 80), TEST, NOTE]).failed).toEqual([]);
  });

  describe('migrations-append-only', () => {
    it('a merged migration may not be edited or deleted', () => {
      expect(run([file('supabase/migrations/20261104000000_x.sql', 'M'), NOTE]).failed).toContain('migrations-append-only');
      expect(run([file('supabase/migrations/20261104000000_x.sql', 'D'), NOTE]).failed).toContain('migrations-append-only');
    });
    it('a new migration is fine', () => {
      expect(run([file('supabase/migrations/20261106000000_y.sql', 'A'), NOTE]).byId['migrations-append-only'].ok).toBe(true);
    });
  });

  describe('definer-allowlist', () => {
    const sql = ['CREATE OR REPLACE FUNCTION public.patch_things(a uuid)', 'RETURNS jsonb', 'LANGUAGE plpgsql', 'SECURITY DEFINER', 'AS $function$', 'begin return null; end;', '$function$;'];
    const mig = { path: 'supabase/migrations/20261106000000_y.sql', status: 'A' as const, added: sql };
    it('a new definer function must be on the allowlist in the same PR', () => {
      expect(run([mig, NOTE], { definerDoc: '| `advance_phase` | creator |' }).failed).toContain('definer-allowlist');
      expect(run([mig, NOTE], { definerDoc: '| `patch_things(a)` | creator only |' }).byId['definer-allowlist'].ok).toBe(true);
    });
    it('an invoker function needs no entry', () => {
      const inv = { ...mig, added: sql.filter((l) => l !== 'SECURITY DEFINER') };
      expect(run([inv, NOTE]).byId['definer-allowlist'].ok).toBe(true);
    });
  });

  describe('rls-from-birth', () => {
    it('a new table needs row level security in the same migration', () => {
      const t = { path: 'supabase/migrations/20261106000000_y.sql', status: 'A' as const, added: ['CREATE TABLE public.boards (id uuid);'] };
      expect(run([t, NOTE]).failed).toContain('rls-from-birth');
      const ok = { ...t, added: [...t.added, 'ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;'] };
      expect(run([ok, NOTE]).byId['rls-from-birth'].ok).toBe(true);
    });
  });

  describe('tests-with-code', () => {
    it('a large source change with no test fails; the waiver (20+ characters) lets it through', () => {
      const f = [file('lib/x/x.ts', 'M', LIMITS.testsFromAddedLines + 1), NOTE];
      expect(run(f).failed).toContain('tests-with-code');
      expect(run(f, { body: 'No tests needed: pure rename, the existing suite covers every call site' }).byId['tests-with-code'].ok).toBe(true);
      expect(run(f, { body: 'No tests needed: ok' }).failed).toContain('tests-with-code');
    });
    it('a small change needs none, and a dependency bump is exempt', () => {
      expect(run([file('lib/x/x.ts', 'M', 10), NOTE]).byId['tests-with-code'].ok).toBe(true);
      expect(run([file('lib/x/x.ts', 'M', 500)], { title: 'chore(deps): bump a' }).byId['tests-with-code'].ok).toBe(true);
    });
  });

  describe('new-components-tested', () => {
    const comps = (n: number) => Array.from({ length: n }, (_, i) => file(`components/studio/production/View${i}.tsx`, 'A', 100));
    it('26 new components with no new test file fail', () => {
      expect(run([...comps(26), NOTE, file('lib/y.test.ts', 'M')], { grep: () => false }).failed).toContain('new-components-tested');
    });
    it('a new test file in proportion (one per five) passes, as does a component a test names', () => {
      expect(run([...comps(5), TEST, NOTE]).byId['new-components-tested'].ok).toBe(true);
      expect(run([...comps(26), NOTE], { grep: () => true }).byId['new-components-tested'].ok).toBe(true);
    });
  });

  describe('session-note', () => {
    it('source without a new note fails; docs-only and tests-only changes do not need one', () => {
      expect(run([file('lib/x/x.ts', 'M', 5)]).failed).toContain('session-note');
      expect(run([file('.cavern-intelligence/BACKLOG.md', 'M')]).byId['session-note'].ok).toBe(true);
    });
  });

  describe('reviewable-size', () => {
    it('too many lines or too many files fails unless the description says why', () => {
      expect(run([file('lib/a.ts', 'M', LIMITS.largeAddedLines + 1), NOTE, TEST]).failed).toContain('reviewable-size');
      const many = Array.from({ length: LIMITS.largeFiles + 1 }, (_, i) => file(`lib/f${i}.ts`, 'M', 1));
      expect(run([...many, NOTE, TEST]).failed).toContain('reviewable-size');
      expect(run([...many, NOTE, TEST], { body: 'Large change: a mechanical rename across every module, nothing else' }).byId['reviewable-size'].ok).toBe(true);
    });
    it('generated files and tests do not count toward the size', () => {
      const g = [file('lib/supabase/database.types.ts', 'M', 5000), file('supabase/schema.fingerprint', 'M', 5000), file('lib/a.ts', 'M', 20), NOTE, TEST];
      expect(run(g).byId['reviewable-size'].ok).toBe(true);
    });
  });

  describe('tokens-defined', () => {
    it('a token used in new code must be defined', () => {
      const f = file('components/x/Y.tsx', 'M', 1, "const s = { color: 'var(--warning, #b45309)', background: 'var(--card)' };");
      const r = run([f, NOTE, TEST]);
      expect(r.failed).toContain('tokens-defined');
      expect(r.byId['tokens-defined'].message).toContain('--warning');
      expect(r.byId['tokens-defined'].message).toContain('--card');
    });
    it('a defined token passes', () => {
      expect(run([file('components/x/Y.tsx', 'M', 1, "const s = { color: 'var(--warn)' };"), NOTE, TEST]).byId['tokens-defined'].ok).toBe(true);
    });
  });
});
