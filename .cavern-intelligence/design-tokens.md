# Design Tokens — Misfits Cavern

Source of truth: `tailwind.config.js` (Tailwind classes) + `app/globals.css` (CSS custom properties + component classes).

## Color Palette

### Surface Hierarchy (deep ink-blue base)
| Token | HEX | Usage |
|---|---|---|
| `--bg` | `#040710` | Page background |
| `--bg-2` | `#050a14` | Card / elevated surface |
| `--bg-3` | `#070d18` | Hovered surface |
| `--bg-4` | `#0a131e` | Active surface |
| `--glass` | `rgba(4,7,13,0.78)` | Glass morphism panels |

### Foreground (Vanilla)
| Token | Color | Opacity |
|---|---|---|
| `--fg` | `#e0ddae` | 1.0 |
| `--fg-muted` | `#e0ddae` | 0.72 |
| `--fg-dim` | `#e0ddae` | 0.58 (≥4.5:1 on every surface — WCAG AA; never go lower for text) |
| `--fg-ghost` | `#e0ddae` | 0.12 |

### Accent (Sinopia)
| Token | Color | Opacity |
|---|---|---|
| `--accent` | `#e8431a` | 1.0 |
| `--accent-dim` | `#e8431a` | 0.18 |
| `--accent-glow` | `#e8431a` | 0.10 |

### Secondary (Caribbean)
| Token | Color | Opacity |
|---|---|---|
| `--secondary` | `#336467` | 1.0 |
| `--secondary-dim` | `#336467` | 0.25 |

### Borders
| Token | Color | Opacity |
|---|---|---|
| `--border` | `#e0ddae` | 0.07 |
| `--border-2` | `#e0ddae` | 0.12 |
| `--border-accent` | `#e8431a` | 0.32 |

### Module Accent Colors
| Module | Color |
|---|---|
| ScriptOS | `#e8431a` |
| Studio | `#6366f1` |
| Lounge | `#10b981` |
| Portfolio | `#f59e0b` |
| Jobs | `#8b5cf6` |

### Tailwind Classes
```js
cavern-bg:      '#080808'     // legacy — prefer CSS var --bg
cavern-fg:      '#f0ece4'     // legacy — prefer CSS var --fg  
cavern-accent:  '#ff3c00'     // legacy — prefer CSS var --accent
cavern-muted:   'rgba(255,255,255,0.2)'
cavern-border:  'rgba(255,255,255,0.04)'
```

## Typography

| Role | Font Stack | CSS Var | Usage |
|---|---|---|---|
| Display | `Bebas Neue, sans-serif` | `--display` | h1–h6, `.mc-title`, headings, nav |
| Mono | `DM Mono, monospace` | `--mono` | Body text, buttons, inputs, `.mc-text`, badges |
| Serif | `Cormorant Garamond, serif` | `--serif` | Paragraphs (`p` tags), long-form text |

### Font Sizes
```css
h1 { font-size: clamp(3.5rem, 14vw, 11rem); }
h2 { font-size: clamp(2rem, 6vw, 3.5rem); }
h3 { font-size: clamp(1.2rem, 3vw, 2rem); }
```

## Scales (enforced by lint)

Defined in `app/globals.css`. See `docs/DESIGN_DIRECTION_2026-09.md`.

- **Type:** `--text-2xs` 11 (floor, uppercase labels) · `xs` 12 · `sm` 13 · `base` 14 · `md` 16 · `lg` 20 · `xl` 24 · `2xl` 32. Literal `fontSize` under 11 fails lint.
- **Script face:** `--script` (Courier Prime) for screenplay surfaces only.
- **Radii:** 4 · 8 · 14 · 20 · 28 · 9999. Others fail lint.
- **Containers:** `--w-form` 480 · `--w-reading` 720 · `--w-content` 1160.
- **Space:** `--s-1`..`--s-8` (4px base). **Imagery:** `--ar-scope` 2.39:1, `--ar-film` 16:9, `--ar-still` 3:2, `--ar-poster` 2:3; text over stills goes on `--scrim`.
- `--secondary` (#336467) is 3.0:1 on `--bg`: fills and borders only, never text.

## Component Classes

### Buttons
| Class | Style | Radius | Hover |
|---|---|---|---|
| `.btn-primary` | Accent bg, mono, uppercase, 10px, letter-spacing 3px | `--r-full` (9999px) | TranslateY(-2px) scale(1.02), accent box-shadow |
| `.btn-ghost` | Transparent bg, border 0.12, mono, uppercase, 10px | `--r-full` (9999px) | Border brightens, bg lightens |
| `.cta-btn` | Transparent bg, border, mono, uppercase, 10px, letter-spacing 4px | `--r-xs` (4px) | Accent bg, white text |
| `.link-btn` | Transparent bg, border, mono, 9px, uppercase | `--r-xs` (4px) | Accent border, accent text |

### Cards
| Class | Style | Radius | Hover |
|---|---|---|---|
| `.card` | bg-2, border, padding 28px 24px | `--r-sm` (8px) | Accent border, elevated shadow, translateY(-4px) |
| `.module-tile` | bg-2, border, overflow hidden | `--r-md` (14px) | Border brightens, translateY(-3px) |

### Form Inputs
| Class | Style | Radius | Focus |
|---|---|---|---|
| `.input-field` | Transparent bg, border, mono, 12px, padding 14px 16px | `--r-sm` (8px) | Accent border, focus ring 3px |

### Glass Surfaces
| Class | Background | Blur | Border |
|---|---|---|---|
| `.glass` | `--glass` | blur(20px) saturate(1.4) | `--border-2` |
| `.glass-sm` | `rgba(7,13,20,0.8)` | blur(12px) | `--border` |
| `.glass-heavy` | `rgba(4,7,13,0.92)` | blur(32px) saturate(1.6) | `rgba(224,221,174,0.06)` |

### Badges
`.badge` — mono, uppercase, 9px, letter-spacing 2px, border currentColor, `--r-xs`

## Border Radii
| Token | Value |
|---|---|
| `--r-xs` | 4px |
| `--r-sm` | 8px |
| `--r-md` | 14px |
| `--r-lg` | 20px |
| `--r-xl` | 28px |
| `--r-full` | 9999px |

## Motion

### Easing Curves
```css
--ease-expo:   cubic-bezier(0.16, 1, 0.3, 1);    /* dramatic entrances */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* playful bounces */
--ease-out:    cubic-bezier(0.0, 0, 0.2, 1);      /* standard exits */
```

### Animations
| Name | Duration | Timing | Purpose |
|---|---|---|---|
| `slide-up` | 1s | ease-out | Element enters from below |
| `fade-in` | 0.5s | ease-out | Element fades in |
| `grain` | 0.5s | steps(6) infinite | Film grain noise overlay |
| `marquee` | 30–40s | linear infinite | Horizontal scrolling ticker |
| `pulse` | 2.5s | ease-in-out infinite | Online indicator dot |
| `shimmer` | 1.4s | ease infinite | Loading skeleton |
| `travel` | 3.5s | ease-in-out infinite | Pipeline connector track |
| `orb-breathe` | — | — | Ambient gradient orbs |
| `float-y` | — | — | Subtle vertical float |

## Layout Constants

- Container max-width: 1160px, padding: 0 18px
- Section padding: 90px 18px
- `.mc-page`: min-height 100vh, bg `--bg`, fg `--fg`
- `.grain-overlay`: fixed inset, z-index 9998, pointer-events none, opacity 0.022
- `.film-chrome`: 18px corner brackets, 1.5px fg border, opacity 0.35 → 0.7 on hover
- `.pipeline-track`: 1px height, flex-1, accent gradient traveling line
- `.marquee-wrap`: overflow hidden, masked gradient edges
- Responsive breakpoints: 1100px (3-col masonry), 860px (collapse), 760px (lounge), 640px (studio tabs), 560px (taskbar), 460px (1-col masonry)

## Themes

Settings › Appearance (`components/ThemePicker.tsx`) picks the look of the
whole suite. Presets live in `lib/themes.ts` (`THEMES`) and as CSS token
blocks on `[data-theme="<id>"]` in `app/globals.css`:

| Theme | Mode | Look |
|---|---|---|
| `default` (Cavern) | dark | near-black, cream text, ember accent |
| `terminal` | dark | green phosphor, mono type |
| `blueprint` | dark | drafting blue, sky accent, grid |
| `mono` | dark | black and white |
| `paper` | light | warm off-white, ink text, rust accent |
| `editorial` | light | white, black type, red accent, serif display |
| `glass` | dark | frosted gradients, periwinkle accent |
| `neon` | dark | violet night, magenta accent |
| `slate` | dark | cool slate, soft blue accent |
| `lagoon` | light | pale teal, teal accent |
| `forest` | dark | deep green, sage accent |
| `vampire` | dark | black, blood red accent |

Plus **System** (Paper when the device is light, Cavern when dark) and
**Custom** (a background + an accent; `customTokens()` derives readable text,
lines and status colours from the background's luminance).

- The choice is saved to the account (`profiles.ui_prefs.theme`, validated by
  `set_my_ui_prefs`) and copied to the device (`localStorage.mc_theme`, plus
  `mc_theme_vars` for Custom). An inline script in `<head>` paints the device
  copy before first paint; `ThemeInitializer` then applies the account's.
- Public pages (`/p`, `/s`, `/shared`) set `data-theme="default"` on their
  root — a shared page always looks the way its maker designed it.
- **Never hard-code** white/black/cream in UI. Use the tokens every theme sets:
  `--fg`, `--fg-strong`, `--fg-muted`, `--fg-dim`; `rgba(var(--fg-rgb), a)`
  for text-coloured tints; `rgba(var(--ink-rgb), a)` for hairlines and
  overlays; `--surface`/`--surface-2`/`--glass` for panels; `--sunken` for
  recessed wells; `--bg-2…4` for solid fills; `--on-accent` for text on an
  accent fill; `--ok`/`--warn`/`--info`/`--danger`/`--violet` for status.
- Colours from data (project accents, crafts, scene types) go through
  `readable()` for text — it returns a `light-dark()` pair, darkened for the
  light themes and lightened for the dark ones. Keep the raw hex for tints
  (`${hex}22`).
- `lib/themes.test.ts` checks every preset's block: tokens present, text ≥ 7:1
  on the background, accent ≥ 3:1, `--on-accent` ≥ 4.5:1 on the accent.
  `e2e/themes.spec.ts` checks it applies, persists, follows the account, and
  passes axe colour-contrast in Paper.


## Accessibility (WCAG 2.2 AA — enforced in CI)

`e2e/accessibility.spec.ts` runs axe-core (WCAG 2.0/2.1/2.2 A + AA) on every
route — signed out, signed in, admin, mobile — against a local stack in the CI
`database` job. Any violation fails the build.

- **Text colour**: never below 4.5:1. Use `--fg`, `--fg-muted` (0.72) or
  `--fg-dim` (0.58) — never `opacity` on text, never `rgba(…, 0.3)` text.
  Accents used as text go through `readable()` (`lib/color.ts`, theme-aware);
  labels on a filled accent use `var(--on-accent)` or `textOn(hex)`.
- **Accent** is `#e8431a` (5:1 as text and behind dark text). Studio indigo:
  `--studio` `#4f46e5` for fills, `--studio-text` `#818cf8` for text.
- **Names**: every icon-only button/link gets `aria-label`; every input/select
  a label (`Input` wires `<label htmlFor>`, errors via `aria-describedby`).
- **Structure**: the root layout owns the single `<main id="main-content">`
  and the skip link — pages use `<div>`, never `<main>`. Each page has one
  `<h1>` (visually hidden with `.sr-only` when the design has no title).
- **Targets**: interactive controls ≥ 24×24px.
- Focus is always visible (`:focus-visible` ring in `globals.css`).
