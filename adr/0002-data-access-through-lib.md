# 0002. All data access through `lib/`, enforced by lint

- Status: Accepted
- Date: 2026-10-07

## Context

Pages and components called `supabase.from(...)` inline — sometimes across
several lines, sometimes swallowing errors into zeros and empty lists. The
same table was read a dozen different ways; silent query failures were a
recurring bug class (a pitch board that "made a second board", a call sheet
that hung on its skeleton, an applicant count of zero). Documentation alone
had not stopped the pattern.

## Decision

Every page and component reads and writes through typed functions in
`lib/supabase/*` (one module per table group), and an ESLint rule **fails the
build** on `supabase.from(` in `app/` and `components/`. The rule catches
calls split across lines and ignores `supabase.storage.from(`. Server routes
keep their own per-request clients (service-role or acting-as-caller) and are
outside the rule. Failed queries report themselves through `useToast()` —
silently returning zeros is a bug.

## Consequences

- New queries land in `lib/` by default; the lint error teaches the rule at
  the moment it matters.
- One place per table group to audit, test and add timeouts.
- The initial sweep moved ~90 call sites; one deliberate exception remained
  (`app/auth/callback`, until the password-recovery work touched it too) —
  the rule's done-state is **no exceptions**.
- Data-shape changes run `npm run db:types` once, then fix type errors where
  they actually surface.
