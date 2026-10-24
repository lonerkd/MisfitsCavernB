# Session — 2026-10-17: design for guide steps as JSON (proposal only)

**Did:** wrote [plans/2026-10-17-dynamic-step-config.md](../plans/2026-10-17-dynamic-step-config.md) — a schema (zod `StepConfig`, a small declarative `autoWhen` predicate replacing the three `auto` functions), file layout, before/after examples against `StepDef`, validation tests, slices, and why database-stored steps are not recommended yet. `engine.ts` and all consumers stay unchanged: a `compile()` step turns JSON into today's `StepDef`.

**Verified:** read `lib/guides/{steps,workflows,engine}.ts` and `lib/os/progress.ts` to ground every claim (only 3 steps use `auto`, all `> 0`). **Not verified:** no code written, so no typecheck/test/build run; the schema snippets are unexecuted design sketches; bundle-size effect not measured.

**Open:** three owner decisions at the end of the plan (repo-JSON vs live editing; DSL vs new milestones; who authors steps).
