# 2026-11-28 — fix(a11y): underline the "Write a post" link

## What

The fifteenth nightly e2e (run 46144406947, HEAD `22e12c39`) failed the
`accessibility` spec with the same deterministic defect as the fourteenth:
the "Write a post" link to `/admin/hub` on `/` is distinguishable only by
colour — contrast 1.55:1 (accent `#f34013` vs surrounding `#a8a888`, needs
3:1) — on desktop and mobile. Axe rule `link-in-text-block`.

## Change

`components/community/HubFeed.tsx:61` — the admin-only "Write a post" link
now carries `textDecoration: 'underline'` alongside its accent colour, so
it is distinguishable without relying on colour. The accent colour is
unchanged; no other link on the page is touched (the "Help" pill beside it
is a button-styled link, not a link in a text block, so the rule does not
apply there).

## Verification

- Not verified locally: the sweep worktree cannot run git/npm (execution-risk
  check, as on the last twenty runs), so typecheck/lint/test/build were not
  run here. The change is a one-line inline style on an existing element;
  the PR's own CI (`checks` job) is the verification for type/lint/unit
  regressions.
- Not verified by this PR's CI: the nightly e2e does not run on PRs. The
  next scheduled nightly run is the check that the `accessibility` spec
  goes green on this signature. If it still fails, the fix did not satisfy
  the axe rule and the signature stays open on #731.
- No routes, tables or functions changed, so `sync-intel` and `bible` are
  no-ops by construction; no migration; no RLS change.

## Follow-up

The other 25 failures in the fifteenth run have no single root cause
(diagnosis on #731); they still need single-spec reproduction first, per
the issue's rule. This PR fixes one signature only.
