# 2026-10-14 The owner's guide

The intelligence folder had no layer for the owner — every doc assumed
engineering fluency, and the owner works in vision, not code.

**What changed:** `.cavern-intelligence/OWNER.md` — the system explained in
plain language: what each document *is* (handbook, handover, to-do list,
diary, encyclopedia, decision ledger), a glossary of the words agents use
(PR, CI green, migration, ADR, RLS, personas, squash merge), what agents
will ask the owner and how to answer, the three questions to ask any agent,
what only the owner can do (the dashboards), and where to look when.
`INDEX.md` "Who reads what" gains the owner's row.

**What it is not:** a new rules layer — it explicitly defers to `RULES.md`
and changes nothing agents do. No code touched, so no typecheck/lint/test
was relevant; `sync-intel --check` passes (no entry-file drift).

**Next:** the owner should read it once, end to end (~5 minutes), and say
whether the glossary words match the ones they actually get asked about.
