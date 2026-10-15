# Session — 2026-10-13: keyboard users can leave the script, and every field shows focus

**Audit (e2e/keyboard-audit.spec.ts):** the first run's "stuck focus" on the project page and profile were false alarms (the check compared labels, so two "Answer" buttons looked like one; a date field takes several Tabs). The check now compares the element itself. Real findings: (1) in the script editor Tab is a formatting key, so a keyboard could not leave the textarea and 24 of 54 controls were never reached; (2) 48 text fields, selects and textareas showed focus only by a faint border colour (their component CSS sets `outline: none`).

**Changed:** in the script, **Escape then Tab** moves to the next control (listed in the shortcuts); a global `focus-visible` ring on inputs, selects and textareas (`app/globals.css`, `!important` because several component rules turn the outline off). Audit now reports 0 findings across 30 routes.

**Not covered:** the audit tabs but does not operate controls (menus, dialogs, drag-and-drop, the island's actions); the Studio's other mouse-driven areas (stripboard drag, scene reorder) need their own keyboard paths, and Shift+Tab/arrow-key patterns are unchecked. Next for the "keyboard across every feature" goal: walk each workflow by key (create project, write, schedule, issue call sheet, chat, island/⌘K).

**Verified:** audit 0 findings (local stack, production build); unit tests; typecheck. **Not verified:** CI, screen readers, other browsers.
