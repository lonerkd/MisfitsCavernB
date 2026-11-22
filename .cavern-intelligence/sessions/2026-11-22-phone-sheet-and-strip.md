# 2026-11-22 — phone: menu sheet swipe, spacing, pinned editor menu

## What changed
- The phone's Everything sheet closes on a swipe down from its handle or title (`components/mobile/sheetDrag.ts`, unit-tested); the page-action list has a 14px gap above the Community / Projects / Lounge tiles.
- Editor tool strip: More is pinned at the right edge outside the scroller; line up/down use arrow icons; put-keyboard-away uses a keyboard icon.
- /projects: the top New Project band is desk-only (`mc-desk-only`, under 760px) since the sheet offers + New Project.

## Verified
typecheck, lint (0 errors), vitest components/mobile lib/os; Playwright on the local stack at 390x844: new e2e/phone-sheet.spec.ts (gap >= 8px, 200px drag closes, 30px does not, no top New Project button but one in the sheet, More fully in view with the keyboard faked up) and e2e/mobile.spec.ts: 6 passed.

## Not verified
No real iPhone: touch swipe feel, the iOS keyboard and the safe areas were exercised only with Chromium mouse events and a faked visualViewport.
