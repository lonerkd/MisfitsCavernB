# The Cavern — Playbook

**How to consume this system fast and leave it smarter than you found it.**
Rules live in [`RULES.md`](RULES.md) (what must be true); this file is about
speed and compounding (how to get there with the least reading, and how to
make the next session faster than this one). Nothing here overrides a rule.

## The fast start (under a minute)

1. [`STATE.md`](STATE.md) → **Resume here** — including what is waiting on the
   owner (a migration not pasted is usually why production looks broken).
2. `node scripts/latest-sessions.js 3` — what the last PRs did, verified, and
   learned.
3. [`BACKLOG.md`](BACKLOG.md) — pick the work; it is the one list.

Deep docs only when the task touches them — the map is RULES.md's
*Where to look*. Nothing else is required reading to start.

## Search first, read second

- [`bible/inventory.md`](bible/inventory.md) maps every route to the files it
  touches — grep it; don't browse folders.
- `*.test.ts` files are **executable documentation** — the fastest true
  statement of intended behaviour, and they can't rot like prose can.
- Grep before opening; when a file must open, open it at the lines grep
  found, not from the top.
- [`adr/`](../adr/README.md) before designing: if it was decided, it's
  decided — read the ADR, don't relitigate it.
- Prefer the scripts that already exist (`sync-intel`, `bible`, `db:types`,
  `db:drift`, `latest-sessions`) over writing new ones.

## The skip list (reading these is slower than not)

- **Never read as truth, never edit:** `AGENTS.md`, `CLAUDE.md`,
  `.github/copilot-instructions.md` — generated mirrors of RULES.md; editing
  one fails CI. The source is RULES.md.
- Old sessions: the newest 3 are enough (`latest-sessions.js`);
  `STATE-history.md` and `archive/` are archaeology, for when a *why* isn't
  in an ADR.
- The whole bible: only the screen being touched.
- CI re-verifies some things nightly (Production schema drift) — read its
  result; don't re-derive it.

## The learning loop (how work compounds)

Every PR leaves the system smarter — the session is not done until:

1. **Session note** — what changed, what you verified and how, what you did
   *not* verify, what surprised you.
2. **BACKLOG** — every finding that needs doing, scoped
   (what / where / size / done-when).
3. **The owning doc** — if a screen or system changed, its doc changed in the
   same PR (INDEX.md's layers table says who owns what).
4. **A pitfall that cost you time** → one line in *Pitfalls* below, same PR.
5. **An assumption a doc held that you disproved** → fix that doc, same PR.

Where a lesson lives: one-off detail → the session note. Recurs → RULES.md
(if it's a rule), here (if it's a tactic or a pitfall), an ADR (if it's a
decision). Promote, don't duplicate.

## Pitfalls (living list — add a line the moment something costs you time)

- **Production lags `main`:** migrations are pasted into the dashboard by the
  owner, by hand, in order (STATE.md "Resume here"). Before diagnosing a
  "broken" production feature, check whether its migration was applied.
- **Apply a migration byte for byte.** The drift check hashes each function's
  exact text, comments included. Dropping a `--` comment line inside a
  function body when pasting it makes the drift run fail on that function (it
  did on 2026-10-27, `add_review_comment` / `decide_review`). Copy the file
  as merged; if a body does differ, `CREATE OR REPLACE` it from the file.
- **The Supabase connector reads production but times out on writes** — a
  tool limit, not a bug; don't "fix" it.
- **Entry files are generated.** After touching RULES.md, run
  `npm run sync-intel` in the same PR, or CI fails on drift.
- **Script saves are debounced 1.5 s** (`lib/scriptos/sync.ts`) — in tests,
  never assert database truth instantly after an edit.
- **`npm run build` is Next 16 with `--webpack`.** When the build behaves
  unlike the Next you remember, read `package.json` before your memory.
- **Green is four gates**, not one: `checks`, `database`, `e2e-local`, the
  Vercel preview. A passing typecheck is not a passing PR.
- **Run `npm ci` after pulling `main`.** A container's `node_modules` can be older than the lockfile; with Next 16.4.0 installed the build stops with `SecurityFatalError` ("affected by a known security vulnerability") even though `package.json` asks for a patched Next. It looked intermittent; it was stale installs.
- **Cloud containers:** Docker dies between commands — start `dockerd` as a
  background task and `npm run db:start` before integration/e2e work.

## When you don't know

STATE.md *Known issues* → the newest session notes → the owner. In that
order; the answer is usually in the first two.
