# Hub: the page leaves room for the island now

Owner, Nov 26, 2026, over the project hub: the collapsed island pill
floats over the page's content (the Milestones list, the office
cards' headers) — "I would want to keep the key this big but hide the
visual that overlaps." The pill keeps its size; the page was the
problem.

## Cause

Every sibling page reserves the island's resting room at its foot
through the published `--taskbar-height` (home, projects list,
settings, admin — `calc(var(--taskbar-height, …) + air)`). The
project page never joined them:

- Desktop: a fixed `120px` bottom padding — a guess.
- Phones: the `(max-width: 760px)` rule in `app/globals.css` set
  `.mc-project-body` bottom padding to **40px !important** — less
  than the island's resting footprint (70px at size 1 per
  `lib/island/scale.ts`'s `islandReserve`, and more at the larger
  size the owner runs). The foot of the hub — the office section —
  sat permanently under the pill, which is exactly his screenshots.

## Fix

- `app/globals.css`: the phone rule now reserves
  `calc(var(--taskbar-height, 70px) + 32px)`.
- `app/(suite)/projects/[id]/page.tsx`: the body padding takes the
  same measure plus air (`+ 44px`, home's margin) instead of 120px.

While scrolling, content still passes under the frosted pill — that
transparency is a keeper (owner, same evening). What changes is the
resting state: the last card on the page can always be scrolled
fully clear of the pill, at any island size.

Pins: `components/projects/hub/island-room.test.ts`.

## Verified

Locally: the pin tests, the hub suites, typecheck, lint. The resting
clearance on a real phone at the owner's island size is his eye
after deploy.
