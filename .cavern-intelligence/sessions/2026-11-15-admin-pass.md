# Session - 2026-11-15: the admin area, made findable and checked (BACKLOG 3.14)

**The owner asked** how to get into admin ("it's hidden") and whether it works. Honest answer found by looking: there was no link to `/admin` anywhere in the app (only by typing it), and only Crafts, Formats, Channel suggestions and Reports had browser tests.

**Checked (real browser, local stack):** `e2e/admin-sweep.spec.ts` opens all 12 admin screens as an admin (heading present, no page error, no console error, axe clean) and shows a member turned away from every one. `e2e/admin-actions.spec.ts` drives the real actions: grant and remove admin rights, suspend a person (they cannot sign in until it is lifted) and lift it, the audit log written; clear a reported error; a hub post kept as a draft (a member cannot see it), published, then read by the member; the admin home links to every screen; the entry points are shown to an admin and not to a member. The existing admin specs (crafts, formats, channel suggestions, reports) still pass.

**Found and fixed:** an admin's own row on `/admin/users` offered **Remove admin**, which the database always refuses ("You can't remove your own admin rights"). The button is disabled on your own row, with the reason as its title.

**Built:** **Settings › Admin › Open admin** and **Open Admin** in the search (Ctrl/⌘ K), both shown to admins only (the server still decides); the island's admin links now cover the eight most used screens (its deck has eight keys); a unit test keeps the admin home page linking every admin screen so a new screen cannot be hidden again. No migration.

**Not covered by a browser:** support cases and the analytics numbers (database tests exist for support). **How to make an admin:** only an existing admin, from `/admin/users`.
