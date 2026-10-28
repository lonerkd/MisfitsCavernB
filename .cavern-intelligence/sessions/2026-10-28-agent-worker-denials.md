# Session — 2026-10-28: show which tool calls the Claude issue worker was denied

After #348 the worker ran for real on test issue #326 (30 turns, about two minutes) but 9 tool calls were refused by its allow-list and it never reached a branch or pull request. The run log only gives a count. `agent-claude.yml` now ends with a step that prints each denied call's tool and the first 200 characters of its input from the execution log, so the allow-list can be widened to exactly what the task needs and no more.
