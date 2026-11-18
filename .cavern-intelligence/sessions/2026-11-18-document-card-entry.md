# Session - 2026-11-18: a document opens its card (BACKLOG 3.18)

A **Card** button on every Paperwork row (`PaperworkView.tsx`, behind the `entity_cards` flag like the other entry points) opens that document's card by the document's own id (a document is an entity under its id).

**A real defect found by the new spec:** the card's Close button could not be clicked in the Studio. The card sat in the Studio's stacking context, below the sticky page bar (z-index 100), which covered the top-right of the card. The card is now rendered through a portal into `<body>` (`EntityCard.tsx`), above the bar.

**Cutover, decided:** the graph's column cutover is already done. Only `scenes.cast_list` duplicated a link table (dropped 2026-11-17); `scenes.location`, the integer shoot days and `character_name` still feed triggers or print as labels, so nothing more is dropped.

**Verified:** typecheck; `e2e/document-card.spec.ts` and `e2e/documents.spec.ts` pass against a production build on the local stack (the card spec failed before the portal fix: the header intercepted the click). **Left:** a card entry from tasks and notes.
