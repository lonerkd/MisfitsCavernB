# 2026-11-22 — more demo projects for the owner's two accounts (not yet applied to production)

Owner's ask: update my two profiles and their mock projects for all the tools, at different stages, states and people. Done by extending the existing demo seed, not a parallel one.

- **Builder** (`scripts/demo/build.ts`): `--username` (find the account by profile username, so no email is in the SQL), `--seed`, `--set`; a project's optional `set`. The old email form generates identical SQL apart from one header comment (diffed).
- **Content** (written by two Haiku agents against a spec, then fixed by the lead engineer): `content-more.ts` (6 new sample people, 11 projects: documentary in post, commercial in pre-production, an advertising project deliberately over budget, a YouTube series with every tool unlocked, a feature with a live call sheet today, an archived completed feature, an almost-empty new project, and two owned by others where the account is crew or a viewer) and `content-thekid.ts` (4 people, 8 projects: a podcast, a music video, a short, a documentary, a commercial, and three where the account is crew). `all.ts` merges the sets.
- **`validate.ts`** (`npm run demo:validate`): checks crafts, job roles, brief answers and post departments against the database. The agents' first drafts had 20-odd values the database rejects (crafts, tones, platforms, a department, call rows with both a person and a character, two clashing persona keys), all fixed; checked against production's own lists (read-only), which match the local ones.

**Rehearsed** on throwaway local accounts: `more` applies cleanly, three runs leave 9 owned projects and 9 distinct titles; `thekid` applies cleanly, two runs leave 5 owned and 3 crew placements; the Advertising project's seeded spending fired the over-budget alert for its owner; the projects page shows the stage groups with next steps, task progress and crew.

**Not done:** the production apply (the account profiles are `loner` and `thekid`; generate with `--username <name> --set <set> --seed <name>` and apply once the owner says go). The owner's real projects and profile text are not touched; adding records to a real project (the "breadth into my actual projects" part of the ask) needs the owner to name the project and the tools.

**Verified:** `tsc`, eslint on the new script, `npm run demo:validate` (19 people, 28 projects) against the local database, the two applies above. **Not verified:** how every one of the 19 new projects looks in each tool in a browser (only the projects list was looked at); the SQL on production.
