# View-as: only when you need it

Owner, Nov 27, 2026: keep view-as, but "make it only when u need
it — it shouldn't just be globally at the top of the screen unless
you're the one setting it up." He also asked what crew see (they
never see the switch or the banner — it is owner-only, and their
screens are simply filtered by their real capabilities) and whether
the outsider preview is just an empty screen (yes, deliberately:
the same "This page doesn't exist" an outsider with no link gets —
no title, no crew, no files; a share link is the separate public
door).

## What was wrong

The preview banner was a sticky yellow bar at the top of the hub,
the Studio, the Lounge and call pages. It was load-bearing, which
is why it followed the owner everywhere: the switch itself sits
inside the owner-gated office section, so while previewing as crew
the switch vanished — the bar's "Back to me" was the only exit.

## The change

- The banner is now an inline, warn-tinted notice (no sticky bar,
  no solid yellow) that renders only while previewing.
- On the project page it sits directly under the ViewAsSwitch in a
  block gated on the **real** owner (`project.isOwner`), not the
  previewed view — so the control that starts a preview is the same
  place that shows it and ends it, and previewing can no longer
  hide it.
- Studio, Lounge and Call no longer render the banner at all.
- The outsider screen keeps its own banner: it replaces the whole
  page, so its exit has to be on it.
- `e2e/view-as-role.spec.ts`: the exit now goes through the project
  page, where the control lives; the banner assertions on the
  project page stand as they were.

Pins: `components/projects/view-as-placement.test.ts`.
