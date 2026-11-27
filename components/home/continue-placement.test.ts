import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The jump-back-in offer leads the signed-in home (owner, Nov 26 2026: "jump
// back in should be higher"). It renders once — above the hero on the home
// page — and no longer inside YourDay, where it sat a full hero-scroll down.
const root = process.cwd();
const page = readFileSync(join(root, 'app/(suite)/page.tsx'), 'utf8');
const yourDay = readFileSync(join(root, 'components/community/YourDay.tsx'), 'utf8');

describe('continue offer placement', () => {
  it('the home page renders the offer above the hero', () => {
    const offerAt = page.indexOf('<ContinueOffer inline />');
    const heroAt = page.indexOf('<Hero ');
    expect(offerAt).toBeGreaterThan(-1);
    expect(heroAt).toBeGreaterThan(-1);
    expect(offerAt).toBeLessThan(heroAt);
  });

  it('YourDay no longer renders a second copy', () => {
    expect(yourDay).not.toContain('ContinueOffer');
  });
});
