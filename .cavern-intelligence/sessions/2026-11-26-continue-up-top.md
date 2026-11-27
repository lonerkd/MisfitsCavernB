# Jump back in leads the signed-in home — Nov 26, 2026

Owner, viewing the home page on his phone: "Jump back in, should be higher."
The Continue offer was the first card inside YourDay, but YourDay itself sits
below the full-screen hero and the stats ticker, so the resume card landed a
scroll and a half down the page.

- `app/(suite)/page.tsx`: for a signed-in person the ContinueOffer now renders
  directly under the navigation, above the Hero (dynamic import, ssr off, the
  same pattern ClientShell uses). Guests never load it; the component still
  self-gates on session + an actual offer existing.
- `components/community/YourDay.tsx`: the inline copy and its import removed —
  the offer renders exactly once.
- `components/home/continue-placement.test.ts`: pins the placement (offer
  above the hero in page source; no second copy in YourDay).

Verified locally: typecheck clean, eslint clean on touched files, placement
tests 2/2, bible regenerated. Not verified: the visual on a real phone — the
owner's look after deploy is the check, as with the rest of tonight's batch.
