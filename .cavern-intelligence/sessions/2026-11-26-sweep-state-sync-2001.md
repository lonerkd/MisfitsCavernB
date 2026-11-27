# 2026-11-26 — Sweep STATE sync: #780–#783, drift red, #769 live-fail

**What changed:** `STATE.md` only (handoff + Known issues). The handoff now
covers #780 (Perch token scrub), #781 (game-script export + build sheet,
3.51), #782 (casting notes/candidates keyed by character, 3.18) and #783
(landing thinned, phase 7). Phase-7 queue is now jobs + press kit.

**Drift is red, and the file says so:** #782's migration
`20261126000100` merged but is not yet applied to production or staging —
run 45924707130 (19:49 CST) lists exactly that migration's 15 objects
missing from production, plus the old `characters_rename()` body still on
the target. The migration line in item 2 still reads through
`20261123000300` on purpose: production really does match through there.
Apply `20261126000100` to production then staging, re-run drift, then
update the line. The sweep cannot apply it — no Supabase access from here;
the owner said he will do it later himself (he has the file and SQL Editor
links). Until he does, the live Casting Board's notes and shortlist read
empty — data is not lost, applying the migration backfills it.

**Owner-verified, owner-corrected:** #768's sign-in redirect fix is
live-verified by the owner (~18:55 CST). #769 FAILED on his phone (~19:49
CST) — keyboard/mobile still broken, rotation messes it up — and his
annotated screenshots are a design language (X = remove/replace, adjacent
text = his alternative), not pure bug reports: sign-up heading becomes
'WELCOME' with his greeting 'Good to see you again, misfit.', and the
landing 'BEGIN YOUR FILM' closing section is to be REMOVED. A mobile-fix
batch is open in a side chat, one PR per bug. He confirmed the corrected
reading ~20:01 CST ('Since we had a duplicate, u know' — the duplicate
greeting line was the tell), and #785 builds it: sign-up heading JOIN THE
→ WELCOME (lower line CAVERN kept; the italic 'Join the cavern.' subline
untouched), sign-in greeting 'Good to see you again, misfit.' (one line,
replaced — no duplicate), landing BEGIN YOUR FILM section removed; visual
proof is his phone after deploy. #784 (service-worker auth-cache change, built on the misread) is
PAUSED unmerged pending his word.

**Verified:** `node scripts/check-state-facts.mjs` gives the one expected
warning (newest migration `20261126000100` not yet named in the through
line) and no fail; `npm run sync-intel` and `npm run bible` report no
drift (bible still 163 specs); typecheck pass; lint 0 errors (6
pre-existing warnings); test 463 files / 3744 passed / 26 skipped / 0
failed; build pass. Docs-only change — no code, no migration, no
behaviour change.
