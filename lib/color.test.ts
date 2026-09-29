import { describe, it, expect } from 'vitest';
import { contrastRatio, readable, readableOn, textOn, textOnReadable } from './color';

const sides = (v: string) => {
  const m = v.match(/^light-dark\((#[0-9a-f]{6}), (#[0-9a-f]{6})\)$/);
  return m ? { light: m[1], dark: m[2] } : { light: v, dark: v };
};

describe('readable accents', () => {
  it('keeps each side of a colour that already passes there', () => {
    expect(readable('#e0ddae')).toMatch(/, #e0ddae\)$/);
    expect(readable('#1f6f4a')).toMatch(/^light-dark\(#1f6f4a,/);
    expect(readableOn('#e0ddae')).toBe('#e0ddae');
  });

  it('lightens failing colours on the dark surfaces and darkens them on the light ones', () => {
    for (const c of ['#6366f1', '#4338ca', '#8b5cf6', '#e8431a', '#336467', '#e0ddae', '#f5c542', '#ec4899']) {
      const { light, dark } = sides(readable(c));
      expect(contrastRatio(dark, '#0c0c0e')).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(dark, '#040710')).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(dark, '#1a1d33')).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(dark, '#213d70')).toBeGreaterThanOrEqual(4.5);
      for (const bg of ['#f6f1e7', '#ffffff', '#e7dfcd', '#eef6f5']) expect(contrastRatio(light, bg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('passes through what it cannot parse', () => {
    expect(readable('var(--accent)')).toBe('var(--accent)');
  });
});

describe('textOn', () => {
  it('picks the label colour that reads on a filled accent', () => {
    for (const bg of ['#8b5cf6', '#e8431a', '#10b981', '#1e1b4b', '#fbbf24']) {
      expect(contrastRatio(textOn(bg), bg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('follows a readable fill into either kind of theme', () => {
    for (const c of ['#e8431a', '#f5c542', '#6366f1']) {
      const fill = sides(readable(c)), ink = sides(textOnReadable(c));
      expect(contrastRatio(ink.light, fill.light)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(ink.dark, fill.dark)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
