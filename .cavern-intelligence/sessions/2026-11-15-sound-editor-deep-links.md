# Session - 2026-11-15: Sound and the editor link to each other (BACKLOG 3.42)

**The gap:** from the Sound page a scene or a track tagged to a scene was a dead end, and the editor's Sound panel could not take a person back to the right tab.

**Built (no migration):** the editor already opens a scene from `/editor?script=<id>&scene=<id>`, so that format is reused (`editorSceneHref`, `lib/audio/links.ts`). The Scenes timeline's scene detail has "Open in the script"; a Library track tagged to a scene has the same link (`listSceneChoices` now also returns each scene's `script_id`). `/soundtrack?tab=search|scenes|library` opens that tab (an unknown value falls back; following another such link while on the page switches the tab; the page is wrapped in Suspense for `useSearchParams`). The editor's Sound panel gains "Open in Sound" (to the Scenes tab).

**Tests:** `lib/audio/links.test.ts`; link cases in `SceneTimeline.test.tsx`, `SoundLibrary.test.tsx`, `SoundPanel.test.tsx`. **Not verified:** clicking the links in a real browser (the editor's `?scene=` handling is existing and unchanged); the page's `?tab=` handling has no component test (it needs the whole page mocked).
