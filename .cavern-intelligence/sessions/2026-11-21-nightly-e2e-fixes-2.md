# 2026-11-21 — nightly e2e, two stale specs (issue #658)

## Cause

Both failures were stale specs, not defects in the app.

1. `e2e/hide-message.spec.ts`: the admin moderation work (migration `20261121000600`, `/admin/reports`) now requires a reason before "Hide the message" does anything (without one it only toasts, so no confirm dialog ever opens), the toast reads "Hidden, and the report is resolved", the resolved report leaves the Open tab, and restoring is a confirmed action that toasts "Brought back". The spec still waited for the old "Hidden from everyone." / "Visible to the channel." text.
2. `e2e/phone-keyboard.spec.ts` (Lounge composer): the redesigned rail has collapsible section headers in the same `.mc-lounge-channels button` list the spec walked by position, so the loop clicked headers (folding sections) and then waited on a hidden row. A fresh user also has no postable channel, so the loop could never reach a composer. The layout itself is fine: with a postable channel open, the composer sits above the faked keyboard.

## Fix

- hide-message: fill the reason, wait for the new toast, read the original on the Resolved tab (and "The message is hidden."), and restore from the Resolved tab through the confirm.
- phone-keyboard: the test creates its own community channel (`post_policy: 'viewers'`, which lets anyone who can see it post) and opens it by name.

## Verified

Local stack (`db:reset`, production build against it, `npm run start`): `playwright test e2e/hide-message.spec.ts e2e/phone-keyboard.spec.ts --workers=1 --retries=0` — 5 passed together (each also failed alone before the fix: hide-message on the stale text, the Lounge test on a hidden row). `npx tsc --noEmit` and eslint on both specs clean. No app code, migration or unit test touched. Not verified: CI's five-way shard run.
