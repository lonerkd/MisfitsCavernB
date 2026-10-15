# 2026-10-14 The playbook

The owner's call: the intelligence layer should be aimed at **agents** — how
to consume this system fastest and compound learning over time — not at
people. The plain-language owner guide from the previous commit was the wrong
audience and is reverted here.

**What changed:** `.cavern-intelligence/PLAYBOOK.md` — the fast start (STATE
Resume here → latest 3 sessions → BACKLOG), search-first (bible inventory,
tests as executable documentation, ADRs before designing), the skip list
(never read the generated mirrors; sessions beyond 3 are archaeology), the
learning loop (five things every PR owes the system, and where a lesson
lives: note / RULES / playbook / ADR), and a pitfalls list seeded with seven
verified ones (production lags main, connector write timeouts, generated
entry files, the 1.5 s save debounce, the webpack build flag, four CI gates,
cloud Docker). `RULES.md` "Start of every session" gains the pointer (step 5);
`INDEX.md` "Who reads what" gains the agents row. **Reverted:** OWNER.md and
its session note (wrong audience — never merged, never on `main`).

**Verified:** `npm run sync-intel` regenerated the entry files from the
touched RULES.md; `--check` passes. No code touched, so typecheck/lint/test
were not relevant.

**Next:** the owner should confirm the pitfalls list reads true from their
side (especially the migration-by-hand one); anything missing, add a line.
