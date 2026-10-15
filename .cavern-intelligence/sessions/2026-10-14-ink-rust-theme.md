# 2026-10-14 Ink & Rust theme

The owner accepted the July archive branch's ink-blue/pale-gold/rust palette
— but as a **theme that fits the suite**, not a hardcoded rebrand (the archive
commit swept literal colors across every file; that way lies drift).

**What changed:** a new preset `inkrust` (Ink & Rust), second in the catalogue
next to the house look — `lib/themes/themes.ts` (`ThemeId`, `THEMES`),
its token block `[data-theme="inkrust"]` in `app/globals.css`, and the theme
table in `design-tokens.md`. Values are the archive's: ink-blue `#040710`
night (the house bg family), pale-gold `#e0ddae` text, muted rust `#d7340b`
accent, teal `#336467` secondary. The picker needed nothing — it maps
`THEMES`.

**Verified:** `npx vitest run lib/themes` — 50 tests, all pass: the swatch
matches the block, text 14.5:1, accent 4.2:1, on-accent 4.8:1, dim text
flattens ≥ 5:1 on every surface. Full gates on this branch: `npm run test`
**121 files / 1010 tests passed** (1 skipped), `npm run typecheck` clean,
`npm run lint` clean. **Not run here:** `npm run build` and
`e2e/themes.spec.ts` (need a built app + the local stack) — left to CI's
gates on the PR.

**Design note:** no script/studio/jobs ambient tokens — the house look owns
those; Ink & Rust inherits the defaults, so it stays a skin, not a fork.

---

**Update (owner, same day):** the catalogue now follows the owner's order of
importance — Cavern, Paper, Vampire, Blueprint, Terminal, Editorial, then
the rest (Ink & Rust seventh, then the previous relative order). The picker
follows `THEMES`; `design-tokens.md`'s table follows the catalogue. Nothing
depends on order — no test asserts it, and `resolveTheme`/`applyTheme` look
themes up by id.
