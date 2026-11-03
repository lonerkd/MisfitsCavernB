# Session — 2026-11-02: the same key for the same thing on every page

The deck's keys were handed out by position, so Q meant a different action on every page (the coverage reference proved it). An action can now name a **slot** (`lib/island/slots.ts`: create Q, jump W, find E, view R, share T, people Y, note U, live I) and then has that key wherever it appears; unslotted controls fill the keys no slot claimed. `assignKeys` does it, the deck (`EcosystemTaskbar`) uses it for the key hints, the key presses and the hint line, and the generated coverage reference (`island-coverage.md`) shows the resulting keys. Nine existing actions are tagged: Create on Jobs, Projects and the production manager; Find on the editor and the Lounge; View on the Studio's next tab and the Lounge's pinned; Jump in the editor's centre views; People on the crew boards.

**Behaviour that changed:** under Caps Lock the editor's Find is now E (was W), the Lounge's search E (was Q), the Studio's next tab R (was Q), and so on; `e2e/island.spec.ts` now presses E for the Lounge search.

**Verified:** unit tests for `assignKeys` and for the reference (slots, `as const`, conditional); the island and chord browser specs (4 pass); typecheck, lint, the full unit suite. No migration.

**Left:** actions for Share, Note and Live; O/P with the suite-wide undo; the areas with no stage; the Studio's views (BACKLOG 4.1).
