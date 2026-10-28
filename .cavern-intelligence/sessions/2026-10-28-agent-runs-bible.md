# Session — 2026-10-28: the Claude issue worker also regenerates the route inventory

The worker's first real pull request (#353, the Archived badge on library cards) failed `checks` on the generated `bible/inventory.md`: its change added a flag dependency to a Studio component, which changes the route map, and the worker ran `npm run sync-intel` but not `npm run bible`. (The owner-side fix was one commit on the PR branch.) `agent-claude.yml` now allows `npm run bible` and the prompt tells the worker to run it after `sync-intel`.
