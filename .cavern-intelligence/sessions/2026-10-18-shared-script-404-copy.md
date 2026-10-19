# Session — 2026-10-18: shared-script 404 tells the reader what to do

**Changed:** `/s/[token]` not-found state (`app/(public)/s/[token]/page.tsx`) kept its "SCRIPT NOT FOUND" heading and expiry/sharing-off explanation, and gained a second line: "Ask the writer to send you a new link." The reader is an outsider with no account, so the hint points them at the author, not at a UI they can't reach.

**Verified:** `npm ci`, then `npm run typecheck` (clean), `npm run lint` (clean), `npm run test` (1007 passed, 1 file skipped), `npm run build` (succeeded). **Not verified:** the e2e `script-share.spec.ts` (still matches "SCRIPT NOT FOUND", unchanged) and the page in a browser.
