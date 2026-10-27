# The working system

How the local machine, the checks, and CI fit together for The Cavern.

Written 2026-10-27. Every claim here was checked against the machine or GitHub on
that date. Where something is a recommendation rather than an observation, it says so.

---

## 1. The honest starting point

The pipeline is in better shape than it feels. What is missing is not machinery.

**What already works, verified:**

- CI on every PR: `checks` (sync-intel drift gate, bible inventory, typecheck, lint,
  test with coverage thresholds, build, bundle budget), plus `database` (fresh local
  Supabase from migrations, drift, generated types, persona integration tests) and
  `changes` (skips jobs a docs-only PR cannot break).
- `secret-scan` on every PR and weekly over the whole history.
- `production-drift` nightly: live production against `supabase/schema.fingerprint`.
- `pr-title` enforcing conventional commits, because the repo squash-merges.
- `sbom` weekly, `release` on `v*` tags, `dependabot` grouped weekly.
- `agent-status` every 6 h, `agent-claude` on the `agent-ready` label, `agent-autopilot`
  daily (still inert).
- Local hooks: `pre-commit` (staged secret scan + gitleaks + eslint on changed files),
  `pre-push` (typecheck + unit tests).
- The adapter system: `RULES.md` generates `CLAUDE.md`, `AGENTS.md`,
  `.github/copilot-instructions.md`, `.perch/PERCH.md`; `--check` fails CI on drift.

**The actual bottleneck, from the generated status issue:** 0 issues labelled
`agent-ready`, 0 `agent-working`, and 9 agent PRs open with several failing CI. The
workers are armed and idle. Nothing is being fed in, and nothing is being cleared out.

**The second problem: the repo is public.** That is the single most consequential fact
for cost and for safety, and it changes several answers below.

- Actions minutes are **unlimited and free** on standard runners for a public repo.
  The 200 runs in the last 7 days cost nothing. So "reduce CI cost" is not a goal here;
  "reduce CI *noise*" is.
- Anyone can read the code, the issues and the PRs. Issue text is untrusted input to
  the agents, which §8 of `tools-and-access.md` already handles correctly.

---

## 2. Backup

### What exists

`scripts/cavern-backup.ps1`, written and proven this session.

It bundles every ref into one file, copies the files git does not track, writes a
manifest, and verifies the bundle before claiming success. Target is
`D:\backup\cavern-bundles\<timestamp>\`.

### Why it is built this way

- **D: is a separate physical disk** (2 TB HDD, disk 0) from the repo on C: (500 GB SSD,
  disk 1). A backup on the same disk is not a backup.
- **A bundle is a real repository in one file.** `git clone all-branches.bundle restored`
  restores history and every branch. That was tested, not assumed: the restored clone
  came back with all 5 branches, 1405 files, and `claude/eco-consolidation` at
  `c6857c6` — byte-identical SHA to the live repo. 630 commits on that branch.
- **It captures what git ignores.** `.env.local`, `.perch/mcp.json` (the CourtListener
  key), `.claude/settings.local.json`, the wiki, the Obsidian config. None of these can
  be regenerated from the repository. This is the main reason the script exists.
- **It captures local-only branches.** A branch that was never pushed has no remote
  copy. Note the converse, which is the useful signal: **a deleted remote branch means
  the work was merged or scrapped** — GitHub deletes the branch when a PR merges, and
  an abandoned branch gets cleaned up. A missing remote branch is not a disaster; it is
  a status. Do not treat it as one.

Runtime: ~2.6 seconds. Size: ~17 MB per run.

### Restore

```
git clone D:\backup\cavern-bundles\<stamp>\all-branches.bundle restored-cavern
```

Then copy anything from `untracked\` back into place. `MANIFEST.txt` in the run
directory records the branch, HEAD and the branch list.

### Schedule it

**Not scheduled, on purpose.** Nothing runs on a timer without you asking for it.

Run it by hand before anything risky:

```
powershell -ExecutionPolicy Bypass -File scripts\cavern-backup.ps1
```

`-Prune` removes runs older than 30 days. It is opt-in so a manual run never deletes
anything.

If you do want it automatic later, that is your call to make — the command is in the
script header. It is not on a timer now.

### What this does not cover

- **Off-site.** Both copies are in this house. A fire takes both. If the repository ever
  goes private, or if you want the safety, add a private remote and push the branches
  that matter. That is the one real gap.
- **Production data.** Supabase's own backups are the answer there, not this script.
  Worth confirming the free plan's retention is what you assume it is.

---

## 3. Keeping files in sync

There are four separate "sync" problems here. They need different answers.

### 3a. Rules to tool entry files — already solved

`RULES.md` is the one source. `npm run sync-intel` generates all four adapters and
`--check` fails CI if any is stale or hand-edited. Adding a tool is one line in
`adapters()`. Nothing to change.

### 3b. Line endings — fix the cause, not the symptom

`core.autocrlf=true` on this machine converts files to CRLF on checkout. The generators
write LF. Result: `git status` reports `AGENTS.md` modified after every run, `git diff`
shows nothing, and the tree looks dirty for no reason. This has been quietly wasting
attention.

Fix, in order:

1. `.gitattributes` (added this session) declares `* text=auto eol=lf`, so the
   normal form is LF everywhere regardless of local config.
2. Then normalise once, deliberately, in its own commit:
   ```
   git add --renormalize .
   git commit -m "chore: normalise line endings"
   ```
   Do this as a standalone PR. It touches many files and would bury any real change
   mixed into it.

### 3c. Local machine to remote — the branch discipline that failed

The failure mode this session was real: 61 commits on `claude/eco-consolidation`, 47
behind `main`, both remote branches deleted, and the work turned out to be worth
almost nothing (174 of 190 files byte-identical to `main`; 10 unique lines total).

The rule that prevents it: **a branch that is not pushed and not PR'd does not exist.**
Long-lived local branches accumulate and rot. Concretely:

- Branch, push, open a PR the same day. Even as a draft.
- Never let a branch sit more than a few days without rebasing on `main`.
- When a branch is superseded, delete it. The salvage session on 2026-10-20 already did
  this job for the eco work; the branches should have gone then.

### 3d. The wiki — decide, do not drift

`.cavern-intelligence/wiki/` is untracked, and the ecosystem config says "wiki/ is not
committed". So it is a local-only Obsidian vault that nothing backs up by default.

It is now included in the backup script. But the deeper issue is that it *drifted*: the
page this session corrected had been wrong for over a week, and my first correction of
it was wrong too because I checked the files instead of the system.

Two options, pick one:

- **Keep it local-only** (current). Then it is a scratch pad, and the wiki's own
  `AGENTS.md` rule applies: repo docs are truth, the wiki is derived, and on conflict
  the repo wins. Accept that it will drift and do not trust it for facts.
- **Commit it.** Then it gets CI, review and history like everything else. Given it
  already has a maintenance schema and a log, this is the better long-term answer.

My recommendation: commit it. A knowledge base that nothing verifies is a liability
that reads like an asset.

---

## 4. CI: what to run, where, and when

The existing split is right. Here it is as one table, with the reasoning.

| Check | Where | When | Why there |
|---|---|---|---|
| eslint on changed files | pre-commit hook | every commit | Seconds. Catches the obvious before it leaves the machine. |
| staged secret scan + gitleaks | pre-commit hook | every commit | Cheapest place to stop a credential. |
| typecheck + unit tests | pre-push hook | every push | The same two things CI's `checks` job runs first. Failing here saves a CI round trip. |
| sync-intel `--check` | CI `checks` | every PR | Drift gate. Cheap, and it is the thing that keeps the adapters honest. |
| bible inventory diff | CI `checks` | every PR | Same pattern: generated file must match the code. |
| typecheck, lint, test:coverage, build, budget | CI `checks` | every PR | The gate. Coverage thresholds live in `vitest.config.ts`. |
| session note check | CI `checks` | main only | History rule; needs the fetched history. |
| migrations → drift → types → persona tests | CI `database` | PR when schema or its callers change | Needs a real Postgres. Skipped for docs-only PRs. |
| secret scan over all history | CI `secret-scan` | every PR + weekly | A credential once committed stays exposed. |
| production drift | CI `production-drift` | nightly + on `supabase/**` | Catches a change made outside a migration. |
| PR title | CI `pr-title` | PR open/edit | Squash-merge makes the title the commit message. |
| full browser journeys (5 shards) | `e2e-scheduled` | daily 03:47 UTC | ~32 min. Too slow to block every PR. |
| SBOM + licences | `sbom` | weekly + main | Due diligence, not a gate. |
| agent status | `agent-status` | every 6 h | Read-only report. |
| backup | local, by hand | when you choose | See §2. Nothing runs on a timer. |

**The one gap worth closing.** `e2e-scheduled` runs daily on `main` and uploads
artifacts on failure, but nothing tells you. A red nightly is invisible until you go
looking. Cheapest fix: have it open or comment on an issue on failure, the way
`agent-status` already writes an issue. Then a broken journey shows up where you
already look.

**Do not add to PR CI.** It is already thorough and the repo is public, so it is free
but not instant. Adding more to the PR path trades your attention for nothing.

---

## 5. The free local worker

This is the part with a real constraint, so here it is plainly.

**GitHub Models is gone.** The repo's own §8 records it: retired 2026-07-30. The free
model quota for Actions no longer exists. That was the free 24/7 worker.

**The old local daemon is gone too.** `main` commit `967bc1b` removed it. Its log ends
in `Error: database is locked`; nothing listens on `127.0.0.1:4310`.

**Ollama has zero models installed.** The API answers; the list is empty. Every local
tier in `ecosystem.config.json` pointed at a model that was never pulled.

### What your hardware can actually do

- RTX 3060, **12 GB VRAM** (the Windows API reports 4 GB; `nvidia-smi` says 12288 MiB —
  trust the latter)
- 48 GB RAM, i5-9600K (6 cores)

12 GB VRAM runs a genuinely useful 7–14B coding model at 4-bit, and a 30B-class model
with partial offload at a real speed cost. That is enough for a local worker on
bounded, well-specified tasks. It is not enough to replace a frontier model on
architecture or a subtle bug.

### The recommendation

**Do not rebuild the daemon.** It was a large amount of machinery to run models that
were never installed, and the GitHub-native loop that replaced it is simpler and
already working. Rebuilding it would be re-solving a problem you have already solved.

Instead, use local models where they genuinely win — offline, free, private, no rate
limit — and keep the frontier model for the hard parts:

1. **A local reviewer, not a local author.** Point a local model at a diff and ask for
   a review. It is cheap, it runs offline, and a mediocre reviewer that always runs
   beats a great one that does not. This is the highest-value local use.
2. **Bulk mechanical work.** Renames, codemods, test scaffolding, doc generation.
   Bounded, verifiable, and the checks catch it when it is wrong.
3. **Keep the frontier worker for the agent loop.** `agent-claude` runs on your Claude
   plan. That is the "free" worker in the sense that matters: no per-token bill, and it
   is already wired up.

If you want a local model, pull one that fits 12 GB. Do not pull three. Then wire it to
the one job above and leave it there.

### The honest trade

A local model on this hardware will be slower and less capable than the hosted worker
you already have running. Its advantages are offline operation, no rate limit, and
nothing leaving the machine. If none of those three matter for a given task, the local
model is the wrong tool. That is not a limitation to work around; it is the reason to
be selective about where you use it.

---

## 6. Tool and stack configuration

### The Node version mismatch — fix this first

- CI reads `.nvmrc`, which says **22**.
- This machine runs **Node 24.14.0**.

CI is testing a different runtime than you develop on. That is the kind of gap that
produces a bug on your machine and not in CI, or the reverse, and it is invisible until
it bites. Either install Node 22 locally and use it for this repo, or change `.nvmrc`
to 24 deliberately. Do not leave them different by accident.

### Docker is not running

`com.docker.service` is stopped, so `npm run db:start` cannot work, so the local
Supabase stack and the persona integration tests cannot run locally. Everything in CI's
`database` job is currently unverifiable on this machine. Start Docker Desktop before
any session that touches the schema or RLS.

Note `scripts/dev-stack.sh` is a bash script. On Windows it needs Git Bash or WSL, not
PowerShell. Since you are on Windows, `npm run stack:up` will not work from PowerShell
as written.

### The MCP permissions that gate nothing

`.claude/settings.json` sets `enableAllProjectMcpServers: true` and carries **83
`mcp__` permission rules** — 38 GitHub, 19 Supabase, 16 Vercel, 6 Google Drive, 4
Indeed (160 allow entries in total). There is no `.mcp.json` in the repo and no
`mcpServers` entry in `~/.claude.json`. Those servers do not exist, so all 83 rules
grant nothing.

Two valid answers: write a real `.mcp.json` with the servers you actually use, or
delete the rules. Leaving them is the one option that is purely misleading — it reads
like a configured capability and is not.

### `.claude/settings.local.json` has grown into a junk drawer

It holds 93 allow entries, 15 of them one-off commands from past sessions with absolute
paths and entire shell pipelines baked in. It is machine-local and gitignored, so it is
not a security problem, but it is noise that makes the real permissions hard to see.
Worth clearing out.

### What is already right, and should not be touched

- `CODEOWNERS` on `*`, `/supabase/`, `/.github/`.
- `dependabot` grouped weekly, majors deliberately excluded.
- The `deny` list: `.env*` reads, `git push` to `main`, `sudo`, `rm -rf /`.
- `pre-commit` and `pre-push` doing exactly the right amount of work.
- The `changes` job skipping jobs a docs-only PR cannot break.
- Issue templates that ask for the filmmaker's problem, not the feature.

---

## 7. What I would do, in order

1. **Push the branch and open the PR** for the Perch adapter. Done: PR #346.
2. **Fix the Node mismatch.** One line, and it removes a whole class of confusing bug.
3. **Add `.gitattributes`** (done) and then renormalise line endings in its own commit.
4. **Run the backup by hand** before anything risky. Not on a timer; that is your call.
5. **Start Docker and run the database job locally once.** Confirm the persona tests
   pass on this machine, so you are not trusting CI for something you cannot reproduce.
6. **Decide the wiki's fate** — commit it or accept it as scratch. Do not leave it
   drifting.
7. **Feed the agent loop.** Label one issue `agent-ready` and watch `agent-claude`
   complete it end to end. You have seen it fire; you have not seen it finish.
8. **Make the nightly e2e failure visible** by having it write to an issue.
9. **Clear the MCP permissions** or make them real.
10. **Then, and only then**, consider a local model — for review and bulk work, not as
    a daemon.
