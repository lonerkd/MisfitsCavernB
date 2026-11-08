# Session — 2026-11-07: a merge gate and a lint ratchet, the same for every author

After the 11-07 audit the owner asked why the rules, CI and Copilot let weak work reach `main`. The honest answer: the only required checks were `conventional`, `checks`, `database`; lint had the rules that would have caught the problems switched off; tests, docs and notes were an honour system.

**Built:** `scripts/pr-gate.mjs` (9 deterministic checks, the ninth being that the lint baseline only shrinks; run from the base branch in CI; waivers only as visible PR-description lines; replayable on merged commits) and the `gate` job in `ci.yml`; unit tests (`lib/ci/pr-gate.test.ts`). Lint: `no-constant-binary-expression`, `no-constant-condition`, `no-explicit-any`, unused vars, `ban-ts-comment`, data access through `lib/` for `from`/`rpc`, colour rules; 1,235 existing violations recorded in `eslint-suppressions.json` so only new ones fail; `npm run lint:ratchet` prunes fixed ones.

**Verified:** replayed on merged PRs it fails #423 (new components untested, too big, undefined tokens), passes #424, #420, #418, #419, #422; typecheck, lint (0 errors), unit tests.

**Not done / owner:** `gate` is not a *required* check until the ruleset is changed (the admin bypass also lets the owner's own credentials skip everything). The SHA-bound Claude review check and a PR-level browser job are next (BACKLOG 3.40).
