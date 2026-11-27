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
  it('floors phone form controls at 16px so iOS never zooms into a field', () => {
    expect(css).toMatch(/input, textarea, select \{\s*font-size: 16px !important;/);
  });
  it('keeps the phone audit hard-coded colours out of the pages it fixed', () => {
    for (const f of ['app/(suite)/crew/page.tsx', 'app/(suite)/profile/page.tsx']) {
      expect(readFileSync(join(process.cwd(), f), 'utf8')).not.toMatch(/#00ff00|rgba\(0,\s*255,\s*0/);
    }
  });
  it('keeps every page below the status bar and clear of the Dynamic Island rail', () => {
    expect(css).toMatch(/--mc-safe-top:\s*env\(safe-area-inset-top/);
    expect(css).toMatch(/^body \{\s*padding-top:\s*var\(--mc-safe-top\)/m);
    expect(css).toMatch(/body \{ padding-left: max\(env\(safe-area-inset-left\), var\(--mc-rail\)\)/);
    expect(css).toMatch(/--mc-rail: 56px/);
    expect(css).not.toMatch(/var\(--mc-safe-top\) - var\(--mc-safe-top\)/);
  });
});
