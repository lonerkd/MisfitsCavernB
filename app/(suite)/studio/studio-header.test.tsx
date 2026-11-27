import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The Studio header used to be two independently sticky bars (the project bar
// at top: 0, the tab strip at top: 58px). On the owner's phone the tab pill
// rode up over the project picker (Nov 26, 2026): two sticky offsets can
// drift apart in some scroll/zoom states. They now stick as one wrapper.
describe('studio header', () => {
  const css = readFileSync(join(process.cwd(), 'app/(suite)/studio/studio-page.module.css'), 'utf8');
  const block = (name: string) => css.match(new RegExp(`\\.${name}\\s*\\{([^}]*)\\}`))?.[1] ?? '';

  it('sticks as a single wrapper, not two bars', () => {
    expect(block('stickyHead')).toMatch(/position:\s*sticky/);
    expect(block('stickyHead')).toMatch(/top:\s*0/);
    expect(block('bar')).not.toMatch(/position:\s*sticky/);
    expect(block('tabs')).not.toMatch(/position:\s*sticky/);
  });

  it('the page renders the header inside the sticky wrapper', () => {
    const tsx = readFileSync(join(process.cwd(), 'app/(suite)/studio/page.tsx'), 'utf8');
    expect(tsx).toContain('className={page.stickyHead}');
  });

  it('the phone project picker meets the iOS focus-zoom floor (16px)', () => {
    expect(css).toMatch(/\.projectPicker select \{[^}]*font-size:\s*16px/);
  });
});
