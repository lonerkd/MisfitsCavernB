# Session - 2026-11-17: switch the island's states on and off (owner: "full customization and settings")

Settings › Appearance gains five switches under Island size: brief notices, page controls, running things, Caps Lock keys, and the dot while typing (`lib/island/prefs.ts`). A state that is off never becomes the island's shape (`applyIslandPrefs` runs before `islandMode`); the island itself, its menu and anything the person opens by hand are untouched. **Per device** (localStorage, like the island's size), so a phone and a desk can differ; no migration. Unit-tested (`prefs.test.ts`).

**Not verified:** in a browser. **Left (owner's list):** account-level prefs (needs a `set_my_ui_prefs` migration) if the choice should follow the person; switches for features beyond the island; deeper tool integration (3.18, 3.47).
