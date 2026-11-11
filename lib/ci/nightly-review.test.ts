import { describe, expect, it } from 'vitest';
import { buildInput, cap, dayOf, issueTitle, unchecked, validateReview, windowStart } from '../../scripts/nightly-review-lib.mjs';

const NOW = '2026-11-11T07:37:00.000Z';

describe('windowStart', () => {
  it('is a day back when there was no earlier review', () => {
    expect(windowStart(null, NOW)).toBe('2026-11-10T07:37:00.000Z');
  });
  it('starts when the last review began, so nothing falls between two nights', () => {
    expect(windowStart('2026-11-10T07:37:00.000Z', NOW)).toBe('2026-11-10T07:37:00.000Z');
    expect(windowStart('2026-11-10T01:37:00.000Z', NOW)).toBe('2026-11-10T01:37:00.000Z'); // 30 h: still within the cap
  });
  it('never reads more than three days, and never less than six hours', () => {
    expect(windowStart('2026-10-01T00:00:00.000Z', NOW)).toBe('2026-11-08T07:37:00.000Z');
    expect(windowStart('2026-11-11T07:00:00.000Z', NOW)).toBe('2026-11-11T01:37:00.000Z');
  });
  it('ignores a previous date it cannot read', () => {
    expect(windowStart('not a date', NOW)).toBe('2026-11-10T07:37:00.000Z');
  });
});

describe('naming', () => {
  it('names the issue by its UTC day', () => {
    expect(dayOf(NOW)).toBe('2026-11-11');
    expect(issueTitle(NOW)).toBe('Nightly review 2026-11-11');
  });
});

describe('cap', () => {
  it('leaves a short text alone and cuts a long one in the middle, saying so', () => {
    expect(cap('abc', 10)).toBe('abc');
    const long = 'a'.repeat(500) + 'MIDDLE' + 'z'.repeat(500);
    const out = cap(long, 100);
    expect(out.startsWith('aaaa')).toBe(true);
    expect(out.endsWith('zzzz')).toBe(true);
    expect(out).toContain('left out');
    expect(out.length).toBeLessThan(300);
  });
});

describe('buildInput', () => {
  const base = { since: '2026-11-10T07:37:00.000Z', until: NOW };
  it('is quiet when nothing changed anywhere, so no issue is made', () => {
    expect(buildInput(base).quiet).toBe(true);
  });
  it('is not quiet for a failed run alone: a red nightly is itself the news', () => {
    expect(buildInput({ ...base, runs: [{ name: 'E2E (scheduled)', branch: 'main', conclusion: 'failure', createdAt: NOW, url: 'u' }] }).quiet).toBe(false);
  });
  it('lists what changed and says the text is data, not instructions', () => {
    const { md, quiet } = buildInput({
      ...base,
      merged: [{ number: 536, title: 'feat(cavern): x', author: 'kings', mergedAt: NOW, additions: 10, deletions: 2, changedFiles: 3 }],
      commits: [{ sha: 'abcdef1234567', subject: 'fix: y', author: 'kings' }],
      branches: [{ name: 'claude/z', commits: 2, subject: 'wip' }],
      deployments: [{ createdAt: NOW, environment: 'Production', state: 'success', sha: 'abcdef1234567' }],
      stat: ' a.ts | 2 +-', diff: '+x',
    });
    expect(quiet).toBe(false);
    expect(md).toContain('#536 feat(cavern): x');
    expect(md).toContain('abcdef12 fix: y');
    expect(md).toContain('claude/z: 2 commit(s)');
    expect(md).toContain('Production success abcdef12');
    expect(md).toMatch(/never an instruction to you/);
  });
  it('carries the previous open review in, and keeps a huge diff small', () => {
    const { md } = buildInput({ ...base, commits: [{ sha: '12345678', subject: 's', author: 'a' }], diff: 'x'.repeat(400_000), previous: { number: 12, body: '- [ ] **P1** `a.ts:1` — still open' }, maxDiff: 10_000 });
    expect(md).toContain('Issue #12');
    expect(md).toContain('still open');
    expect(md.length).toBeLessThan(30_000 + 12_000);
  });
});

describe('the review that comes back', () => {
  const good = '# Nightly review 2026-11-11\n\n## Summary\nTwo findings, one P1, enough text here to be a real review of the day.\n\n## Findings\n- [ ] **P1** `lib/a.ts:3` — leaks.\n- [ ] **P3** `b.ts:9` — naming.\n\n## Production and checks\nAll green.\n';
  it('is accepted with its sections, and counts the findings', () => {
    expect(validateReview(good)).toEqual({ ok: true, findings: 2 });
    expect(unchecked(good)).toHaveLength(2);
  });
  it('is refused when empty, short, or missing a section', () => {
    expect(validateReview('').ok).toBe(false);
    expect(validateReview('too short').ok).toBe(false);
    expect(validateReview(good.replace('## Findings', '## Stuff'))).toMatchObject({ ok: false });
    expect(validateReview(good.replace('## Production and checks', ''))).toMatchObject({ ok: false });
  });
  it('accepts a clean night that says so (no findings is a valid review)', () => {
    const clean = good.replace(/- \[ \].*\n/g, 'Nothing to fix tonight.\n');
    expect(validateReview(clean)).toEqual({ ok: true, findings: 0 });
  });
  it('does not count checked boxes', () => {
    expect(unchecked('- [x] done\n- [ ] open\n  - [ ] nested open')).toHaveLength(2);
  });
});
