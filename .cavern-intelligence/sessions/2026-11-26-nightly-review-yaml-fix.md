# Session - 2026-11-26: the nightly review never ran — one unquoted colon

**Why:** the "Nightly review" workflow had produced 748 runs, every one a push event, every one failed with zero jobs — the failure-email spam the owner saw (11 on Nov 22 alone) — and not one scheduled run since it landed on Nov 13. A schedule/workflow_dispatch-only workflow cannot run on push when it is valid, so the file itself had to be unparseable by GitHub.

**Found:** the last step's `run:` line was an unquoted plain scalar containing `}}: ` — `echo "Nothing changed since ${{ steps.gather.outputs.since }}: no review, no issue."`. YAML reads the `: ` after the expression as a mapping value, so the whole file fails to parse (PyYAML: "mapping values are not allowed here", line 95, column 75). GitHub registers an unparseable workflow under its path instead of its name, creates a failed zero-job run for it on pushes, and never fires its schedule. Cross-checks: the workflow's API record shows the path as its name; `e2e-scheduled.yml` (valid, schedule-only) has zero push runs; production-drift's push runs are real (it has a push trigger).

**Fixed:** the one line is now single-quoted. The shell command the step runs is byte-identical; only the YAML syntax changed. No job added or removed (rule 9), triggers unchanged (schedule + workflow_dispatch, as designed).

**Verified:** the file now parses cleanly with PyYAML — name "Nightly review", triggers [schedule, workflow_dispatch], one job `review`, permissions unchanged, and the step's `run` value is exactly the original command. **Not verified:** a live GitHub run — that lands when this merges and the next push/schedule shows the workflow under its real name with no zero-job failure; the 07:37 UTC scheduled run is the real proof.
