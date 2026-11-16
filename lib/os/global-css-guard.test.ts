import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// A bare `section { padding }` in globals.css once added 90 px above and below every <section> in the app (the blank gaps between
// Settings' sections and on the project page). Element rules like that reach everything: scope them with a class.
describe('globals.css', () => {
  const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8');
  it('has no bare element rule that pads every <section>', () => {
    expect(css).not.toMatch(/^section\s*\{[^}]*padding/m);
  });
  it('keeps the phone audit hard-coded colours out of the pages it fixed', () => {
    for (const f of ['app/(suite)/crew/page.tsx', 'app/(suite)/profile/page.tsx']) {
      expect(readFileSync(join(process.cwd(), f), 'utf8')).not.toMatch(/#00ff00|rgba\(0,\s*255,\s*0/);
    }
  });
});
