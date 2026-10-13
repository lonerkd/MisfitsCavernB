# Session — 2026-10-13: the Discord invite

The landing page shows **Join the Discord** when `NEXT_PUBLIC_DISCORD_INVITE_URL` is set to a real Discord invite (`lib/community/discord.ts`; anything that is not an https discord.gg / discord.com/invite link — unset, a typo, a webhook URL — shows nothing). `.env.example` documents it.

**Secrets:** the owner pasted a bot token and a webhook URL into the chat. They are **not** in the repo and nothing reads them: the app has no bot, and a channel's webhook is entered in the Lounge (Manage channel) and stored server-side only. Both should be treated as exposed and rotated (Discord Developer Portal › Bot › Reset Token; delete and recreate the webhook).

**Owner action:** set `NEXT_PUBLIC_DISCORD_INVITE_URL=https://discord.gg/GRZ9qk68uN` in Vercel (Settings › Environment Variables, Production and Preview) and redeploy; this session's Vercel connection is read-only (403 on writes).

**Verified:** typecheck, eslint, 2 unit tests; a production build with the variable set renders the link; without it, nothing. **Not verified:** CI (billing).
