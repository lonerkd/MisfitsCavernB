# Session — 2026-10-27: definer allowlist reconciled with advisor output

**Why:** BACKLOG item 3.30 tracked a mismatch between the security advisor's callable `SECURITY DEFINER` list and `database-and-security.md` §2.D.

**Verified now (local stack):**
- `npx supabase db advisors --local` returns **No issues found**.
- Querying callable `SECURITY DEFINER` functions in `public` for `anon`/`authenticated` returns the current callable set.
- Every callable function name in that set is already present in `database-and-security.md` §2.D (0 missing by direct check).

**Result:** backlog item 3.30 removed as complete.
