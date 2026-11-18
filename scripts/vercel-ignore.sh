#!/usr/bin/env bash
# Vercel's "Ignored Build Step" (vercel.json › ignoreCommand): exit 0 SKIPS this deployment, exit 1 builds it.
#
# The free plan allows 100 deployments a day and every push to a branch with a pull request is one (RULES.md 9). A
# push only earns a preview when it can change what the app shows, so this builds only when:
#   - it is `main` (production always builds), or
#   - since the last deployment of this branch, a file that goes into the app changed.
# It looks at everything since the last deployment (VERCEL_GIT_PREVIOUS_SHA), not only the tip commit: a push of
# several commits whose last one is a note used to be skipped even when an earlier commit changed the app.
#
# Never goes into the app: docs and notes, the agent's own files, CI and hooks, tests and e2e, the database
# migrations and their snapshot (the app does not import them), the dev scripts (one, preview-env-guard, is
# required by next.config.js and does count), lint and size baselines, and dependency-bot branches (CI judges those).
set -u

ref="${VERCEL_GIT_COMMIT_REF:-}"
[ "$ref" = "main" ] && exit 1
case "$ref" in dependabot/*) exit 0 ;; esac

base="${VERCEL_GIT_PREVIOUS_SHA:-}"
if [ -z "$base" ] || ! git cat-file -e "${base}^{commit}" 2>/dev/null; then
  # A branch's first push has no previous deployment: its fork point from main when main is known, else the parent.
  if git rev-parse --verify -q origin/main >/dev/null 2>&1; then base="$(git merge-base HEAD origin/main 2>/dev/null || echo 'HEAD^')"; else base="HEAD^"; fi
fi

files="$(git diff --name-only "$base" HEAD 2>/dev/null)" || exit 1   # cannot tell: build
[ -z "$files" ] && exit 0

while IFS= read -r f; do
  case "$f" in
    *.md|LICENSE|CODEOWNERS|adr/*|.cavern-intelligence/*|.claude/*|.perch/*|.claudeignore) continue ;;
    .github/*|.githooks/*|.gitleaks*|.gitattributes|.gitignore|.nvmrc) continue ;;
    e2e/*|tests/*|*.test.ts|*.test.tsx|*.test.mjs|playwright.config.ts|vitest*.config.ts) continue ;;
    supabase/*|eslint-suppressions.json|mobile-audit-baseline.json|performance-budget.json|skills-lock.json) continue ;;
    scripts/preview-env-guard*) exit 1 ;;
    scripts/*) continue ;;
    *) exit 1 ;;
  esac
done <<< "$files"
exit 0
