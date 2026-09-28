import { describe, it, expect } from 'vitest';
import { contrastRatio, readable } from './color';

describe('readable accents', () => {
  it('leaves colours that already pass alone', () => {
    expect(readable('#e0ddae')).toBe('#e0ddae');
    expect(readable('#10b981')).toBe('#10b981');
  });

  it('lightens failing colours just enough to reach AA on the dark surfaces', () => {
    for (const c of ['#6366f1', '#4338ca', '#8b5cf6', '#e8431a', '#336467']) {
      const out = readable(c);
      expect(contrastRatio(out, '#0c0c0e')).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(out, '#040710')).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('passes through what it cannot parse', () => {
    expect(readable('var(--accent)')).toBe('var(--accent)');
  });
});

describe('textOn', () => {
  it('picks the label colour that reads on a filled accent', async () => {
    const { textOn, contrastRatio } = await import('./color');
    for (const bg of ['#8b5cf6', '#e8431a', '#10b981', '#1e1b4b', '#fbbf24']) {
      expect(contrastRatio(textOn(bg), bg)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
