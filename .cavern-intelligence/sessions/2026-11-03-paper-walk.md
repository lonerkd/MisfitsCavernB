# Session — 2026-11-03: walking the whole suite in Paper

Paper is the default now, so every screen has to read in it. All 48 screens were photographed (desktop and phone) on the demo world and looked at, and a new tool, **`npm run theme:scan`** (`scripts/theme-scan.mjs`), measured the text on 29 routes against what is really behind it (stacked translucent backgrounds included), desktop and phone, flagging anything under 3:1. Fixed, all hard-coded colours that were only ever right on dark: the **Jobs** role pills and hourly rates (pale cyan/amber/green text on cream: now `readable(color)`), the **admin** user role badge and audit-log links (`#0099ff`: now `var(--info)`), the **editor's** goal badges, sprint control and per-scene read times and the **crew page's** "In your portfolio" (`#5fd99a`: now `var(--ok)`), and the **portfolio card's** title and role/year over its video frame (dark ink on black: light in every theme, because the frame is dark in every theme). Paper, Cavern, Slate, Editorial and Lagoon now scan clean on all 29 routes.

**Also fixed on the way:** `npm run bible:shots` had been broken since the places migration (the demo world inserted a place a scene's link had already created, and a document pointed at a place by a fixed id); `scripts/demo/build.ts` now fills the existing record in and looks a document's place up by name. The photographs themselves are not committed (they are 2.9 MB of binaries last retaken in #239): `bible/screens` is still the dark-era snapshot.

**Not covered (BACKLOG 3.35):** what opens on a click (modals, menus, toasts, empty and error states), the other dark presets, and retaking `bible/screens`.

**Verified:** the scan on five themes, desktop and phone for Paper; typecheck, lint; the full unit suite. No migration.
