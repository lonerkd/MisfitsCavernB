# Session - 2026-11-15: the role model, step 7 (credits for every craft held)

**Found, not assumed:** the plan said credits "survive wrap". They do (credits are derived from the work), but a person with several crafts on one production (step 2's `project_crew_crafts`) was credited only under the primary craft, in all three places credits are derived: a person's credits, the press kit and a person's public page.

**Built** (migration `20261115000200`): each of the three functions adds a crew credit per extra craft, for confirmed members only, skipping a craft equal to the primary. No new function, grant or table, so nothing is added to the definer allowlist. Persona test `tests/integration/credits-every-craft.test.ts` (4: the person's list, the press kit, the public page, and that a pending member and a private project show nothing). Passes on a fresh local reset; snapshot regenerated (2,810 lines, the function bodies changed).

**To do after merge:** apply `20261115000200` to production, then staging, then the drift check. **Left:** BACKLOG 3.51 (outside roles need the owner's decision on what each sees).
