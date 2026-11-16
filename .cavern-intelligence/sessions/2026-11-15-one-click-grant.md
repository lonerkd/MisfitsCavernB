# Session - 2026-11-15: grant a permission request in one click (BACKLOG 3.50 step 5)

**The gap:** a crew member's "asks for access" reached the owner as a notification that said who and what, but the owner had to find the person on Cast & crew and flip the switch.

**Built:** migration `20261115000500` replaces `request_capability` so the notification's link names the ask (`&grant=<user>.<capability>`; nothing else in the function changed, no new grant). The crew screen shows a **Request for access** bar for the owner when that link is open: "<name> asked for access: see the budget" with **Grant see the budget**, using the same owner-only write as the switch on the person's card (`setCapabilityOverride`); it shows "Granted" once held. A bar only appears for a person on the crew and a permission in the catalogue.

**Verified:** persona test `request-capability.test.ts` (7, link updated) against the local database with the migration applied; unit test for the link parser; browser spec `e2e/grant-request.spec.ts` (the bar names the person and permission, axe clean, one click writes the override); typecheck and lint clean. Snapshot regenerated.

**To do after merge:** apply `20261115000500` to production, then staging, then the drift check (`request_capability`'s body hash changes).
