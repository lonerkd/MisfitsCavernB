import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const page = readFileSync('app/(suite)/studio/page.tsx', 'utf8');
const css = readFileSync('app/(suite)/studio/studio-page.module.css', 'utf8');

describe('Studio project picker is folded into the tab row', () => {
  it('has no separate full-width header strip', () => {
    expect(page).not.toMatch(/<header className=\{page\.bar\}/);
    expect(css).not.toMatch(/^\.bar\s*\{/m);
  });
  it('keeps the labelled Active project select inside the sections nav, before the tab list', () => {
    const nav = page.slice(page.indexOf('aria-label="Studio sections"'));
    expect(nav.indexOf('aria-label="Active project"')).toBeGreaterThan(-1);
    expect(nav.indexOf('aria-label="Active project"')).toBeLessThan(nav.indexOf('ref={tabListRef}'));
  });
  it('is a 44px target on touch and sticks to the top', () => {
    expect(css).toMatch(/pointer: coarse\) \{ \.projectPicker select \{ height: 44px/);
    expect(css).toMatch(/\.tabs \{[^}]*top: 0;/);
  });
});
