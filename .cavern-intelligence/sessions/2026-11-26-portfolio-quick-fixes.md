# 2026-11-26 — Portfolio quick fixes: cards that fit the phone, a play button that means it

Slice D0 of the portfolio redesign (owner's verdict, Nov 26: "this is a
portfolio not a Google Drive storage").

- **The play circle lied.** Every showcase card rendered a 48px play
  button, but most projects have no embeddable player — the bible only
  embeds when `embedSrc` exists. The circle now renders only for a
  project that actually plays; the rest are covers that open the project.
- **The grid chopped the cards.** The rest of the showcase ran 3-up at
  every width — on a 390px phone each card is ~124px wide and the title
  stack clips at the card's top edge. On phones the lead cards now run
  one-up and the rest two-up; desktop keeps its 2-up lead and 3-up rest.

The rest of the redesign (hero, designed default covers, the editorial
span layout, oversized ambient light) is specced separately — this slice
only stops the bleeding. No database changes.
