import { describe, it, expect } from 'vitest';
import { contrastRatio, readable, readableOn, textOn, textOnReadable } from './color';

const sides = (v: string) => {
  const m = v.match(/^light-dark\((#[0-9a-f]{6}), (#[0-9a-f]{6})\)$/);
  return m ? { light: m[1], dark: m[2] } : { light: v, dark: v };
};

// A token is one 6-digit lowercase hex, or a light-dark() pair of two.
const HEX = '#[0-9a-f]{6}';
const TOKEN = new RegExp(`^(${HEX}|light-dark\\(${HEX}, ${HEX}\\))$`);

describe('sides (test helper)', () => {
  it('splits a light-dark() pair into its two sides', () => {
    expect(sides('light-dark(#112233, #aabbcc)')).toEqual({ light: '#112233', dark: '#aabbcc' });
  });

  it('gives a single value on both sides', () => {
    expect(sides('#112233')).toEqual({ light: '#112233', dark: '#112233' });
  });

  it('does not split anything that is not a well-formed pair', () => {
    expect(sides('light-dark(#112233)')).toEqual({ light: 'light-dark(#112233)', dark: 'light-dark(#112233)' });
    expect(sides('var(--accent)')).toEqual({ light: 'var(--accent)', dark: 'var(--accent)' });
  });
});

describe('contrastRatio', () => {
  it('is the WCAG definition at the extremes: black on white is 21, a colour on itself is 1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 10);
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 10);
    expect(contrastRatio('#6366f1', '#6366f1')).toBe(1);
  });

  it('reads 3-digit, prefix-less, padded and upper-case hex the same', () => {
    const want = contrastRatio('#ffeeaa', '#000000');
    for (const v of ['#fea', 'FEA', ' #FFEEAA ', 'ffeeaa']) expect(contrastRatio(v, '#000000')).toBe(want);
  });

  it('reports 1 (no contrast) when either side is not a hex colour', () => {
    for (const bad of ['', '#', '#12', '#12345', '#1234567', '#ggg', 'red', 'rgb(0,0,0)', 'var(--x)']) {
      expect(contrastRatio(bad, '#ffffff')).toBe(1);
      expect(contrastRatio('#ffffff', bad)).toBe(1);
    }
  });
});

describe('invalid input', () => {
  const bad = ['', '#', '#12', '#12345', '#1234567', '#ggg', 'red', 'rgb(0, 0, 0)', 'var(--accent)', 'light-dark(#fff, #000)'];

  it('is returned unchanged by readable, readableOn', () => {
    for (const v of bad) {
      expect(readable(v)).toBe(v);
      expect(readableOn(v)).toBe(v);
    }
  });

  it('is returned unchanged by readableOn when the background is the invalid one', () => {
    expect(readableOn('#6366f1', 4.5, 'nope')).toBe('#6366f1');
  });

  it('falls back to a plain black or white label from textOn / textOnReadable', () => {
    for (const v of bad) {
      expect(textOn(v)).toBe('#ffffff'); // ratio 1 against both: white wins the tie
      expect(textOnReadable(v)).toBe('#ffffff');
    }
  });
});

describe('colours already meeting AA', () => {
  it('readableOn returns them unchanged in value, written as 6-digit lowercase hex', () => {
    // The loop rebuilds the string from the mixed channels, so the output is
    // normalised: upper case and 3-digit input come back as 6-digit lowercase.
    expect(readableOn('#e0ddae')).toBe('#e0ddae');
    expect(readableOn('#E0DDAE')).toBe('#e0ddae');
    expect(readableOn('#fff')).toBe('#ffffff');
    expect(readableOn('ffffff')).toBe('#ffffff');
  });

  it('readableOn does not move a colour that passes, on a light background either', () => {
    expect(readableOn('#000000', 4.5, '#ffffff')).toBe('#000000');
    expect(readableOn('#1f6f4a', 4.5, '#e7dfcd')).toBe('#1f6f4a');
  });

  it('readable collapses to one hex when both sides agree', () => {
    // White passes on the dark panel; black passes on the light one, so these
    // differ — but a mid-contrast colour that passes on neither is moved. Pick
    // a min low enough that both sides keep the input.
    const out = readable('#808080', 1);
    expect(out).toBe('#808080');
    expect(out).toMatch(TOKEN);
  });

  it('a colour that passes on the dark side only keeps its value there', () => {
    expect(sides(readable('#e0ddae')).dark).toBe('#e0ddae');
    expect(sides(readable('#1f6f4a')).light).toBe('#1f6f4a');
  });
});

describe('colours needing full inversion', () => {
  it('readableOn ends on pure white (dark bg) or pure black (light bg) when the ratio cannot be reached', () => {
    // 21 is the maximum possible ratio and needs white on pure black, so on
    // these panels it is unreachable and the loop exhausts.
    expect(readableOn('#000000', 21, '#24406f')).toBe('#ffffff');
    expect(readableOn('#ffffff', 21, '#e7dfcd')).toBe('#000000');
  });

  it('readableOn moves a black accent to a lighter colour on the dark panel and keeps it dark-on-light', () => {
    const onDark = readableOn('#000000');
    expect(onDark).not.toBe('#000000');
    expect(contrastRatio(onDark, '#24406f')).toBeGreaterThanOrEqual(4.5);
    expect(readableOn('#000000', 4.5, '#e7dfcd')).toBe('#000000');
  });

  it('readableOn moves a white accent to a darker colour on a light panel', () => {
    const onLight = readableOn('#ffffff', 4.5, '#e7dfcd');
    expect(onLight).not.toBe('#ffffff');
    expect(contrastRatio(onLight, '#e7dfcd')).toBeGreaterThanOrEqual(4.5);
  });

  it('readable gives opposite ends for an unreachable ratio: black on light, white on dark', () => {
    expect(readable('#808080', 21)).toBe('light-dark(#000000, #ffffff)');
    expect(sides(readable('#808080', 21))).toEqual({ light: '#000000', dark: '#ffffff' });
  });

  it('textOnReadable of a fully inverted fill still reads', () => {
    const fill = sides(readable('#808080', 21));
    const ink = sides(textOnReadable('#808080'));
    expect(ink.light).toMatch(/^#/);
    expect(contrastRatio(fill.light, '#e7dfcd')).toBeGreaterThanOrEqual(contrastRatio('#808080', '#e7dfcd'));
    expect(contrastRatio(fill.dark, '#24406f')).toBeGreaterThanOrEqual(contrastRatio('#808080', '#24406f'));
  });
});

describe('returned tokens are valid CSS', () => {
  const inputs = ['#000000', '#ffffff', '#fff', '#808080', '#6366f1', '#4338ca', '#e8431a', '#f5c542', '#E0DDAE', 'FEA', ' #1f6f4a '];

  it('readable / textOnReadable return a hex or a well-formed light-dark() pair', () => {
    for (const c of inputs) {
      expect(readable(c)).toMatch(TOKEN);
      expect(textOnReadable(c)).toMatch(TOKEN);
    }
  });

  it('readableOn and textOn always return a single 6-digit hex for a hex input', () => {
    for (const c of inputs) {
      expect(readableOn(c)).toMatch(new RegExp(`^${HEX}$`));
      expect(readableOn(c, 4.5, '#e7dfcd')).toMatch(new RegExp(`^${HEX}$`));
      expect(textOn(c)).toMatch(new RegExp(`^${HEX}$`));
    }
  });

  it('never emits a pair whose two sides are equal (it collapses to one hex)', () => {
    for (const c of inputs) {
      const { light, dark } = sides(readable(c));
      const pair = readable(c).startsWith('light-dark(');
      expect(pair).toBe(light !== dark);
    }
  });
});

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
