import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_CHOICE, DEFAULT_THEME_ID, EARLY_THEME_SCRIPT, THEMES, contrast, customTokens, isFrosted, resolveTheme, themeMode, toThemeChoice, withFrosted } from './themes';

const css = readFileSync(join(__dirname, '..', '..', 'app', 'globals.css'), 'utf8');
const block = (id: string) => {
  const m = css.match(new RegExp(`\\[data-theme="${id}"\\]\\s*\\{([^}]*)\\}`));
  return m ? m[1] : null;
};
const token = (body: string, name: string) => body.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1].trim() ?? null;

describe('every theme', () => {
  it.each(THEMES.map((t) => [t.id, t] as const))('%s has its tokens in globals.css, matching its swatch', (_id, t) => {
    const b = block(t.id);
    expect(b, `[data-theme="${t.id}"] block`).not.toBeNull();
    const [bg, fg, accent] = t.swatch;
    expect(token(b!, '--bg')?.toLowerCase()).toBe(bg.toLowerCase());
    expect(token(b!, '--fg')?.toLowerCase()).toBe(fg.toLowerCase());
    expect(token(b!, '--accent')?.toLowerCase()).toBe(accent.toLowerCase());
    for (const name of ['--fg-rgb', '--ink-rgb', '--fg-strong', '--surface', '--on-accent', '--border', '--fg-muted']) expect(token(b!, name), `${t.id} ${name}`).not.toBeNull();
    expect(b).toContain(`color-scheme: ${t.mode}`);
  });

  it.each(THEMES.map((t) => [t.id, t] as const))('%s reads: text AA, accent visible, text on accent readable', (_id, t) => {
    const [bg, fg, accent] = t.swatch;
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(7);
    expect(contrast(accent, bg)).toBeGreaterThanOrEqual(3);
    const onAccent = token(block(t.id)!, '--on-accent')!;
    expect(contrast(onAccent, accent)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('dim text', () => {
  const hex2 = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  // --fg-dim is an rgba over a surface: flatten it, then measure against that surface.
  it.each(THEMES.map((t) => [t.id] as const))('%s: --fg-dim reads on every solid surface (4.5:1)', (id) => {
    const b = block(id)!;
    const m = token(b, '--fg-dim')!.match(/rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/)!;
    const [r, g, bl, a] = [+m[1], +m[2], +m[3], +m[4]];
    for (const name of ['--bg', '--bg-2', '--bg-3', '--bg-4']) {
      const s = token(b, name)!;
      const n = parseInt(s.slice(1), 16);
      const flat = '#' + [r * a + ((n >> 16) & 255) * (1 - a), g * a + ((n >> 8) & 255) * (1 - a), bl * a + (n & 255) * (1 - a)].map(hex2).join('');
      expect(contrast(flat, s), `${id} ${name}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('the default', () => {
  it('is Misfit, first in the picker, and what a person with no choice sees', () => {
    expect(DEFAULT_THEME_ID).toBe('misfit');
    expect(DEFAULT_CHOICE).toEqual({ id: 'misfit' });
    expect(THEMES[0].id).toBe('misfit');
    expect(THEMES[0].mode).toBe('dark');
  });

  it('keeps the rest in their order after it', () => {
    expect(THEMES.map((t) => t.id)).toEqual(['misfit', 'default', 'paper', 'vampire', 'blueprint', 'terminal', 'editorial', 'mono', 'glass', 'neon', 'slate', 'lagoon', 'forest']);
  });
});

describe('the early script (first paint)', () => {
  // Runs the script against a stand-in page, the way the browser runs it before anything is drawn.
  const paint = (stored: string | null, light = false): string | undefined => {
    const root: { dataset: Record<string, string>; style: { setProperty: () => void } } = { dataset: {}, style: { setProperty: () => {} } };
    const localStorage = { getItem: (k: string) => (k === 'mc_theme' ? stored : null) };
    const window = { matchMedia: () => ({ matches: light }) };
    new Function('localStorage', 'document', 'window', EARLY_THEME_SCRIPT)(localStorage, { documentElement: root }, window);
    return root.dataset.theme;
  };

  it('paints a stored theme, as chosen', () => {
    expect(paint(JSON.stringify({ id: 'slate' }))).toBe('slate');
    expect(paint(JSON.stringify({ id: 'default' }))).toBe('default');
    expect(paint('"neon"')).toBe('neon');
    expect(paint('cyberpunk')).toBe('neon');
  });

  it('falls back to the default for an id the catalogue does not have (no CSS block would style it)', () => {
    expect(paint(JSON.stringify({ id: 'nope' }))).toBe('misfit');
    expect(paint('"<script>"')).toBe('misfit');
  });

  it('follows the device for System, and leaves the page as rendered when nothing is stored', () => {
    expect(paint(JSON.stringify({ id: 'system' }), true)).toBe('paper');
    expect(paint(JSON.stringify({ id: 'system' }), false)).toBe('default');
    expect(paint(null)).toBeUndefined();
  });
});

describe('choosing', () => {
  it('reads old names, objects and junk', () => {
    expect(toThemeChoice('cyberpunk')).toEqual({ id: 'neon' });
    expect(toThemeChoice('obsidian')).toEqual({ id: 'mono' });
    expect(toThemeChoice('paper')).toEqual({ id: 'paper' });
    expect(toThemeChoice({ id: 'system' })).toEqual({ id: 'system' });
    expect(toThemeChoice({ id: 'custom', bg: '#FFFFFF', accent: '#0b7a78' })).toEqual({ id: 'custom', bg: '#ffffff', accent: '#0b7a78' });
    expect(toThemeChoice({ id: 'custom', bg: 'white', accent: '#000000' })).toEqual({ id: 'misfit' });
    expect(toThemeChoice('nope')).toEqual({ id: 'misfit' });
    expect(toThemeChoice(null)).toEqual({ id: 'misfit' });
    // Someone who chose Cavern keeps it: only a missing or unreadable choice falls back.
    expect(toThemeChoice('default')).toEqual({ id: 'default' });
  });

  it('System follows the device', () => {
    expect(resolveTheme({ id: 'system' }, true)).toBe('paper');
    expect(resolveTheme({ id: 'system' }, false)).toBe('default');
    expect(themeMode({ id: 'system' }, true)).toBe('light');
    expect(themeMode({ id: 'editorial' }, false)).toBe('light');
  });

  it('a custom theme picks light or dark text from its background', () => {
    const light = customTokens('#f0f0f0', '#0b7a78');
    const dark = customTokens('#101010', '#e8431a');
    expect(light['--ink-rgb']).toBe('0, 0, 0');
    expect(light['color-scheme']).toBe('light');
    expect(dark['--ink-rgb']).toBe('255, 255, 255');
    expect(contrast('#f0f0f0', '#141210')).toBeGreaterThan(7);
    expect(customTokens('#000000', '#ffff00')['--on-accent']).toBe('#000000');
  });
});

describe('frosted mode (the glass mode over any theme)', () => {
  it('is kept with the choice, and only when it is exactly true', () => {
    expect(isFrosted(toThemeChoice({ id: 'slate', frosted: true }))).toBe(true);
    expect(toThemeChoice({ id: 'slate', frosted: true })).toEqual({ id: 'slate', frosted: true });
    expect(toThemeChoice({ id: 'custom', bg: '#101010', accent: '#e8431a', frosted: true })).toEqual({ id: 'custom', bg: '#101010', accent: '#e8431a', frosted: true });
    for (const junk of ['yes', 1, null, 'true']) expect(isFrosted(toThemeChoice({ id: 'slate', frosted: junk }))).toBe(false);
    expect(toThemeChoice('slate')).toEqual({ id: 'slate' });
  });
  it('switches on and off without touching the theme, and an off choice stays as small as it was', () => {
    const on = withFrosted({ id: 'paper' }, true);
    expect(on).toEqual({ id: 'paper', frosted: true });
    expect(withFrosted(on, false)).toEqual({ id: 'paper' });
    expect('frosted' in withFrosted(on, false)).toBe(false);
  });
  it('is painted before the first frame, with the theme', () => {
    const run = (stored: unknown) => {
      const root: { dataset: Record<string, string>; style: { setProperty: () => void } } = { dataset: {}, style: { setProperty: () => {} } };
      new Function('localStorage', 'document', 'window', EARLY_THEME_SCRIPT)({ getItem: (k: string) => (k === 'mc_theme' ? JSON.stringify(stored) : null) }, { documentElement: root }, { matchMedia: () => ({ matches: false }) });
      return root.dataset;
    };
    expect(run({ id: 'slate', frosted: true })).toEqual({ theme: 'slate', frosted: '' });
    expect(run({ id: 'slate' })).toEqual({ theme: 'slate' });
  });
  // The frosted surfaces are the theme's own backgrounds, translucent: measured against the page behind them, text must still read.
  const hexOf = (b: string, name: string) => token(b, name)!;
  const rgb = (h: string) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const hex = (c: number[]) => '#' + c.map((x) => Math.round(x).toString(16).padStart(2, '0')).join('');
  const over = (top: string, a: number, under: string) => hex(rgb(top).map((v, i) => v * a + rgb(under)[i] * (1 - a)));
  // [token, the background it is mixed from, its alpha, its share of the lift] — mirrors the CSS (the lift is the text colour at 8% on a dark theme, white at 44% on a light one).
  const SURFACES: Array<[string, string, number, number]> = [['--surface', '--bg-3', 0.62, 1], ['--surface-2', '--bg-2', 0.54, 0.75], ['--glass', '--bg-2', 0.58, 0.75], ['--panel', '--bg-3', 0.46, 0.75], ['--panel-2', '--bg-4', 0.54, 1]];
  it.each(THEMES.map((t) => [t.id, t.mode] as const))('%s (%s): text reads on every frosted surface over the page (fg 7:1, dim text 4.5:1)', (id, mode) => {
    const b = block(id)!;
    const m = token(b, '--fg-dim')!.match(/rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/)!;
    const dim = [+m[1], +m[2], +m[3]]; const dimA = +m[4];
    const [tint, lift] = mode === 'light' ? ['#ffffff', 0.44] : [hexOf(b, '--fg'), 0.08];
    for (const [name, base, alpha, share] of SURFACES) {
      // The page behind, the theme's background over it, then the lift (the worst case for the text).
      const surface = over(tint, lift * share, over(hexOf(b, base), alpha, hexOf(b, '--bg')));
      expect(contrast(hexOf(b, '--fg'), surface), `${id} ${name} fg`).toBeGreaterThanOrEqual(7);
      expect(contrast(over(hex(dim), dimA, surface), surface), `${id} ${name} dim`).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('lifts every light theme toward white, and only the light ones', () => {
    const listed = [...css.matchAll(/\[data-frosted\]\[data-theme="(\w+)"\]/g)].map((m) => m[1]).sort();
    expect(listed).toEqual(THEMES.filter((t) => t.mode === 'light').map((t) => t.id).sort());
    const custom = customTokens('#f0f0f0', '#0b7a78');
    expect(custom['--frost-tint']).toBe('#ffffff');
    expect(customTokens('#101010', '#e8431a')['--frost-lift']).toBe('8%');
  });
  it('has its CSS layer, with the fallbacks for no blur and for less transparency', () => {
    expect(css).toMatch(/\[data-frosted\]\s*\{[^}]*--frost:\s*blur\(/);
    expect(css).toMatch(/prefers-reduced-transparency: reduce\)\s*\{\s*\[data-frosted\]\s*\{[^}]*--frost:\s*none/);
    expect(css).toMatch(/@supports not/);
  });
});
