import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { THEMES, contrast, customTokens, resolveTheme, themeMode, toThemeChoice } from './themes';

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

describe('choosing', () => {
  it('reads old names, objects and junk', () => {
    expect(toThemeChoice('cyberpunk')).toEqual({ id: 'neon' });
    expect(toThemeChoice('obsidian')).toEqual({ id: 'mono' });
    expect(toThemeChoice('paper')).toEqual({ id: 'paper' });
    expect(toThemeChoice({ id: 'system' })).toEqual({ id: 'system' });
    expect(toThemeChoice({ id: 'custom', bg: '#FFFFFF', accent: '#0b7a78' })).toEqual({ id: 'custom', bg: '#ffffff', accent: '#0b7a78' });
    expect(toThemeChoice({ id: 'custom', bg: 'white', accent: '#000000' })).toEqual({ id: 'default' });
    expect(toThemeChoice('nope')).toEqual({ id: 'default' });
    expect(toThemeChoice(null)).toEqual({ id: 'default' });
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
