# Phone text boxes stop hunting up and down — Nov 26, 2026

Owner, on his phone: tapping text boxes "keeps moving up and down — usually
horizontal." Two mechanisms compound, both worst in landscape:

1. iOS zooms into any focused field set under 16px and back out on blur — most
   of the suite's fields are 12–14px, so every tap lurched the page.
2. PhoneKeyboard re-revealed the focused field on every visualViewport resize.
   The keyboard's rise fires a run of resizes, each with a different visible
   height, so the reveal scrolled against a moving target — and in landscape
   the visible strip is so short it never settled.

Fixes:
- `app/globals.css`: on phones (the suite's phone media shape), every form
  control sits at 16px, `!important` so inline sizes are covered too — the
  size Safari never zooms past. Desktops untouched. This is the app-wide floor
  the owner was weighing; his bug report settled it for phones.
- `components/phone/PhoneKeyboard.tsx`: the resize path now waits until the
  visible height has held still across a 200 ms beat before revealing
  (armSettle); focus behaviour unchanged.
- `lib/os/global-css-guard.test.ts`: pins the 16px floor rule.

Verified locally: typecheck clean, eslint clean (0 errors), guard + phone
suites 16/16. Not verified: the feel on a real phone in landscape — the
owner's tap-through after deploy is the check.
