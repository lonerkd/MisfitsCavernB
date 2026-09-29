// Readable accents: user- and module-chosen colours are used as text on the
// suite's surfaces, where some fall below WCAG AA — indigo and deep reds on the
// dark themes, yellows and pale tints on the light ones. `readable` moves a
// colour just enough to reach the ratio, in the direction the theme needs.

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

/** The darkest panel the dark themes draw text on, and the light themes'. */
const DARK_PANEL = '#24406f';
const LIGHT_PANEL = '#e7dfcd';

/**
 * The colour, moved toward white (on a dark `bg`) or black (on a light one)
 * until it reaches `min` against `bg`. Non-hex input is returned as is.
 */
export function readableOn(color: string, min = 4.5, bg = DARK_PANEL): string {
  const rgb = hex6(color);
  const back = hex6(bg);
  if (!rgb || !back) return color;
  const toward = luminance(back) > 0.4 ? 0 : 255;
  for (let t = 0; t <= 1.0001; t += 0.05) {
    const mixed = rgb.map((c) => Math.round(c + (toward - c) * t));
    const out = '#' + mixed.map((c) => c.toString(16).padStart(2, '0')).join('');
    if (contrastRatio(out, bg) >= min) return out;
  }
  return toward ? '#ffffff' : '#000000';
}

/**
 * The colour as text in any theme: a CSS `light-dark()` pair — darkened for
 * the light themes, lightened for the dark ones (`darkBg` is the panel it
 * must pass on there). The page's color-scheme picks the side. Non-hex input
 * is returned as is.
 */
export function readable(color: string, min = 4.5, darkBg = DARK_PANEL): string {
  if (!hex6(color)) return color;
  const light = readableOn(color, min, LIGHT_PANEL);
  const dark = readableOn(color, min, darkBg);
  return light === dark ? dark : `light-dark(${light}, ${dark})`;
}

/** Black or white text for a fill of `readable(color)` — in any theme. */
export function textOnReadable(color: string): string {
  if (!hex6(color)) return textOn(color);
  const light = textOn(readableOn(color, 4.5, LIGHT_PANEL));
  const dark = textOn(readableOn(color));
  return light === dark ? dark : `light-dark(${light}, ${dark})`;
}

/** Black or white — whichever reads better on a filled `bg` (for buttons in any accent). */
export function textOn(bg: string): string {
  return contrastRatio('#ffffff', bg) >= contrastRatio('#060606', bg) ? '#ffffff' : '#060606';
}
