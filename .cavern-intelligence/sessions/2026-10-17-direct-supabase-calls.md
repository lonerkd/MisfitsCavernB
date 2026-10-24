# Session — 2026-10-17: the last direct `supabase.from(…)` calls in `app/` move into `lib/supabase/`

**Found:** the order said ~30 direct calls in `app/` and `components/`; a scan found three call sites left (`components/` had none): the portfolio link preview (`app/(public)/p/[token]/page.tsx`) and two in the Discord bridge (`app/api/discord/notify/route.ts`: channel visibility, webhook URL, sender name). `lib/os/*` still has direct reads (`queries.ts`, `boot.ts`, `actions.ts`, `sync.ts`) — outside this order's scope, noted in BACKLOG.

**Changed:** `lib/supabase/public.ts` gains `getPortfolioPreview(db, token)` (typed; `portfolio_media` is always an array, `profiles` is one object or null — the page's two casts are gone). New `lib/supabase/discord.ts`: `canSeeChannel(asUser, id)` (RLS decides, user's token — unchanged), `getChannelWebhookUrl(admin, id)`, `getUsername(admin, id)` (service role — unchanged). The route passes the same clients as before, so the access checks are the same ones; the 403 / `bridged: false` / sender-name fallback paths are unchanged. Both clients are now `createClient<Database>`.

**Tests added:** `lib/supabase/discord.test.ts`, `lib/supabase/public.test.ts` (what is asked, error → null/false, shape).

**Not verified:** typecheck, lint, test and build were **not run** — `npm ci` was refused in this sandbox (no `node_modules`), so none of the code above has been compiled or executed. `database.types.ts` was not regenerated (no schema change; main's types were regenerated in #232). Run the four commands before merging.
