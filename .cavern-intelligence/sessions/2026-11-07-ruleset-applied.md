# Session — 2026-11-07: the ruleset binds everyone

The owner applied the `main-2` change (a session cannot: the cloud proxy refuses writes to rulesets). Verified from the API afterwards, not taken on trust: required checks `conventional`, `checks`, `database`, `gate` (strict), a required pull request (0 approvals, squash only) and **no bypass actors** (`current_user_can_bypass: "never"`). From now on nobody pushes to `main` or skips a check, the owner included.

**Left:** make `claude-review` required after its first green run on a real PR (it has never run: it needs a PR to run on). Docs only.
