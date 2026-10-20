# Session — 2026-10-17: validation is not the gatekeeper (parseJsonBody vs RLS)

**Added:** `tests/integration/validation-vs-rls.test.ts`. It runs bodies through the real `parseJsonBody` (`discordNotifyBodySchema`, `discordTestBodySchema`), then uses the parsed data to write as each persona. Riley (outsider) cannot post to a channel, cannot read it (so `/api/discord/notify` answers 403), cannot store a webhook; Jordan (crew, not a manager) cannot store a webhook or spoof Sam as sender; a signed-out client is refused. Each refusal is a returned `error` with no row written — nothing throws. Sam doing the same write succeeds, so the refusals are RLS, not the body.

**Not verified:** nothing was run. This worktree has no `node_modules` and Docker was not running; the sandbox would not let me install or start either. So typecheck, lint, unit tests, build and this integration test have not run. To check: `npm ci`, start Docker, `npm run db:start`, `npx vitest run -c vitest.integration.config.ts tests/integration/validation-vs-rls.test.ts`, then `npm run typecheck`, `npm run lint`.

**Not covered:** the route handlers themselves (`/api/discord/notify`) are not called end to end; the test exercises the same Supabase calls they make.
