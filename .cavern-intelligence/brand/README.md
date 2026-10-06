# Brand

**The Cavern** is the product; **Misfits Cavern** is the company that makes it.
Decisions and the plan: [`../restructure-proposal.md`](../restructure-proposal.md) › Decisions.

## The mark — chosen 2026-10-06: R13

Two Front Range mountains make the **M** — a pyramid like Mount Assiniboine
and a tilted slab like Mount Rundle (the brand was born in Alberta) — lit by
the crescent at the upper right, which is the **C**: Misfits Cavern's MC,
hidden in the landscape. The faces turned toward the moon are vanilla, the
faces turned away sinopia, snow on the summits.

`mark/` (rebuild the icons with `node scripts/brand-export.mjs`):

| File | Use |
|---|---|
| `the-cavern-mark.svg` | the mark — 48 px and up, the landing lockup, decks |
| `the-cavern-mark-small.svg` | the small cut (two tones, no snow detail, a larger crescent) — 16–48 px: favicon, tab, the island |
| `the-cavern-mark-mono.svg` | one colour (`currentColor`) — print, embossing, stamps |
| `export/apple-touch-icon.png` | iPhone home screen (180) |
| `export/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | the web app manifest |
| `export/favicon.svg`, `favicon-32.png`, `favicon-16.png` | browser tabs |

**In the app** (restructure phase 2): `components/brand/Mark.tsx` draws the
same polygons with the colours as theme tokens (vanilla → `--fg`, sinopia →
`--accent`), so the mark follows every theme — the nav and the page headers.
The landing hero is the mark in 3D (`components/brand/Mark3D.tsx`, geometry in
`lib/brand/mark3d.ts`): three.js, loaded after the page; the crescent is the
light, so faces toward it are vanilla and faces away sinopia, and the range
turns with the pointer (drag on a phone). The flat mark stands in until it's
drawn and wherever WebGL isn't available. `public/icon.svg`, `favicon-32.png`, `apple-touch-icon.png`,
`icon-192.png`, `icon-512.png` and `icon-maskable-512.png` are copies of
`export/`; re-copy them after `node scripts/brand-export.mjs` (and bump the
service worker's `CACHE` so installed apps pick them up).

The sheet: `concepts/final.png`. These are drawn from coordinates in code;
before investors see it, have a designer redraw the final in Illustrator from
this brief (curves, optical balance) — the shapes and colours stay.

- `concepts/` — the mark that replaces "MC". 64×64 or 120×120 SVGs in the
  house colours (night ink `#040710`, vanilla `#e0ddae`, sinopia `#e8431a`,
  slate `#336467`). Each round has a sheet (both themes, the iPhone icon,
  32/16 px, the landing lockup), rebuilt by
  `MC_LOCAL_CHROMIUM=<chrome path, optional> node scripts/brand-sheet.mjs`.
  - **Round one** (`sheet.png`): A `peaks` (the M), B `moon` (the C),
    C `moon-peaks`.
  - **Round two** (`rockies.png`), the owner's direction (A's peaks with a
    small moon in the distance; Rocky Mountain detail — the brand was born
    in Alberta): `peaks-moon`, `rockies-1-notch`, `rockies-2-rundle`,
    `rockies-3-woodcut`, `rockies-4-foothills`. Too narrow — they read as
    flames.
  - **Round three** (`rockies-3.png`): broad Front Range masses — a pyramid
    (Mount Assiniboine) and a tilted slab (Mount Rundle) make the M, lit
    from the upper left, slate shadows, snow, a small sinopia moon between
    them: `rockies-5-assiniboine-rundle`, `rockies-6-sinopia` (alpenglow),
    `rockies-7-strata`, `rockies-8-engraved` (one colour).
  - **Round four** (`rockies-4.png`), the owner's picks: R9
    `rockies-9-woodcut-foothills` (R1's peaks + A's moon placement + R3's
    woodcut shading + R4's foothills); and R6 (the owner's favourite —
    "pretty much there") with the moon where A had it, so the peaks read M
    and the crescent C — Misfits Cavern's old MC, hidden in the landscape:
    R10 `rockies-10-alpenglow-moon` (R6's tall tilted slab), R11
    `rockies-11-alpenglow-balanced` (equal summits, a gentler slab — the
    owner felt R6's weights fight the hidden letters), R12
    `rockies-12-alpenglow-mc` (a larger crescent low at the right, M · C).
  - **Round five** (`rockies-5.png`): the owner prefers R10's off-weight
    (the tall tilted slab) but felt the light was wrong — it was: R10 is lit
    from the upper left while its moon sits at the upper right. R13
    `rockies-13-moonlit` relights it from the moon (faces toward it vanilla,
    faces away sinopia); R14 `rockies-14-moonlit-mc` is R13 with the larger,
    lower crescent (M · C).
  - **Chosen: R13** (above).
- Voice: "Welcome back, misfit." stays.
- Landing: "THE CAVERN", "by Misfits Cavern" beneath.
