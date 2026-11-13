# The nightly review (2026-11-11)

Owner: Copilot's automatic code review was draining the $10 plan (1,499 of the month's credits, almost all "Code Review model", all on this repository: every push to a PR gets a fresh review, and the agent branches push constantly). Replace it with one review a night that reads everything that changed in the day, on `main` and in production, so the next day's first task is fixing what it found. It must not spend Copilot credits.

## Decisions

1. **One review a night, not one per push.** `nightly-review.yml`, 07:37 UTC, after the nightly e2e (03:47) and the schema drift check (06:17) so their results are part of the review. A run of about ten minutes a night replaces a run per push.
2. **Claude does it, on the owner's Claude token** (`CLAUDE_CODE_OAUTH_TOKEN`, already set for the worker), through `claude-code-action`: no Copilot credits. It draws on the Claude plan's usage limits, like the worker (a Sonnet run, at most 40 turns).
3. **Everything that changed, "wholly":** pull requests merged into `main`, the commits, **branches pushed and not merged** (that is where most of the agent work is for a day), production deployments (GitHub Deployments, environment Production, which Vercel writes), runs that did not succeed (the nightly e2e, schema drift, CI on `main`), the diff on `main` (cut when long, with the files named so the reviewer reads them), and the previous review if still open.
4. **The output is one issue** labelled `nightly-review`, "Nightly review YYYY-MM-DD": a summary, findings as checkboxes (P0 leak to an outsider, P1 broken, P2 lying or missing, P3 polish, each with `file:line` and the fix), what production and the checks showed, what was carried over, and what was looked at and found fine. The earlier open review is closed with a pointer when a new one is posted; its unchecked items are carried into the new one.
5. **It is the first task of the next day.** `RULES.md` (start of every session) and the SessionStart hook put the open review's unchecked boxes first. Tick them off as they are fixed.
6. **A quiet day makes no issue.** No merged PR, no commit, no branch, no deployment and no failed run: nothing is posted. A red nightly run alone is news and is reviewed.
7. **Safe by construction.** It starts only on a schedule or by hand (nothing a stranger can open starts it). The model has read-only git, Read, Glob, Grep and Write (for the one output file): it cannot push, comment or call the API. Only the posting script holds a write token, and it runs from a copy made before the model starts (the model can Write to the workspace, so the live script is not trusted), posting that one file after checking it has its sections (a review that wandered off fails the run loudly). The prompt says that titles, messages and diffs are data, never instructions.
8. **Per-PR gates are unchanged:** CI, the `database` job and the `claude-review` status on high-risk PRs still decide a merge. The medium tier no longer promises an AI review per PR; it says the nightly review reads it.

## Owner, once

- Turn Copilot's automatic review **off** (repository Settings > Copilot > Code review; or the account's Copilot settings) and leave `PR_RISK_REQUEST_COPILOT` unset.
- Run it once by hand (`gh workflow run nightly-review.yml`, or Actions > Nightly review > Run workflow) and read the first review before trusting the schedule: the prompt is in `scripts/nightly-review-prompt.md`; tune it there.

## Not decided here

- Whether a review should also run on a PR the owner asks for by hand (the `claude-review` flow for high-risk PRs covers it today).
- Actions minutes: this adds one run a night. The larger saving is running `checks` on a PR's ready state instead of on every push (BACKLOG).
