# 6 · The Lounge, voice and sound

Talking and listening. The Lounge is the crew's chat and voice — project
channels, community channels, DMs, guides. The Soundtrack is music to work to
and for the film. Engineering detail:
[`lounge-and-audio.md`](../lounge-and-audio.md).

## Screens

| | Desktop | Phone |
|---|---|---|
| `/lounge` | <img src="screens/lounge--desktop.webp" width="420"> | <img src="screens/lounge--phone.webp" width="140"> |
| `/soundtrack` | <img src="screens/soundtrack--desktop.webp" width="420"> | <img src="screens/soundtrack--phone.webp" width="140"> |

## `/lounge`

`app/(suite)/lounge/page.tsx` (layout only), `components/lounge/useLounge.ts` (state, data, Realtime, handlers), `LoungeTopBar`, `ChannelRail`, `ChatHeader`, `MessagePane`, `Composer`, `CrewList`, `ThreadPanel`, `components/lounge/LoungePanels.tsx`,
`lib/lounge/audience.ts`, `lib/webrtc/voice.ts`.

- **Left**: the active project's channels grouped by audience, community
  channels, DMs (crew list with presence and unread badges); suggested
  channels from the brief (`suggestChannels`, presets by phase).
- **Centre**: the conversation — messages, threads (`parent_message_id`),
  reactions (`toggle_message_reaction`), edit own (`edit_message`, "(edited)"),
  pin (`pin_message`), delete (sender or channel manager), typing presence.
  Guides (`type = 'guide'`) render as read-only sections.
- **Header**: topic, Pinned panel, search (`search_lounge`: word starts,
  newest 40, jumps to the message — switching project if needed), manage
  (audience, post policy, private roster, Discord webhook).
- **Voice**: a voice channel is a full-mesh WebRTC room (2–8 people);
  signalling over Realtime broadcast; the newcomer makes the offers. Speaking
  rings on avatars. A 9th person is turned away (`lib/webrtc/mesh.ts`): error
  toast and a "room is full" line, no connections opened; seats go to the
  earliest eight by join time, so a simultaneous join resolves the same way on
  every client.
- **Unread**: `lounge_reads` + `lounge_unread()`; badges on channels, DMs, the
  tab bar and the island.
- Deep links: `?channel=<id>`, `?dm=<user>` (notifications use them).
- States: no project (community + DMs only) · empty channel · read-only
  (post policy / guide) · private (roster) · offline (send fails, toast) ·
  voice connecting / connected / failed.

### Who sees what

| Scope | Audience | Who |
|---|---|---|
| Community | `users` / `admins` | everyone signed in / admins |
| Project | `team` | owner + all crew |
| Project | `owners` | owner + leads |
| Project | `above` / `below` | owners + above / below-the-line crafts |
| Project | `guests` | owners + viewers |
| Project | `public` | anyone signed in reads |

Private narrows any of these to a roster. Project channels are created by
the owner or crew; community channels by admins.

### Discord bridge

A channel can post to a Discord webhook (`discord_integrations`, never
readable by browsers). `/api/discord/notify` (Bearer token; caller must see
the channel) reads the webhook with the service role and posts;
`/api/discord/test` checks it. Webhook URLs are re-validated before every
fetch.

## `/hub` — the newsletter (Lounge overhaul L1)

`app/(suite)/hub/page.tsx`, `app/(suite)/hub/[id]/page.tsx`,
`app/(suite)/admin/hub/page.tsx`, `lib/hub/posts.ts`, `lib/hub/markdown.ts`,
`components/hub/`. Data: `hub_posts`, `hub_reads`
(`20261025000000_hub_posts.sql`).

- **What it is**: Misfits Cavern talking to everyone who uses The Cavern —
  *What's new* (updates) and *Learn* (guides), each post for everyone or one
  audience (developers, filmmakers, buyers, investors). Where sign-in lands.
- **Reading**: tabs for the two sections, audience pills (an audience page
  shows its posts plus posts for everyone), pinned first then newest, "New"
  until the post is opened. A post's body is a small markdown subset rendered
  as React elements — no HTML from a post ever reaches the page; links are
  http(s) or in-app paths only.
- **Writing** (`/admin/hub`, admins only): draft, preview, publish now or take
  back to draft, pin, mark important, delete (confirmed). Publishing an
  **important** post sends one notification to every account (type `hub`,
  always on) — and so a push to every installed phone.
- **Who sees what**: signed in — published posts; admins — drafts too; anon —
  nothing. Each person's reads are their own. Persona test:
  `tests/integration/hub.test.ts`.
- **Known gaps**: no scheduling UI (a future `published_at` works in the data);
  no image upload (cover is an https link); Status, Help and Case studies are
  slices L2–L4.

## `/soundtrack`

`app/(suite)/soundtrack/page.tsx`, `lib/spotify/*`, `GlobalAudioWidget`:
- **Moods from the script** (`lib/spotify/moods.ts`): each scene scored
  against what it describes (a chase, grief, a kiss…); scenes that share a
  mood are grouped ("Dread · scenes 3, 7, 12"), each a Spotify search.
- **Spotify**: connect (OAuth → `/auth/spotify-callback`, tokens in
  `spotify_connections`), search, play in the global widget (Web Playback).
  **Redirect addresses** (`lib/spotify/redirect.ts`): Spotify only accepts
  addresses registered *exactly* in the Spotify app's settings, over https or on
  `127.0.0.1` (not `localhost`), and the sign-in state lives in the tab that
  started it, so the person must come back to the same site. The app therefore
  connects only from the deployed site (`https://misfits-cavern-b.vercel.app`, or
  the https `NEXT_PUBLIC_APP_URL`) and from `127.0.0.1`; anywhere else (a Vercel
  preview, `localhost`) it says why in a toast instead of sending the person to
  Spotify's red "Invalid redirect URI" page. **Register** in the Spotify
  dashboard › the app › Redirect URIs:
  `https://misfits-cavern-b.vercel.app/auth/spotify-callback` and, for local
  work, `http://127.0.0.1:<port>/auth/spotify-callback`; remove any
  `http://localhost…` entry. The address sent at sign-in is kept and reused for
  the token exchange, so the two can't drift.
- **Save to the project** (`project_audio_references`) — the project's audio
  bible.
- **SFX library**: upload sounds (≤ 20 MB) to the public `sfx_library`
  bucket (`sfx_assets`), play them back.
- States: not connected · connected (Premium needed for playback) · no active
  project.

## Rules

- `messages` has no UPDATE policy: edits, pins and reactions are definer RPCs
  that check the caller first.
- `search_lounge` runs as the caller (RLS decides what's found).
- Uploads to `sfx_library` only into `<your id>/…`.

## Known gaps

- Voice is mesh: capped at 8 (the 9th is turned away); beyond that it needs an
  SFU (BACKLOG 3.24).
- Lounge DMs and messages aren't end-to-end encrypted (fine for a crew tool;
  say so in the privacy policy — it does).
