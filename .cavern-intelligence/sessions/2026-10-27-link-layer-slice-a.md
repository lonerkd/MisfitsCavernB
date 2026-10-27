# Session — 2026-10-27: the link layer, slice A — entities, links and the card

**Owner (second round):** gates are passed by owner / shape permission, anyone
can propose; format templates film and series first, then advertising and copy,
then games, music and books; slice order A → D → B → C.

**Built:** migration `20261029000000_entities_and_links.sql` — `entities` (one
row per scene, character, location, shoot day, task, document and media item;
its id is the source row's id; written only by the `entity_sync` triggers, which
also backfill what exists) and `links` (composite foreign keys: no cross-project
or dangling link; anyone on the project reads and attaches; the creator or a
shaper removes). `lib/film/links.ts` (data + live hooks), `lib/film/card.ts`
(the pure selector, unit-tested), `components/film/EntityCard.tsx` (drawn from
the selector; Back and Esc), and `StudioContext` exposes `openCard`. Entry
points: a stripboard strip and the call sheet's scene list.

**Flag:** `entity_cards` — local and preview on, production admins only.

**Tests:** `tests/integration/entities-links.test.ts` (9: labels follow
renames, deletes cascade, nobody writes entities through the API, Riley reads
and writes nothing, crew attach, cross-project / self / dangling / duplicate
links refused, creator-or-shaper removes); `lib/film/card.test.ts` (6).

**Not done:** attach / detach from the card and cards for tasks, documents and
media (B); mentions (C); entities for elements, shots, money lines and people.
Slice D (guest review) is next. **Not applied** to production or staging.
