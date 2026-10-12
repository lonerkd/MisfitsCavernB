# Contributing to The Cavern

Welcome, misfit. The short version: keep it real, keep it cohesive, leave it
better than you found it.

## Before you start

1. Read [`.cavern-intelligence/RULES.md`](.cavern-intelligence/RULES.md) — the working rules, once.
2. Read [`STATE.md`](.cavern-intelligence/STATE.md) (the handoff) and pick work from [`BACKLOG.md`](.cavern-intelligence/BACKLOG.md).
3. Set up with the [README](README.md) quick start.

## The rules that matter most

- **No mocks.** Every control persists to real data and does the real thing — or it isn't shipped.
- **Security in the database.** RLS on every table, through the `internal` helpers; test it as owner, crew and outsider.
- **Migrations are the schema.** New file in `supabase/migrations/`, never edit a merged one; snapshot, types and a persona test in the same PR.
- **One voice.** Feedback through `useToast()`, confirmation through `useConfirm()` — never `alert` or `confirm`. Sentence case, short, plain; see `.cavern-intelligence/design-language.md`.

## Making a change

```bash
git switch -c claude/<short-name>      # never work on main
# …change things…
npm run typecheck && npm run lint && npm run test
npm run test:integration               # if you touched the database
```

Open a pull request. The **title is a conventional commit** (`feat: …`, `fix(editor): …`, `docs: …`) — it becomes the commit on `main`. CI must be green (`checks`, `database`, `e2e-local`, the Vercel preview) before a squash merge. Update the doc that owns what you changed and add a note in `.cavern-intelligence/sessions/`.

## Reporting a bug or an idea

Use the issue templates. For a security problem, **do not open an issue** — follow [`SECURITY.md`](SECURITY.md).
