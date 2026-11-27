# 2026-11-26 — Service worker: never cache the auth page (mobile bug batch, 1 of 5)

**The report (owner, 2026-11-26 evening):** ten annotated screenshots of
the app misbehaving on his phone. The first showed the sign-up screen with
two headings on top of each other ("JOIN THE CAVERN" over "WELCOME") and a
greeting line — "Good to see you again, misfit." — that **does not exist
anywhere in the codebase or its history** (`git log -S` finds nothing).
The current auth page has exactly one heading element whose text comes
from one function of the mode; it cannot render two headings at once.

**The mechanism:** `public/sw.js` cached every successful navigation and
served that copy back whenever a later navigation's fetch failed. A
cached `/auth` from an older build — plus that build's hashed chunks,
which the worker serves cache-first — is a complete old sign-in screen,
served as if current. On a flaky connection or in the installed app,
that is the page the phone shows. (The worker's own v2 note already
worried about auth — it refused to cache auth *redirects*, but the auth
page itself was still cached.)

**The change:** navigations to `/auth` (and under it) are never put in
the cache and never served from it; offline there returns the offline
notice instead. Every other page keeps network-first with its cached
fallback. The cache name bumps to `mc-shell-v4`, so the activate step
deletes the old caches — including any stale `/auth` — on every client
that picks up this worker.

**Tests:** `scripts/sw.test.mjs` (new) loads the worker in a vm with
mocked caches/fetch and drives its fetch handler: an ordinary page is
cached after a visit; `/auth` is not; offline `/auth` returns the
offline notice even with a stale copy sitting in an old cache; offline
`/lounge` still serves its cached copy. 4/4 pass.

**Not claimed:** this does not explain every screenshot in the batch —
the Lounge landscape width, the hub top-bar overlap, the closing-CTA row
and the editor's keyboard bars are layout bugs in current code and get
their own PRs. This PR removes the stale-build amplifier that can make
any already-fixed screen look unfixed. Live proof: the owner's phone
after this deploys (the new worker installs on a later visit; a full
close and reopen of the app speeds it up).
