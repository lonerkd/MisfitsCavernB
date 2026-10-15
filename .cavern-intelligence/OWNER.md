# The Cavern — the owner's guide

For the owner: the vision-holder who is not the engineer. Plain language, no
jargon without a translation. The rules live in [`RULES.md`](RULES.md) — this
file never overrides them; it translates them.

## What this folder is

`.cavern-intelligence/` is the **crew's brain**. Every AI agent (Claude Code,
Cline, Codex, Cursor, Copilot…) that works on this repo reads the same few
files at the start of every session, so whichever one you hire behaves like
the same employee who remembers everything. It is made of ordinary documents:

| You'd call it | It is | Changes |
|---|---|---|
| The employee handbook | [`RULES.md`](RULES.md) — how to work here | rarely |
| The shift handover | [`STATE.md`](STATE.md) — where things paused, what's next | as work moves |
| The to-do list | [`BACKLOG.md`](BACKLOG.md) — every open job, sized | every PR |
| The diary | [`sessions/`](sessions/README.md) — one page per finished job | every PR |
| The encyclopedia | [`bible/`](bible/README.md) — every screen, described | with the code |
| The decision ledger | `adr/` (repo root) — "we chose X because Y" | by decision |

Nothing here is code. If you can read a memo, you can read all of it.

## The words you'll see (glossary)

- **PR (pull request)** — a finished job, presented for review. Nothing
  reaches the live app without one.
- **"CI green"** — the robots checked the job (types, lint, tests, build) and
  all passed. You can ask any agent "is CI green?" — it's a yes/no question.
- **Migration** — a database change. The agent writes the file; **you** paste
  it into the database dashboard (STATE.md's "Resume here" holds the exact
  click-path when one is waiting). Code going live without its migration is
  why features "degrade quietly" — check STATE first.
- **ADR** — a written-down decision, kept forever. Reading `adr/` is the
  fastest way to know why the suite is shaped the way it is.
- **RLS (row-level security)** — the locks on the data. Every table gets them
  from birth; a locked door left open is treated as the worst kind of bug (P0).
- **Personas (Sam / Jordan / Riley)** — the three test identities: owner,
  crew, outsider. Tests prove Riley the outsider sees nothing of yours.
- **`claude/*` branch, squash merge** — the workflow: work happens on a
  side branch, gets reviewed, then lands on `main` as one clean commit.
  Nobody (including agents) pushes straight to `main`.

## What agents will ask you, and how to answer

Agents must ask before anything **destructive, money-adjacent, secret-adjacent
or design-shaping**. Typical asks, in your words:

- "Merge this?" — say **merge** only when CI is green and you've read the PR
  description (a human-written summary is always at the top).
- "Apply this migration?" — follow STATE.md's click-path; it lists the order.
- "A design decision the owner hasn't made" — this is your vision being
  asked for. Answer in plain words; the agent writes it down (ADR or brand/).
- "Rotate a key / change auth settings" — these touch the live service;
  ask the agent to explain the blast radius first, then decide.

## The three questions to ask any agent, every time

1. **"What did you verify, and how?"** The rules forbid claiming without
   proving (RULES.md #2). Make them show it.
2. **"What did you *not* do?"** Honest agents say plainly what's unverified.
3. **"What do you need from me?"** Usually: a migration paste, a dashboard
   setting, a decision. These land in STATE.md's "Resume here" too.

## What only you can do (outside the code)

Dashboards the agents cannot reach: Supabase (database + auth mail), Vercel
(deploys, environment secrets), the domain, GitHub settings (branch
protection, incident marking), the LICENSE, and anything legal. STATE.md's
"Open work — owner, outside the code" is your standing list.

## Where to look, when

- "Where were we?" → `STATE.md`, top.
- "What's left?" → `BACKLOG.md`.
- "What just happened?" → newest file in `sessions/`.
- "Why is it like this?" → `adr/`, then `bible/`.
- "Is the live site okay?" → STATE.md "Known issues" (agents keep it honest).

You never need to read code. Every question above is answerable from prose.
