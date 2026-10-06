# 11 · Rulesets

The rules the whole suite obeys: who can do what, how a project grows, how
it looks, and how the code is written. Where a rule is enforced matters more
than where it's written, so each says where.

## Who can do what (enforced by the database)

Project roles: the **owner** is `projects.creator_id`; crew rows carry a
permission `role` — `lead`, `contributor`, `viewer` — and a `craft` (what
they do). "Shapers" are owner + confirmed lead/contributor
(`internal.can_shape_project`). A **private** project hides from crew; only
the owner sees it.

| Action | Owner (Sam) | Lead | Contributor (Jordan) | Viewer | Outsider (Riley) | Anon |
|---|---|---|---|---|---|---|
| See the project and its work | ✓ | ✓ | ✓ | ✓ | — | — |
| Write the script, add to the library, notes, shots | ✓ | ✓ | ✓ | read | — | — |
| Brief, tasks, budget, money, paperwork, call sheets, availability | ✓ | ✓ | ✓ | read¹ | — | — |
| Issue a call sheet | ✓ | ✓ | ✓ | — | — | — |
| Delete others' library items, publish, set visibility | ✓ | — | — | — | — | — |
| Edit project settings, phase, archive, crew list, festivals | ✓ | — | — | — | — | — |
| Delete / transfer the project | ✓ | — | — | — | — | — |
| Post a job for the project | ✓ | ✓ | ✓ | — | — | — |
| Respond to applicants | the poster | | | | | |
| Lounge channel | by audience (§6) | | | | | |
| Shared links (`/shared`, `/m`, `/p`) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

¹ Money and paperwork are shapers only; a person reads paperwork that names
them. Timesheets: everyone their own; shapers approve.

Platform: **admin** (`profiles.is_admin`) reads errors, audit log, users and
analytics; runs community channels; edits the catalogues. **Sample** data
is hidden from every public surface.

Proved by the persona tests in `tests/integration/` on every PR. A leak to
Riley is P0.

**The client side.** The UI hides what the database would refuse using
`isOwner` and `useCanShape` (`lib/brief`). `lib/os/permissions.ts` and
`lib/os/access-matrix.ts` describe an older global-role model
(`admin` / `project_creator` / `crew_member` / `guest`; every non-admin is a
`project_creator`) that no page reads (`usePermission`, `usePageAccess`,
`useActionAccess`, `useProjectAccess` have no callers). `conventions.md` §5 still points at it.
Restructure: delete it, or rebuild it to mirror the table above (3.10).

## How a project grows (phase gating)

Five phases: **Development → Pre-production → Production →
Post-production → Delivery** (`lib/os/phases.ts`). A format
(`project_formats`, data) renames phases ("Shoot"), skips middle phases and
milestones — never the first or last.

| Phase | Milestones (read from the data) | Tools that open |
|---|---|---|
| Development | logline · start the script · build a character · three beats · five references | script editor, library & boards, beat board, pitch deck, soundtrack, share page |
| Pre-production | crew · cast a role · plan shots · set a budget · date the first shoot day | scenes & shot lists, breakdown & readiness, revisions, schedule & call sheets, cast & crew, budget, jobs |
| Production | wrap the first scene · wrap every scene · clear the task list | on set |
| Post-production | first cut · review with notes · resolve every note · finish the pipeline | cut review & delivery |
| Delivery | deliver everything · share it · submit to a festival · add to portfolio | promos & campaigns, festivals, portfolio |

- A tool also opens **early** once its work exists (scenes once a heading is
  written, schedule once there's a call sheet, post once there's a cut).
- The owner can **open every tool** (project setting); a person can
  **show every tool** everywhere (account setting).
- When a phase's milestones are done the suite **suggests** the next phase;
  the owner moves it (or waves it off). Nothing is ticked by hand.

## Design rules (`design-tokens.md`, enforced in CI)

- Colours are CSS tokens (`--bg`, `--fg`, `--accent`…); themes redefine them.
  The house theme: night ink `#040710`, vanilla `#e0ddae`, sinopia
  `#e8431a`, Caribbean `#336467`.
- Text never below 4.5:1 (`--fg-dim` is the floor); `e2e/accessibility`
  and `e2e/themes` check every page and theme (WCAG 2.2 AA).
- Font sizes, spacing and radii from scales (lint-enforced); type: display
  (Bebas-style caps), mono for labels, serif for prose.
- Motion respects reduced motion; touch targets ≥ 44px on coarse pointers;
  fields 16px on phones (no iOS zoom); no sideways scroll.
- Feedback only by toast, confirmation only by the confirm dialog.

## Code rules (`conventions.md`, `CLAW.md`)

- **No mocks**: every control persists to real data; anything cosmetic is
  removed.
- **Verify, don't claim**: types, lint, build, tests before saying done.
- **Security floor**: RLS on every table from birth; `internal.*` helpers;
  `auth.uid()` in a scalar subquery; one SELECT policy per table; FKs
  indexed; new definer functions added to the §2.D allowlist.
- **Migrations** are the only way the schema changes; never edited after
  merge; applied to production by hand, then the drift check.
- **Data access** through `lib/` (partly done — §10).
- **React**: compiler lint rules as errors; effects depend on what they use
  (`useEffectEvent` for callbacks); no `alert`/`confirm`.
- **Git**: feature work on `claude/*` branches, squash-merged; `main` is
  never pushed to directly; docs in `.cavern-intelligence` change in the same
  PR as the code.
