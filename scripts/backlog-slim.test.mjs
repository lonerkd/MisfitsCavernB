import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { condense, slimBacklog } from './backlog-slim.mjs';

const root = new URL('../.cavern-intelligence/', import.meta.url);

describe('the backlog index', () => {
  it('keeps the heading, the first real sentence, the plan link and the "Done when"', () => {
    const body = 'Plan: [plans/x.md](plans/x.md) (designed). A step-by-step interview that builds the story skeleton before any dialogue is written, and teaches a newcomer. More text about what was built that need not be in the index. Done when a first-time user can answer it and a reload resumes.';
    const out = condense(body);
    expect(out).toContain('A step-by-step interview');
    expect(out).toContain('Plan: [plans/x.md](plans/x.md).');
    expect(out).toContain('Done when a first-time user can answer it and a reload resumes.');
    expect(out).not.toContain('need not be in the index');
  });

  it('copies sections 1 and 2 whole and condenses every item, in order', () => {
    const detail = '# Backlog\n\nIntro.\n\n---\n\n## 1. Owner\n\n- Do the thing.\n\n## 3. Upgrades\n\n### 3.1 One — S\nA long first sentence that explains the item well enough to choose it. History follows. Done when it works.\n\n### 3.2 Two — M\nAnother sentence that is long enough to count as the first one. More. Done when that works too.\n';
    const out = slimBacklog(detail);
    expect(out).toContain('- Do the thing.');
    expect(out.indexOf('### 3.1 One')).toBeLessThan(out.indexOf('### 3.2 Two'));
    expect(out).not.toContain('History follows');
    expect(out).toContain('generated');
  });

  it('BACKLOG.md is what BACKLOG-detail.md generates, and every item is still there', () => {
    const detail = readFileSync(new URL('BACKLOG-detail.md', root), 'utf8');
    const index = readFileSync(new URL('BACKLOG.md', root), 'utf8');
    expect(index).toBe(slimBacklog(detail));
    const ids = (t) => [...t.matchAll(/^### (\d+\.\d+[a-z]?) /gm)].map((m) => m[1]);
    expect(ids(index)).toEqual(ids(detail));
    expect(index.length).toBeLessThan(detail.length / 2);
  });
});
