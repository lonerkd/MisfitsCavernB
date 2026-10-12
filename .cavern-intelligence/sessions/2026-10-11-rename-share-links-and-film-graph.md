# Session — 2026-10-06 → 10: the rename, share links, and the merge train

Merged: **#140** restructure phases 1–2 (The Cavern everywhere, the R13 mark
and icons, the interactive 3D landing hero — `components/brand/Mark3D.tsx`,
three.js loaded after the page); **#141** 3.3 script share links (the
`get_shared_script` RPC replaces the anon/signed-in `shared` read arms;
`scripts_share_guard`; `/s/[token]` server-rendered; editor Share control;
migration `20261006000000`, **applied to production**, 0 of 41 scripts had
been shared); **#142** the drift fingerprint ignores CRLF; **#137**
(another session) data access through `lib/` + lint, phone layout, one
permission model, share previews, emphasis, beat → script, one `jobs`
policy, iPhone launch screens and coaching, Web Push; **#144** (another
session) launch-grade repo practice (LICENSE, SECURITY, CHANGELOG, `adr/`,
conventional PR titles, coverage floors, secret scan, SBOM); **#143**
(another session) password recovery (`/auth` forgot mode, `/auth/reset`,
`lib/auth/recovery.ts`, e2e with the mail catcher). I started my own 3.4
before finding #143 and dropped it. After merging #137, coverage fell under
the #144 floors, so they were re-measured (owner's call) — BACKLOG 3.17.

**Then (#145, 3.2 done):** the auth callback's profile code moved to
`lib/supabase/profiles.ts` (unit-tested); the lint exception is gone, so
`supabase.from(...)` is banned in `app/` and `components/` with no exceptions.

**Then (restructure phase 4):** `components/` root split into `components/shell/` (the app shell: island, palette, bell, cursor, providers' mount…) and `components/ui/` (primitives); `lib/context` → `lib/os`; loose `lib/*.ts` into `lib/crafts`, `formats`, `themes`, `search`, `legal`, `onboarding`, `account`, `hooks`, `util`. Moves only (`git mv` + import codemod); no behaviour change.

**Then (restructure phase 5):** `app/(public)` (share pages `/s`, `/p`, `/shared`, legal) and `app/(suite)` (everything else, with the session/presence/island/tab-bar providers in its layout). The root layout keeps only fonts, theme, toasts and confirms; root `error`/`loading`/`not-found` carry their own `<main>`. No URL changes. Production migrations 20261007010000, 20261007020000 and 20261008010000 are applied (checked 2026-10-10: one `jobs` SELECT policy, `append_to_script`, `push_subscriptions` exist).

**Then (restructure phase 7, 1 of 6 — project hub):** `app/(suite)/projects/[id]/page.tsx` 1,226 → 452 lines; the department windows and previews are `components/projects/hub/DeptWindow.tsx`, the production manager `ProductionManager.tsx`, the view-model `types.ts`. Moves only. Left for phase 7: editor, Lounge, landing, jobs, press kit.

**Then (film graph, step 1 — days and places → daylight):** migration `20261010010000` (**apply to production after merge**): `shoot_days`, `scenes.location_id` / `shoot_day_id`, `call_sheets.shoot_day_id`, coordinates and time zone on locations, with triggers keeping them in step with the old columns. `lib/film/` (sun times computed locally, coordinates from pasted text or map links, the assembled day with light warnings and company-move distances). Locations: "I'm here now" / paste coordinates, light per shoot day. Stripboard: a date on each day, the light, warnings. Call sheet: the light, on screen and in print. Every script location now has a record from the start. Plan and rulings: `plans/2026-10-10-film-graph-1-days-and-places.md`. **Queued by the owner:** the island on phones, replacing the tab bar.

**Then (the design language, foundation):** [design-language.md](design-language.md). One interface face (Hanken Grotesk) through the existing tokens (`--mono` / `--display` / `--serif` now resolve to `--ui`), neutral text instead of cream (cream is the paper), sentence-case labels (`--caps` / `--caps-track`; 84 CSS rules and 209 inline styles moved onto them; the script's own capitals untouched), an 11px type floor on desktop too, new tokens for paper, the limit red and the stripboard colours. Terminal keeps monospace and caps. Next: the components (Sky, Paper, TimeBox, Stamp, Strip), the call sheet and schedule rebuilt on them, then the island on phones.

**Then (the design language, first screens):** `components/film/` — `Sky` (a day's sun path with the working day laid on it, hours past sunset in the limit colour; geometry in `lib/film/sky.ts`, tested), `Paper`, `TimeBox`, `Stamp`. The call sheet and the stripboard are rebuilt on them: a sky per day, ruled Call / Shoot / Wrap boxes (Wrap filled red when it breaks the light), stamps for state, strips in a paper board's colours, black strips for company moves. Copy shortened ("Send to crew", "1 h 28 past sunset · 2 exteriors"); e2e updated to the new words. Next: the island on phones, then the rest of the suite.

**Then (the island on a phone):** one pill at the foot replaces the five-tab bar — project and page and an unread count, with Capture beside it. It opens the Everything sheet (Today / Projects / Lounge first, then the page's controls, search, tools, projects). Behaviour kept: hidden on the editor/auth/public pages, away while typing, share-to-capture, the outbox count. Next: live activities in the pill, then the rest of the suite on the language.

**Then (suite-wide pass 1, the shared pieces):** every Studio page header lost its eyebrow and description; the "New here" banner is one line; hub tiles show a name and an icon (blurb as a tooltip); empty states are an icon, a title and one short line; ~25 empty-state lines rewritten. The remaining passes are listed in design-language.md.

**Then (pass 2, the board and the hub):** the board lost its phase strip and empty-column boxes; the hub lost its stepper and eyebrow;
the logline is a line of text; only the next milestone explains itself; Tailwind's `font-mono` and `uppercase` utilities and the files directly
under `app/` now follow the tokens; about 360 spots of tracked spacing on non-capital text went through `--caps-track`.
**Owner direction:** the top bar is folded into the island, one island on desk and phone with offline and on-set modes, and no duplicated
information. Recorded in design-language.md; it is next.

**Then (film graph, step 2 — people in scenes, #164):** migration `20261011010000` — `characters`, `scene_characters`, `character_castings.character_id`, and triggers keeping them in step with `cast_list` / `character_name`. **Applied to production by paste on 2026-10-11** (the connector's `apply_migration` hung). Verified: tables, column, 3 triggers, RLS, backfill (15 characters, 27 links); Production schema drift passed. Pasted migrations leave no row in `supabase_migrations.schema_migrations`.

**Then (film graph step 2 — sides):** each day's call sheet has a **Sides** button: one printed page per called actor who speaks that day (their scenes in shooting order, own cue and speeches highlighted). Pure `lib/film/sides.ts` + `sides-print.ts`, unit-tested (8 tests); no schema change. Not yet: the app still reads `cast_list` text, not `scene_characters`; `call_sheet_calls.character_id`; e2e for the Sides button (needs the local stack). Next: step 3 (story time → continuity).

**Then (film graph step 3 — story time and continuity):** migration `20261012010000` (**apply to production after merge**, by paste): `scenes.story_day/story_time/story_confirmed`, `scene_states`. `lib/film/story.ts` (reads the story day from headings), `continuity.ts` (look changes inside a day), Production › **Continuity**. Verified: persona test (6), full integration suite (341), drift clean, e2e `continuity.spec.ts` + neighbours (daylight, call sheets, studio journey) against a local stack. Not yet: look photos/wardrobe elements on a state, a continuity PDF for wardrobe/make-up, shoot-order beside story-order, the warning on the call sheet. **Owner direction (2026-10-11):** the editor will eventually be cut over to the graph — plan: finish steps 3–4, thin the editor page (restructure 7), cut over behind e2e (co-writing, offline), then drop the text columns (step 7). Also: the coverage floors are 50/50/52/50 and hold (52/53/54/52) — 3.17 is done.

Lessons: the Supabase connector's writes time out from the cloud (read works);
check production after a timed-out write before retrying. The 3D hero loaded
later and exposed a faded tagline failing axe contrast — fixed. Parallel
sessions edited the same files (`app/auth/page.tsx`, STATE/BACKLOG,
generated files): merge `main` in, regenerate generated files with
`npm run sync-intel` / `npm run bible` rather than hand-editing, and re-run
typecheck, lint, tests and `test:coverage` before pushing.

