# Session - 2026-11-15: guides for the YouTube, article and game project types (BACKLOG 3.51 item 2)

**The gap:** the three project types added earlier today (YouTube, Blog / Newsletter, Video Game) had no guide, so they fell back to the short-film one, with casting and festivals.

**Built (no migration):** three workflows in `lib/guides/workflows.ts` made from existing steps with the words tuned to the format (a YouTube video: hook, script, small shoot, edit, thumbnail, upload; an article: pitch, outline, draft, edit, publish; a game: concept, characters, script with choices, notes, music, release), and `pickWorkflow` chooses them from the project type. Unit test for the choice; every step id was checked against the step library.

**Not done:** a publishing step to a channel or CMS; steps specific to a game (build, playtest) rather than reused ones.
