#!/usr/bin/env bash
# SessionStart hook — injects Misfits Cavern working context at the top of every
# Claude Code session so continuity survives ephemeral/remote containers.
# Emits SessionStart additionalContext JSON on stdout. Fails soft: any error
# still returns valid JSON so the session is never blocked.
set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)" || true

lead="Session bootstrap — Misfits Cavern. You are the lead engineer + QA for this suite. Before non-trivial work read .cavern-intelligence/CLAW.md and .cavern-intelligence/playbook.md, and verify with \`npx tsc --noEmit && npm run build && npm run lint\`. Project rules + current iteration state follow:"

ctx="$(cat AGENTS.md .cavern-intelligence/STATE.md 2>/dev/null | head -c 9000)"

jq -n --arg lead "$lead" --arg ctx "$ctx" \
  '{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:($lead + "\n\n" + $ctx)}}' \
  2>/dev/null || printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"Misfits Cavern session. Read AGENTS.md and .cavern-intelligence/STATE.md."}}'
