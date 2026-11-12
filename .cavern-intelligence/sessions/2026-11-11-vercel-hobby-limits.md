# Session - 2026-11-11: Vercel's Hobby limits, and production left behind

**What went wrong:** the Vercel project (Hobby) exceeded its free-tier usage —
Functions Storage peaked over the 10 GB cap, and the 100-deployments/day rate
limit tripped. Vercel paused the project and blocked deploys. The 2026-11-09
production deploy of `main` failed (`Deployment rate limited — retry in 24
hours`) and was never retried, so production kept serving #524 while `main`
moved to #534 (10 commits). Nothing in the storage chart alone showed this.

**Diagnosed:** the project API's `live: false` (set when paused; it does not
always recover), the newest `target: "production"` deployment (`01305567`,
#524) against `origin/main` (`8ec6c9c5`, #534), and the production URL's
`etag` + Next.js build ID matching the #524 deployment. Supabase was probed
directly (auth health, PostgREST, the schema cache) and is healthy — it was
never the problem; the pause was Vercel's.

**Fixed:** a temporary deploy hook for `main` (`vercel deploy-hooks create …
--git-branch main`, POST the URL, then `delete --yes`) triggered a git-linked
production redeploy. New deployment `dpl_JC32hwpCShWg3xrqWYMGjjD5LZXr`, Ready,
aliased to the production domain; production's `etag`/build ID changed and the
post-#529 frosted theme code is live; the GitHub status on `main`'s head is
success; no runtime errors in the following 10 minutes. Six 30-day-old
**Blocked** preview deployments were removed.

**Left:** the Hobby limits are structural to the multi-agent workflow (tens of
deployments a day). Storage now self-heals via retention; the 100/day rate
limit will keep blocking production deploys on heavy days. Levers: fewer
pushes per PR, a broader `vercel.json` `ignoreCommand`, or Pro (BACKLOG §1).
Also: `vercel.json`'s `ignoreCommand` inspects only the tip commit, so a batched
push ending in a docs commit skips the build and leaves a stale preview.
