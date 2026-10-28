#!/usr/bin/env bash
# Commit everything and push the current branch — the Claude issue worker's only way to push
# (.github/workflows/agent-claude.yml allows this script, not `git push`). It refuses any branch
# that is not claude/*, so the worker can never push to main.
#
#   scripts/agent-push.sh "feat(scope): one-line commit message"
set -euo pipefail

msg="${1:?usage: scripts/agent-push.sh \"<one-line commit message>\"}"
branch="$(git symbolic-ref --short HEAD)"
case "$branch" in
  claude/*) ;;
  *) echo "refusing to push: '$branch' is not a claude/* branch" >&2; exit 1 ;;
esac

git add -A
git commit -q -m "$msg" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
git push -u origin "$branch"
