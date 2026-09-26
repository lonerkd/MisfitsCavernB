// Readable accents: user- and module-chosen colours are used for text on the
// suite's near-black surfaces, where some (indigo, violet, deep reds) fall
// below WCAG AA. `readable` lightens a colour just enough to reach the ratio.

const hex6 = (h: string) => {
  const m = h.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  const v = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
};

const channel = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const luminance = ([r, g, b]: number[]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

export function contrastRatio(a: string, b: string): number {
  const x = hex6(a), y = hex6(b);
  if (!x || !y) return 1;
  const [hi, lo] = [luminance(x), luminance(y)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The colour, lightened toward white until it reaches `min` against `bg`
 * (default: the lightest tinted panel the suite draws, so it passes on all of
 * them). Non-hex input is returned as is.
 */
export function readable(color: string, min = 4.5, bg = '#1a1d33'): string {
  const rgb = hex6(color);
  if (!rgb) return color;
  for (let t = 0; t <= 1.0001; t += 0.05) {
    const mixed = rgb.map((c) => Math.round(c + (255 - c) * t));
    const out = '#' + mixed.map((c) => c.toString(16).padStart(2, '0')).join('');
    if (contrastRatio(out, bg) >= min) return out;
  }
  return '#ffffff';
}

/** Black or white — whichever reads better on a filled `bg` (for buttons in any accent). */
export function textOn(bg: string): string {
  return contrastRatio('#ffffff', bg) >= contrastRatio('#060606', bg) ? '#ffffff' : '#060606';
}
