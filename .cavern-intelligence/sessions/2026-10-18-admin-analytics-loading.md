# Session — 2026-10-18: admin analytics — skeleton loading and a 5-minute cache

**Changed:** `/admin/analytics` shows a shimmer block (the global `.skeleton`) in place of the figures' "..." while a range loads, and the range buttons carry `aria-busy`. Both loads (`getPlatformStats`, `admin_platform_analytics` per range) go through the new `lib/hooks/ttlCache.ts` (`cached(key, ttl, load)`): a success is reused for 5 minutes, callers asking for the same key while it loads share one request, and **a failure is never kept** — it rejects every sharer, then the next call retries (so `useLoad`'s `error` shows as before; no automatic retry loop, no backoff — a retry happens only when the person switches range or reloads). `swr` is not a dependency, so this is a ~40-line module instead of a new package. The `rangeStart` date maths is one helper. The cache is per tab, in module memory, holding admin-only aggregates; it dies with the tab and is not shared across sign-ins in the same tab load — **a sign-out/sign-in as another admin without a page reload would reuse the 5-minute-old answer, which is the same admin-only data.**

**Tests:** `lib/hooks/ttlCache.test.ts` — ttl hit/expiry, key isolation, concurrent sharing, failure not kept (sharers rejected, retry succeeds, one call), failure leaves other keys alone, `clearCache`.

**Not verified:** the worktree had no `node_modules` and `npm ci` needed approval, so typecheck, lint, unit tests and build were **not run** — run them before merging. No e2e or visual check of the skeleton.

**Open:** a Reload button on the page would need `clearCache` for its keys (none exists today; the page says data is reused for up to 5 minutes).
