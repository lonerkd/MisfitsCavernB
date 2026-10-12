# Session — 2026-10-12: the Lounge page, thinning 1 (restructure phase 7)

`app/(suite)/lounge/page.tsx` 1,498 → 923 lines. The six components that lived in the page moved to `components/lounge/`: `ProductionFeed`, `MessageParts` (`MessageBubble`, `GuideSections`, the reaction choices), `VoiceRoom`, `ChannelModals` (`NewChannelModal`, `ManageChannelModal`) and the shared `Message` type. Moves only (imports computed from what each file uses); no behaviour change.

**Verified:** typecheck, eslint, 944 unit tests; the lounge and community specs pass on a real build. The accessibility spec failed once on `/studio?tab=post` — axe caught text mid fade-in on a page this change does not touch (a timing flake; the Lounge page passed). **Not verified:** CI (billing).

**Left for phase 7:** the Lounge page's own state and handlers (~900 lines: channels, unread, DMs, threads, sending), landing (879), jobs (820), press kit.
