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
const TEST = file('lib/x/x.test.ts', 'A', 30, 'it("works", () => { expect(1).toBe(1); });');

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
      expect(run([mig, NOTE], { definerDoc: '### D. The definer-function allowlist\n| `patch_things(a)` | creator only |' }).byId['definer-allowlist'].ok).toBe(true);
    });
    it('a name mentioned only in prose, or a custom dollar tag, does not slip through', () => {
      const doc = '### D. The definer-function allowlist\n\n| Function | Gate |\n|---|---|\n| `other_fn` | x |\n\n### E. Other\npatch_things is discussed here.';
      expect(run([mig, NOTE], { definerDoc: doc }).failed).toContain('definer-allowlist');
      const tagged = { ...mig, added: sql.map((l) => l.replace(/\$function\$/g, '$fn1$')).concat(['LANGUAGE plpgsql;']) };
      expect(run([tagged, NOTE], { definerDoc: doc }).failed).toContain('definer-allowlist');
      const listed = '### D. The definer-function allowlist\n\n| `patch_things(a)` | gate |\n';
      expect(run([mig, NOTE], { definerDoc: listed }).byId['definer-allowlist'].ok).toBe(true);
    });
    it('attributes after the body, quoted names and ALTER FUNCTION are seen', () => {
      const after = { ...mig, added: ['CREATE FUNCTION "public"."patch_things"() RETURNS void AS $$ select 1 $$ LANGUAGE sql SECURITY DEFINER;'] };
      expect(run([after, NOTE], { definerDoc: '### D. The definer-function allowlist\n| x |' }).failed).toContain('definer-allowlist');
      const alter = { ...mig, added: ['ALTER FUNCTION public.patch_things(uuid) SECURITY DEFINER;'] };
      expect(run([alter, NOTE], { definerDoc: '### D. The definer-function allowlist\n| x |' }).failed).toContain('definer-allowlist');
    });
    it('a single-quoted body is seen too', () => {
      const q = { ...mig, added: ["CREATE FUNCTION public.patch_things() RETURNS int LANGUAGE sql SECURITY DEFINER AS 'select 1; select 2';"] };
      expect(run([q, NOTE], { definerDoc: '### D. The definer-function allowlist\n| x |' }).failed).toContain('definer-allowlist');
    });
    it('an unqualified name is a public function; another schema is not', () => {
      const bare = { ...mig, added: ['CREATE FUNCTION get_all() RETURNS int LANGUAGE sql SECURITY DEFINER AS $$ select 1 $$;'] };
      expect(run([bare, NOTE], { definerDoc: '### D. The definer-function allowlist\n| x |' }).failed).toContain('definer-allowlist');
      const internal = { ...mig, added: ['CREATE FUNCTION internal.helper() RETURNS int LANGUAGE sql SECURITY DEFINER AS $$ select 1 $$;'] };
      expect(run([internal, NOTE], { definerDoc: '### D. The definer-function allowlist\n| x |' }).byId['definer-allowlist'].ok).toBe(true);
      const alter = { ...mig, added: ['ALTER FUNCTION get_all(uuid) SECURITY DEFINER;'] };
      expect(run([alter, NOTE], { definerDoc: '### D. The definer-function allowlist\n| x |' }).failed).toContain('definer-allowlist');
    });
    it('the words SECURITY DEFINER inside a body or comment do not make an invoker function a definer', () => {
      const inv = { ...mig, added: ["CREATE FUNCTION public.safe_one() RETURNS int LANGUAGE sql AS $$ select 1 -- SECURITY DEFINER is not used here $$;", "COMMENT ON FUNCTION public.safe_one() IS 'not SECURITY DEFINER';"] };
      expect(run([inv, NOTE], { definerDoc: '### D. The definer-function allowlist\n| x |' }).byId['definer-allowlist'].ok).toBe(true);
    });
    it('an apostrophe in a block comment or an escaped quote does not swallow the next statement', () => {
      const two = { ...mig, added: ["/* it's here */ CREATE FUNCTION public.a() RETURNS int LANGUAGE sql AS E'select \\'x\\'';", 'CREATE FUNCTION public.b() RETURNS int LANGUAGE sql SECURITY DEFINER AS $$ select 1 $$;'] };
      const r = run([two, NOTE], { definerDoc: '### D. The definer-function allowlist\n| `a()` | x |' });
      expect(r.failed).toContain('definer-allowlist');
      expect(r.byId['definer-allowlist'].message).toContain('b (');
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

  describe('rls-from-birth, other schemas', () => {
    it('a table in another schema (internal.*) is not a public table', () => {
      const t = { path: 'supabase/migrations/20261106000000_y.sql', status: 'A' as const, added: ['CREATE TABLE internal.push_config (id int);'] };
      expect(run([t, NOTE]).byId['rls-from-birth'].ok).toBe(true);
    });
  });

  describe('tests-with-code', () => {
    it('a large source change with no test fails; the waiver (20+ characters) lets it through', () => {
      const f = [file('lib/x/x.ts', 'M', LIMITS.testsFromAddedLines + 1), NOTE];
      expect(run(f).failed).toContain('tests-with-code');
      expect(run(f, { body: 'No tests needed: pure rename, the existing suite covers every call site' }).byId['tests-with-code'].ok).toBe(true);
      expect(run(f, { body: 'No tests needed: ok' }).failed).toContain('tests-with-code');
    });
    it('a test file that only removes assertions is not coverage', () => {
      const f = [file('lib/x/x.ts', 'M', LIMITS.testsFromAddedLines + 1), { path: 'lib/x/x.test.ts', status: 'M' as const, added: ['// tidy'] }, NOTE];
      expect(run(f).failed).toContain('tests-with-code');
    });
    it('the auth gate, edge functions and scripts count as source; a skipped test is not coverage', () => {
      expect(run([file('proxy.ts', 'M', 80), NOTE]).failed).toContain('tests-with-code');
      expect(run([file('supabase/functions/push/index.ts', 'M', 80), NOTE]).failed).toContain('tests-with-code');
      expect(run([file('scripts/x.mjs', 'M', 80), NOTE]).failed).toContain('tests-with-code');
      const skipped = { path: 'lib/x/x.test.ts', status: 'M' as const, added: ['it.skip("x", () => {});'] };
      expect(run([file('lib/x/x.ts', 'M', 80), skipped, NOTE]).failed).toContain('tests-with-code');
    });
    it('a skip further down the same file is not coverage, even with an assertion inside it', () => {
      const f = { path: 'lib/x/x.test.ts', status: 'M' as const, added: ["it.skip('x', () => {", '  expect(foo()).toBe(1);', '});'] };
      expect(run([file('lib/x/x.ts', 'M', 80), f, NOTE]).failed).toContain('tests-with-code');
    });
    describe('how a waiver may be written', () => {
      const f = [file('lib/x/x.ts', 'M', LIMITS.testsFromAddedLines + 1), NOTE];
      const REASON = 'the existing suite covers every call site';
      const ok = (body: string) => expect(run(f, { body }).byId['tests-with-code'].ok).toBe(true);
      const no = (body: string) => expect(run(f, { body }).failed).toContain('tests-with-code');

      it.each([
        ['plain', `No tests needed: ${REASON}`],
        ['bold label', `**No tests needed:** ${REASON}`],
        ['bold with the colon outside', `**No tests needed**: ${REASON}`],
        ['a bullet', `- No tests needed: ${REASON}`],
        ['a plus bullet', `+ No tests needed: ${REASON}`],
        ['a quote', `> **No tests needed**: ${REASON}`],
        ['a heading', `## No tests needed: ${REASON}`],
        ['a numbered item', `1. No tests needed: ${REASON}`],
        ['a task box', `- [x] No tests needed: ${REASON}`],
        ['Windows line endings', `No tests needed: ${REASON}\r\n`],
        ['the reason alone on the next line', `No tests needed:\n${REASON}`],
        ['lower case', `no tests needed: ${REASON}`],
      ])('counts: %s', (_name, body) => ok(body));

      it.each([
        ['a longer label', `No tests neededly: ${REASON}`],
        ['the label without a colon', `No tests needed ${REASON}`],
        ['the colon on a later line', `No tests needed\n\n: ${REASON}`],
        ['a 19-character reason followed by spaces', 'No tests needed: 1234567890123456789   '],
        ['a reason padded to 20 by closing bold', '**No tests needed: 18 char reason here**'],
        ['quoted inside a code fence', '```\nNo tests needed: ' + REASON + '\n```'],
      ])('does not count: %s', (_name, body) => no(body));

      it('counts exactly 20 characters, and keeps a leading *emphasis* of the reason', () => {
        ok('No tests needed: 12345678901234567890');
        ok('No tests needed: *all* call sites are covered');
      });

      it('a short placeholder earlier does not hide a real waiver further down', () => {
        ok(`- No tests needed: tbd\n\nNotes\n**No tests needed:** ${REASON}`);
      });

      it('the Large change label reads the same way', () => {
        const big = [file('lib/a.ts', 'M', LIMITS.largeAddedLines + 1), NOTE, TEST];
        expect(run(big, { body: `**Large change:** ${REASON}` }).byId['reviewable-size'].ok).toBe(true);
        expect(run(big, { body: 'Large change: tbd' }).failed).toContain('reviewable-size');
      });

      it('a body of thousands of blank lines is read in linear time', () => {
        const t0 = Date.now();
        no(' \n'.repeat(30000));
        expect(Date.now() - t0).toBeLessThan(500);
      });
    });
    it('a small change needs none, and a dependency bump is exempt', () => {
      expect(run([file('lib/x/x.ts', 'M', 10), NOTE]).byId['tests-with-code'].ok).toBe(true);
      expect(run([file('lib/x/x.ts', 'M', 500)], { title: 'chore(deps): bump a', author: 'dependabot[bot]' } as never).byId['tests-with-code'].ok).toBe(true);
    });
    it('a deps-looking title from a person is not an exemption', () => {
      expect(run([file('lib/x/x.ts', 'M', 500), NOTE], { title: 'chore(deps): bump a', author: 'lonerkd' } as never).failed).toContain('tests-with-code');
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
    it('forty-one generated files do not count as forty-one files', () => {
      const gen = Array.from({ length: 41 }, (_, i) => file(`.cavern-intelligence/bible/screens/s${i}.png`, 'M', 0));
      expect(run([...gen, file('lib/a.ts', 'M', 10), NOTE, TEST]).byId['reviewable-size'].ok).toBe(true);
    });
    it('generated files and tests do not count toward the size', () => {
      const g = [file('lib/supabase/database.types.ts', 'M', 5000), file('supabase/schema.fingerprint', 'M', 5000), file('lib/a.ts', 'M', 20), NOTE, TEST];
      expect(run(g).byId['reviewable-size'].ok).toBe(true);
    });
  });

  describe('lint-baseline-shrinks', () => {
    const sup = (n: number) => ({ 'a.ts': { 'no-unused-vars': { count: n } } });
    const withSup = (base: unknown, head: unknown) => run([NOTE], { suppressions: { base, head } } as never);
    it('is skipped while the base has no baseline (the PR that creates it)', () => {
      expect(withSup(null, sup(3)).results.some((r) => r.id === 'lint-baseline-shrinks')).toBe(false);
    });
    it('may shrink or stay, never grow or add', () => {
      expect(withSup(sup(3), sup(2)).byId['lint-baseline-shrinks'].ok).toBe(true);
      expect(withSup(sup(3), sup(3)).byId['lint-baseline-shrinks'].ok).toBe(true);
      expect(withSup(sup(3), sup(4)).failed).toContain('lint-baseline-shrinks');
      expect(withSup(sup(3), { ...sup(3), 'b.ts': { 'no-explicit-any': { count: 1 } } }).failed).toContain('lint-baseline-shrinks');
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
