# 0003. Installable PWA first, App Store wrapper later

- Status: Accepted
- Date: 2026-10-06

## Context

The owner wants The Cavern on an iPhone for sure: on set, offline, with call
sheets arriving as notifications. Two routes were on the table — an installable
web app (PWA) or an App Store app (native shell). Much of the PWA already
existed: manifest, service worker with an offline shell, `appleWebApp`
metadata, the icon set, and the on-set offline cache. The App Store route
costs an Apple Developer account ($99/yr), App Review, a release process, and
**Sign in with Apple** (because the app signs in with Discord) — none of which
the PWA needs.

## Decision

**PWA first**; a native App Store wrapper (Capacitor) only after the PWA
proves the workflow. iOS-specific work happens in that order: launch screens
and "Share → Add to Home Screen" coaching (iOS has no install prompt), then
Web Push (iOS 16.4+, installed web apps only). Every deploy ships with the
app — no release train.

## Consequences

- Ships with every deploy; no App Review queue for features or fixes.
- Push requires the app to be **installed** on iOS — the UI says so and
  coaches the install instead of failing silently.
- iOS ignores manifest `shortcuts` and `share_target`; don't design for them.
- Deferred cost: if the App Store leg is taken later, it needs the Apple
  Developer account, Sign in with Apple, and a wrapper build pipeline —
  recorded here so it stays a choice, not a surprise.
