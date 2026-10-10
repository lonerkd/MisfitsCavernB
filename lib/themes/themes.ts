// Themes: the look of the whole suite. Each preset is a set of CSS tokens in
// app/globals.css under [data-theme="<id>"]; this is the catalogue, how a
// choice resolves (System follows the device's light/dark setting; Custom
// derives light or dark from its background), and applying it to the page.
// Pure except `applyTheme` / `readLocalTheme` (DOM, localStorage).

export type ThemeId =
  | 'default' | 'terminal' | 'blueprint' | 'mono' | 'paper' | 'editorial'
  | 'glass' | 'neon' | 'slate' | 'lagoon' | 'forest' | 'vampire';

export interface ThemeDef {
  id: ThemeId;
  label: string;
  hint: string;
  mode: 'dark' | 'light';
  /** Background, text, accent — for the picker's swatch. */
  swatch: [string, string, string];
}

export const THEMES: ThemeDef[] = [
  { id: 'default', label: 'Cavern', hint: 'The house look: vanilla on night, sinopia red', mode: 'dark', swatch: ['#040710', '#e0ddae', '#e8431a'] },
  { id: 'terminal', label: 'Terminal', hint: 'Green phosphor, monospace everything', mode: 'dark', swatch: ['#030a05', '#8dfc9b', '#3dff6e'] },
  { id: 'blueprint', label: 'Blueprint', hint: 'Drafting-table blue with a grid', mode: 'dark', swatch: ['#0b2447', '#dbe8ff', '#5cc8ff'] },
  { id: 'mono', label: 'Mono', hint: 'Black, white and greys — no colour', mode: 'dark', swatch: ['#000000', '#f2f2f2', '#ffffff'] },
  { id: 'paper', label: 'Paper', hint: 'Warm off-white, ink and terracotta', mode: 'light', swatch: ['#f6f1e7', '#1f1a14', '#b3361a'] },
  { id: 'editorial', label: 'Editorial', hint: 'White page, black type, a red rule', mode: 'light', swatch: ['#ffffff', '#111111', '#c8102e'] },
  { id: 'glass', label: 'Glass', hint: 'Deep gradient under frosted panels', mode: 'dark', swatch: ['#0c1024', '#eef0ff', '#8b9cff'] },
  { id: 'neon', label: 'Neon', hint: 'Night city: magenta and electric cyan', mode: 'dark', swatch: ['#0b0114', '#f3e8ff', '#ff2bd6'] },
  { id: 'slate', label: 'Slate', hint: 'Cool grey-blue, easy on the eyes', mode: 'dark', swatch: ['#11161d', '#d6dde6', '#7aa2f7'] },
  { id: 'lagoon', label: 'Lagoon', hint: 'Light, with teal', mode: 'light', swatch: ['#eef6f5', '#0e2a2c', '#096a68'] },
  { id: 'forest', label: 'Forest', hint: 'Sage and gold on deep green', mode: 'dark', swatch: ['#090c0a', '#f4ebd0', '#5f9e8f'] },
  { id: 'vampire', label: 'Vampire', hint: 'Crimson and violet on black', mode: 'dark', swatch: ['#090101', '#f5eedc', '#f04444'] },
];

const IDS = new Set<string>(THEMES.map((t) => t.id));
/** Names from before this catalogue. */
const LEGACY: Record<string, ThemeId> = { cyberpunk: 'neon', obsidian: 'mono' };

export type ThemeChoice =
  | { id: ThemeId | 'system' }
  | { id: 'custom'; bg: string; accent: string };

export const DEFAULT_CHOICE: ThemeChoice = { id: 'default' };
const HEX = /^#[0-9a-f]{6}$/i;

/** Tolerant reader for a stored choice (account prefs, this device, or an old plain name). */
export function toThemeChoice(raw: unknown): ThemeChoice {
  if (typeof raw === 'string') {
    const id: string = LEGACY[raw] ?? raw;
    return id === 'system' || IDS.has(id) ? { id: id as ThemeId | 'system' } : DEFAULT_CHOICE;
  }
  if (!raw || typeof raw !== 'object') return DEFAULT_CHOICE;
  const r = raw as Record<string, unknown>;
  if (r.id === 'custom') {
    return typeof r.bg === 'string' && HEX.test(r.bg) && typeof r.accent === 'string' && HEX.test(r.accent)
      ? { id: 'custom', bg: r.bg.toLowerCase(), accent: r.accent.toLowerCase() }
      : DEFAULT_CHOICE;
  }
  return typeof r.id === 'string' ? toThemeChoice(r.id) : DEFAULT_CHOICE;
}

// ── Colour maths (WCAG relative luminance and contrast) ───────────

function channels(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** The tokens a custom theme sets: text and overlays follow the background's lightness. */
export function customTokens(bg: string, accent: string): Record<string, string> {
  const light = luminance(bg) > 0.4;
  const [r, g, b] = light ? [20, 18, 14] : [238, 236, 222];
  const fg = `rgb(${r}, ${g}, ${b})`;
  return {
    '--bg': bg, '--bg-2': bg, '--bg-3': bg, '--bg-4': bg,
    '--fg': fg, '--fg-strong': light ? '#000000' : '#ffffff',
    '--fg-muted': `rgba(${r}, ${g}, ${b}, 0.74)`, '--fg-dim': `rgba(${r}, ${g}, ${b}, 0.6)`, '--fg-ghost': `rgba(${r}, ${g}, ${b}, 0.14)`,
    '--fg-rgb': `${r}, ${g}, ${b}`,
    '--ink-rgb': light ? '0, 0, 0' : '255, 255, 255',
    '--surface': light ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.35)',
    '--surface-2': light ? 'rgba(255, 255, 255, 0.55)' : 'rgba(0, 0, 0, 0.45)',
    '--glass': light ? 'rgba(255, 255, 255, 0.82)' : 'rgba(0, 0, 0, 0.6)',
    '--sunken': light ? 'rgba(0, 0, 0, 0.045)' : 'rgba(0, 0, 0, 0.25)',
    '--border': `rgba(${r}, ${g}, ${b}, 0.1)`, '--border-2': `rgba(${r}, ${g}, ${b}, 0.18)`,
    '--accent': accent, '--accent-dim': `${accent}2e`, '--accent-glow': `${accent}1a`, '--border-accent': `${accent}66`,
    '--on-accent': luminance(accent) > 0.45 ? '#000000' : '#ffffff',
    '--ok': light ? '#0b6b40' : '#34d399', '--warn': light ? '#804c00' : '#f5a524', '--info': light ? '#1d5fa8' : '#7cc4ff',
    '--danger': light ? '#b42318' : '#ff6b6b', '--violet': light ? '#4338ca' : '#a5b4fc',
    'color-scheme': light ? 'light' : 'dark',
  };
}

/** The preset a choice shows now (System asks the device). */
export function resolveTheme(choice: ThemeChoice, prefersLight: boolean): ThemeId | 'custom' {
  if (choice.id === 'system') return prefersLight ? 'paper' : 'default';
  return choice.id;
}

export const themeMode = (choice: ThemeChoice, prefersLight: boolean): 'light' | 'dark' => {
  if (choice.id === 'custom') return luminance(choice.bg) > 0.4 ? 'light' : 'dark';
  const id = resolveTheme(choice, prefersLight);
  return THEMES.find((t) => t.id === id)?.mode ?? 'dark';
};

// ── On the page ──────────────────────────────────────────────────

export const THEME_KEY = 'mc_theme';
export const THEME_VARS_KEY = 'mc_theme_vars';
export const THEME_EVENT = 'mc-theme-change';
const CUSTOM_PROPS = Object.keys(customTokens('#000000', '#ffffff'));

/** The choice kept on this device (the account's, as last seen here). */
export function readLocalTheme(): ThemeChoice {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (!raw) return DEFAULT_CHOICE;
    try { return toThemeChoice(JSON.parse(raw)); } catch { return toThemeChoice(raw); }
  } catch {
    return DEFAULT_CHOICE;
  }
}

export function writeLocalTheme(choice: ThemeChoice) {
  try {
    localStorage.setItem(THEME_KEY, JSON.stringify(choice));
    // Custom colours are worked out here once, so the early script can paint them.
    if (choice.id === 'custom') localStorage.setItem(THEME_VARS_KEY, JSON.stringify(customTokens(choice.bg, choice.accent)));
    else localStorage.removeItem(THEME_VARS_KEY);
  } catch { /* private mode */ }
}

export function applyTheme(choice: ThemeChoice) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches ?? false;
  for (const p of CUSTOM_PROPS) root.style.removeProperty(p);
  const id = resolveTheme(choice, prefersLight);
  root.dataset.theme = id;
  if (choice.id === 'custom') {
    for (const [k, v] of Object.entries(customTokens(choice.bg, choice.accent))) root.style.setProperty(k, v);
  }
  root.style.colorScheme = themeMode(choice, prefersLight);
}

/**
 * The same as readLocalTheme + applyTheme, as a script that runs before the
 * page paints (app/layout.tsx), so a light theme never flashes dark.
 */
export const EARLY_THEME_SCRIPT = `(function(){try{var r=localStorage.getItem('${THEME_KEY}');var c;try{c=JSON.parse(r)}catch(e){c=r}
if(typeof c==='string')c={id:({cyberpunk:'neon',obsidian:'mono'})[c]||c};if(!c||!c.id)return;var d=document.documentElement;
if(c.id==='custom'){var v=JSON.parse(localStorage.getItem('${THEME_VARS_KEY}')||'null');if(!v)return;d.dataset.theme='custom';for(var k in v)d.style.setProperty(k,v[k]);return;}
var id=c.id;if(id==='system')id=window.matchMedia('(prefers-color-scheme: light)').matches?'paper':'default';
d.dataset.theme=id;}catch(e){}})();`;
