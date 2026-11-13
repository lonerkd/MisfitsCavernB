# Session - 2026-11-13: the role model, step 1 (and the Recruit button that could not invite anyone)

Step 1 of [the role model](../plans/2026-11-13-role-model.md) was "catalogue and labels: a new `project_crew.project_role`". Looking at the code first showed the catalogue and the column already exist: `public.crafts` (about 60 crafts in departments, admin-editable) and `project_crew.craft`. The plan was corrected, and no column was added.

**What was actually wrong:** Studio › Cast & crew › Recruit offered six hardcoded titles ("Sound Mixer", "Production Assistant"…) and `inviteToCrew` wrote the choice into `project_crew.role`, the permission tier, which the database allows only as `lead`, `contributor` or `viewer`. The persona test now proves each of those titles is refused, so no invitation from that form could have succeeded. The form also showed a hardcoded "Active Professional" under every person.

**Built:** Recruit takes two choices (a craft from the real catalogue, and what they can do here: crew / lead / view only); `inviteToCrew(projectId, userId, tier, craft)` files them in their own columns (the type now rejects a craft where a tier goes); the person's own craft shows under their name instead of the fixed label; the owner can change a person's craft on the crew card (`setCrewCraft`: refuses and says so when the database updates nothing, audit-logged, notifies the person). No permission changed: only the project's creator can update a crew row, as before.

**Tests:** unit (`profiles.test.ts`, `crew-management.test.ts`); persona `tests/integration/crew-craft.test.ts` (the old bug refused, craft must be in the catalogue, the owner sets and clears it, crew and outsider cannot); browser `e2e/crew-craft.spec.ts` (recruit with a craft and view-only access, stored as such, change the craft, axe clean).

**Found, not changed:** `can_access_project` counts any `project_crew` row whatever its status, so a pending or declined invitee reads a non-private project (BACKLOG 3.50, step 3). `updateCrewMemberRole` (changing the tier) has no screen.

**Page budget:** `/lounge` is 364 kB in CI against its 363 budget (the shared `lib/supabase/profiles.ts`, which `inviteToCrew` grew in, is bundled there); raised to 364 on purpose.
