# Session — 2026-11-15: the phone tab bar and the keyboard (BACKLOG 3.41)

The plan (`plans/2026-11-07-phone-experience.md`) lists "a tab bar that rides the keyboard" but never says whether the bar sits on top of the keyboard or leaves. Decision: it steps aside while typing, the way the island does. The pill already slid away from `usePhoneLayout().typing` (the real keyboard, measured through `visualViewport`); what was missing was that the hidden pill stayed in the tab order and the accessibility tree, and that it did not clear the home indicator or respect reduced motion.

- `MobileTabBar`: while the keyboard is up the `nav` is `inert` and `aria-hidden`, with `data-keyboard="up|down"`; both go when the keyboard closes.
- `mobile.module.css`: the hidden offset adds `env(safe-area-inset-bottom)` so the pill is fully off screen; no transition under `prefers-reduced-motion`.
- No new hook: it reads the existing `usePhoneLayout`.
- `MobileTabBar.test.tsx` (hook mocked): keyboard down, keyboard up, and the return.

**Unverified: a real iPhone pass is still needed.** Chromium cannot show iOS's keyboard, toolbar collapse or safe-area insets; nothing here has been seen on a device, and a browser spec for the pill under a faked `visualViewport` is still left.
