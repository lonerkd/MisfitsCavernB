# Design Direction: Typography, Layout, Imagery (2026-09)

Maturity level L0 (no `DESIGN.md`, no design system package). The hand-written
`.cavern-intelligence/design-tokens.md` is the constraint. Method: evidence audit
of `app/` and `components/` (132 `.tsx` files), then direction, then a token layer.
No user research was possible, so findings are heuristic and code-derived, not
observed behaviour. Counts come from grep and are approximate.

**Theme statement:** *Warm, nocturnal, cinematic slate.* A title card (Bebas), a
clapper-board label (DM Mono) and a script page (Courier Prime), all on ink-blue.

## What holds up (keep)

- Palette. Contrast measured, not assumed: `--fg-dim` is 5.2:1, `--fg-muted` 7.6:1,
  accent 5.0:1 on `--bg`. The token doc's claims are true.
- The three-voice type identity: Bebas for titles, DM Mono for UI, Cormorant for prose.
- Grain, film-chrome corners and the ink-blue surface stack.

## Findings

| # | Area | Finding | Evidence |
|---|---|---|---|
| 1 | Type | No scale in use. Inline sizes drift between 7px and 14px in half-steps. | About 515 uses of 7 to 11px text, including 7, 7.5, 8, 8.5 and 9. Sizes 8 and 9 alone appear 230 times. |
| 2 | Type | Axe enforces contrast, not size, so CI stays green while text is unreadable. | `e2e/accessibility.spec.ts` |
| 3 | Type | The screenplay face was never loaded. Script, editor and share views fell back to system Courier. | 13 references to Courier Prime, no font import. |
| 4 | Type | `--sans` was referenced but never defined. | `pitch/page.tsx`, `CutNoteMarkers.tsx` |
| 5 | Layout | Ten different container widths. | maxWidth 320, 480, 500, 520, 640, 720, 900, 1100, 1160, 1200 |
| 6 | Layout | Radii outside the token scale. | 6, 10, 12, 16 and 99 in about 190 places, against a 4/8/14/20/28/full scale. |
| 7 | Layout | Spacing is raw pixel literals, so density cannot be tuned. | Inline `padding` and `gap` throughout. |
| 8 | Imagery | Suite has no art direction. All images are user or third-party, with no aspect or overlay rules. | 18 raw `<img>`, 3 files on `next/image`. |
| 9 | Imagery | Empty states use icons at 25% opacity, which reads as disabled rather than designed. | `components/EmptyState.tsx` |
| 10 | Colour | Secondary `#336467` is 3.0:1 on `--bg`. Fine for fills, fails as text. | Measured. |
| 11 | Colour | 578 hex literals in components. `#10b981`, `#e8431a`, `#f59e0b` repeat as module colours rather than tokens. | grep |

Alt text is healthy: one `<img>` without `alt`. Raw `<img>` with `referrerPolicy`
is deliberate for third-party thumbnails.

## Direction

### Typography
- Keep Bebas Neue, DM Mono and Cormorant Garamond. Add Courier Prime for script.
- Scale (1.2 ratio, 14px UI base): `--text-2xs` 11, `xs` 12, `sm` 13, `base` 14,
  `md` 16, `lg` 20, `xl` 24, `2xl` 32.
- **Floor: 11px, uppercase tracked labels only.** Body and data text 12px or more.
  Retire 7 to 9px entirely. Fold 7, 7.5, 8, 8.5, 9, 9.5, 10 to 11; 11 and 11.5 to
  11 or 12; 13 stays.
- Screenplay surfaces (editor, preview, share page, cut-script) use `--script`
  at 12pt-equivalent. Nothing else uses Courier.
- Line height: body 1.5, mono UI 1.4, headings 1.1. Tracking: labels +1 to 2px,
  Bebas display 0 to +1px.

### Layout
- Three container widths: `--w-form` 480, `--w-reading` 720, `--w-content` 1160.
  Map 320 to 520 to form, 640 to 900 to reading, 1100 to 1200 to content.
- Radii: 4, 8, 14, full only. Map 6 to 8, 10 and 12 to 8 or 14, 16 to 14, 99 to full.
  Keep 20 and 28 for hero panels.
- Space on a 4px base (`--s-1` to `--s-8`). New code uses tokens, not literals.

### Imagery
- Two crop ratios do the work: `--ar-scope` 2.39:1 for hero and banner stills,
  `--ar-film` 16:9 for everything else. Posters use `--ar-poster` 2:3.
- Any text over a still goes on `--scrim`. Never on the raw image.
- Treatment: existing grain overlay plus film-chrome corners on hero stills only.
- Empty states: draw a small line-art set (clapper, reel, script page, slate)
  in `--fg-dim` at full opacity, not faded icons. Image brief only, nothing
  generated here.
- Above-the-fold stills move to `next/image`; thumbnails stay raw.

## Shipped in this pass (additive, no visual change)

- `Courier_Prime` loaded through `next/font` and exposed as `--script`. Editor,
  preview, share page and studio cut-script now use it.
- `--sans` defined (aliases `--mono`).
- Tokens added to `app/globals.css`: type scale, container widths, spacing,
  aspect ratios, `--scrim`.
- `tsc` and `next build` pass.

## Shipped in the migration pass

- **Text floor:** every literal `fontSize` below 11 in TSX (498 sites) and CSS
  modules (141) is now 11 or more. 11.5 became 12 and 12.5 became 13.
- **Radii:** 213 TSX and 67 CSS values snapped to the 4/8/14/20/28/full scale.
- **Widths:** 43 `maxWidth` values now use `--w-form`, `--w-reading` or `--w-content`.
  Widths 320, 900 and other one-offs were left alone on purpose.
- **Lint:** `.eslintrc.json` now errors on a literal `fontSize` under 11 and on
  off-scale `borderRadius`. Lint, `tsc`, 276 unit tests and the build pass.
- **Secondary teal:** checked. It is never used as text colour, so finding 10
  needs no fix beyond a note in the token doc.

## Still open

1. Visual pass on dense views (breakdown, stripboard, schedule, taskbar). Text
   there grew up to 4px and may wrap or overflow. Not checked in a browser.
2. Conditional sizes such as `big ? 14 : 10` in `PitchDeck.tsx` are untouched.
   They are slide-thumbnail scaling, which is intentional.
3. 578 hex literals still bypass module tokens. Repeats like `#10b981` mean
   both the Lounge colour and generic success green, so they need a per-site call.
4. Empty-state line-art set (clapper, reel, script page, slate). Brief only.
5. Above-the-fold stills to `next/image`.

## Falsification notes

- The 515 count includes a few non-text uses of small numbers, so treat it as
  "hundreds", not exact.
- Migration to an 11px floor will enlarge dense views (breakdown, schedule,
  taskbar). Those need a layout pass, not a find-and-replace.
- No real users were observed. Density complaints or wins are hypotheses until
  someone tests the Studio and Editor at the new sizes.
