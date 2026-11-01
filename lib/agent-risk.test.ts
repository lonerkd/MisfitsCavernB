import { describe, expect, it } from 'vitest';
import { classify, classifyFile, commentBody } from '../scripts/pr-risk.mjs';

describe('classifyFile', () => {
  it.each([
    ['README.md', 'low'],
    ['.cavern-intelligence/BACKLOG.md', 'low'],
    ['.cavern-intelligence/sessions/2026-11-01-x.md', 'low'],
    ['lib/film/links.test.ts', 'low'],
    ['components/studio/media/MediaGrid.test.tsx', 'low'],
    ['e2e/editor-cowriting.spec.ts', 'low'],
    ['.github/pull_request_template.md', 'low'],
    ['components/studio/media/MediaGrid.tsx', 'medium'],
    ['app/(suite)/editor/page.tsx', 'medium'],
    ['lib/flags.ts', 'medium'],
    ['components/studio/studio.module.css', 'medium'],
    ['supabase/migrations/20261027215252_script_yjs_state.sql', 'high'],
    ['tests/integration/hub.test.ts', 'high'],
    ['lib/supabase/client.ts', 'high'],
    ['proxy.ts', 'high'],
    ['app/(suite)/auth/page.tsx', 'high'],
    ['lib/auth/session.ts', 'high'],
    ['.github/workflows/agent-claude.yml', 'high'],
    ['.github/CODEOWNERS', 'high'],
    ['scripts/agent-push.sh', 'high'],
    ['package.json', 'high'],
    ['package-lock.json', 'high'],
    ['vercel.json', 'high'],
    ['.env.example', 'high'],
    ['LICENSE', 'high'],
    ['lib/legal/legal.ts', 'high'],
  ])('%s is %s', (path, tier) => {
    expect(classifyFile(path).tier).toBe(tier);
  });

  it('treats the files agents take their rules from as high even though they are Markdown', () => {
    for (const path of ['CLAUDE.md', 'AGENTS.md', '.github/copilot-instructions.md', '.cavern-intelligence/RULES.md']) {
      expect(classifyFile(path).tier).toBe('high');
    }
  });

  it('does not mistake a path that merely contains "auth" for the sign-in code', () => {
    expect(classifyFile('lib/author/names.ts').tier).toBe('medium');
    expect(classifyFile('components/Authors.tsx').tier).toBe('medium');
  });
});

describe('classify', () => {
  it('is low for nothing at all', () => {
    expect(classify([])).toEqual({ tier: 'low', high: [], fileCount: 0 });
  });

  it('is the riskiest file: one high file makes the whole pull request high', () => {
    const result = classify(['README.md', 'components/Foo.tsx', 'supabase/migrations/x.sql']);
    expect(result.tier).toBe('high');
    expect(result.high).toEqual([{ file: 'supabase/migrations/x.sql', why: 'the database schema or its config' }]);
  });

  it('is medium when app code is mixed with docs and tests', () => {
    expect(classify(['README.md', 'lib/foo.test.ts', 'components/Foo.tsx']).tier).toBe('medium');
  });

  it('is low for docs and tests only', () => {
    expect(classify(['README.md', 'lib/foo.test.ts', '.cavern-intelligence/BACKLOG.md']).tier).toBe('low');
  });
});

describe('commentBody', () => {
  it('carries the marker the workflow uses to find and update its one comment', () => {
    expect(commentBody(classify(['README.md'])).startsWith('<!-- pr-risk -->')).toBe(true);
  });

  it('says why a high pull request is high, and tells the reader not to merge on green alone', () => {
    const body = commentBody(classify(['supabase/migrations/x.sql', 'proxy.ts']));
    expect(body).toContain('**Risk: high.**');
    expect(body).toContain('`supabase/migrations/x.sql` — the database schema or its config');
    expect(body).toContain('`proxy.ts` — sign-in gating');
    expect(body).toContain('Do not merge on a green CI alone');
  });

  it('lists at most eight reasons and counts the rest', () => {
    const files = Array.from({ length: 11 }, (_, i) => `supabase/migrations/${i}.sql`);
    const body = commentBody(classify(files));
    expect(body.match(/^- `supabase/gm)).toHaveLength(8);
    expect(body).toContain('…and 3 more');
  });

  it('mentions the Copilot request only when one was made', () => {
    const result = classify(['components/Foo.tsx']);
    expect(commentBody(result)).not.toContain('Copilot review requested');
    expect(commentBody(result, { copilotRequested: true })).toContain('Copilot review requested');
  });

  it('pluralises the file count', () => {
    expect(commentBody(classify(['README.md']))).toContain('1 changed file;');
    expect(commentBody(classify(['README.md', 'a.md']))).toContain('2 changed files;');
  });
});
