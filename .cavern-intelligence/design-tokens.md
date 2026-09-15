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
| `--fg-muted` | `#e0ddae` | 0.55 |
| `--fg-dim` | `#e0ddae` | 0.30 |
| `--fg-ghost` | `#e0ddae` | 0.12 |

### Accent (Sinopia)
| Token | Color | Opacity |
|---|---|---|
| `--accent` | `#d7340b` | 1.0 |
| `--accent-dim` | `#d7340b` | 0.18 |
| `--accent-glow` | `#d7340b` | 0.10 |

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
| `--border-accent` | `#d7340b` | 0.32 |

### Module Accent Colors
| Module | Color |
|---|---|
| ScriptOS | `#d7340b` |
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

Alternative themes applied via `body.theme-*`:
| Theme | Key Color Shift |
|---|---|
| `theme-cyberpunk` | Pink fg, cyan accent |
| `theme-forest` | Warm cream fg, teal accent |
| `theme-obsidian` | White fg, white accent (monochrome) |
| `theme-vampire` | Warm cream fg, deep red accent |

Each theme overrides `--bg`, `--fg`, `--accent`, `--border`, and module accent colors.
