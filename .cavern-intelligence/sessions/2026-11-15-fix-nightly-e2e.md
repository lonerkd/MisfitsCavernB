# 2026-11-15 — fix the nightly e2e (red on 11-14 and 11-15)

Branch `claude/fix-nightly-e2e`. Docker was not available, so the specs were not run locally; each locator was reasoned from the component code.

## What failed and why

- `e2e/records-links.spec.ts` (3 tests): `getByRole('button', { name: /^(add|log|schedule)/i })` matched the "Your tools" row's **Schedule** chip as well as the form's Log / Add button (the role-model work added that row above every tool). Now `/^(add|log)$/i`. `getByLabel('Shot')` is `exact: true` so it cannot match another label that merely contains "shot".
- `e2e/editor-find-cast.spec.ts` (casting): `getByRole('combobox')` matched two selects. The Character Bible's cast select now has `aria-label="Cast as"` (its `<label>` was not associated) and the spec asks for it by name.
- **A real bug behind the casting and cue-card specs** (#545, "character_id as primary key"): `getCastingsForProject` keyed the map by `character_id` and dropped rows without one, but every reader (the editor's cue card and Character Bible, the casting board) looks a character up by its upper-cased name, so "Playing: …" and the cue card's "played by" never showed. `setCasting` also upserted with `onConflict: 'project_id,character_id'`, and the table's unique constraint is `(project_id, character_name)`, so casting from the UI would have failed on production. Fixed: the map is keyed by upper-cased name, the upsert conflicts on `project_id,character_name`, `removeCasting` deletes by name, and the hook drops the right key. `useScriptCasting.test.tsx` follows.
- `e2e/editor-gutter.spec.ts:84` (cue card) failed both nights with "element not found": same cause (the seeded casting was dropped by the id-keyed map).

## Not verified

The specs need the local stack; the nightly run dispatched on this branch is the check.
