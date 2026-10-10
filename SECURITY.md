# Security Policy

## Supported versions

The Cavern is deployed continuously from `main`. Security fixes are applied
to `main` and deployed; there are no long-lived release branches to patch.

| Version | Supported |
| --- | --- |
| `main` (production) | ✅ |
| older commits / forks | ❌ |

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Report privately, either way you prefer:

1. **GitHub Security Advisories** — the repository's *Security* tab →
   *Report a vulnerability* (preferred: keeps the report and its fix in one
   place, with a disclosure timeline).
2. **Email** — `peterolowude@icloud.com` (the contact published at
   `/privacy`), with the subject line `SECURITY:`.

Include, when you can: what happened, what an attacker could do, the steps to
reproduce, and any relevant URLs or screenshots. We will acknowledge receipt
within a few days, keep you informed as it progresses, and credit you in the
fix unless you prefer not to be named. Please give a reasonable time to fix
and publish before disclosing publicly.

## Scope

In scope: the application in this repository (`app/`, `components/`, `lib/`,
`supabase/` migrations and policies), the deployed site, and its API routes.

Out of scope, by design: third-party services the app talks to (Supabase,
Vercel, Discord, Spotify — report to them), social engineering of staff or
users, denial-of-service against the hosting platform, and vulnerabilities in
dependencies with an upstream fix already released (we track these through
Dependabot and `npm audit`).

## What we ask of researchers

- Do not access or modify data that is not yours (the test personas in
  `AGENTS.md` — Sam, Jordan, Riley — describe the intended access levels).
- Do not run destructive automated scans or degrade the service for others.
- Give us a chance to fix the issue before public disclosure.
