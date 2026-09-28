# The Lounge — Communication Architecture

## 1. Discord-Class Chat Infrastructure
The Lounge represents a real-time chat space integrated directly into film projects.

- **Message Threading:** Messages support deep branching threads via `parent_message_id`. Sub-replies are queried separately, preventing clutter in the main channel stream.
- **Rich Reactions:** Users can add emoji reactions. Reactions are written inside a JSONB field (`messages.reactions`) structured as `{"🔥": ["user-uuid-1", "user-uuid-2"]}`.
- **Reaction Security:** To prevent unauthorized mutation, reactions are updated exclusively via the PostgreSQL Security Definer RPC function `public.toggle_message_reaction(message_id, emoji)`. The function verifies the caller can read the target message before altering the JSON array.
- **Discord Webhook Bridge:** Users can link a channel to Discord via the `discord_integrations` table. To protect webhook secrecy, the table has **no select policy** for browsers; the server-side API route `/api/discord/notify` uses the Supabase Service Role key to securely fetch webhook targets and dispatch notifications when messages are posted.

---

## 2. Peer-to-Peer WebRTC Audio Mesh
The Lounge features decentralized peer-to-peer voice rooms, providing crew communication without incurring expensive external server signaling/routing costs.

### Peer Mesh Pipeline (`lib/webrtc/voice.ts`)
- **No SFU (Selective Forwarding Unit) Server:** The architecture is built as a **full mesh network**. Every user opens a direct WebRTC peer connection (`RTCPeerConnection`) with every other user in the channel.
- **Scalability:** Full mesh scales perfectly for typical indie film crew sizes (2 to 8 concurrent speakers) and runs entirely inside the users' browsers.
- **Signaling Channel:** Peer-to-peer connection initiation, SDP offers, answers, and ICE candidates are exchanged using Supabase Realtime broadcast events.
- **The Newcomer Initiation Rule:** To prevent race conditions during negotiation:
  > **Rule:** Only the *newcomer* who joins the room is responsible for dispatching WebRTC connection offers (`createOffer`) to all pre-existing peers (discovered via Supabase Realtime Presence). The pre-existing peers respond with answers (`createAnswer`). This ensures exactly one side of each voice pair initiates connection.

---

## 3. Lounge Permissions Matrix
A channel's **audience** (`channels.audience`) says who can see it; `post_policy`
says who can post among them; `is_private` narrows it to an invite roster.
Server: `internal.can_view_channel` → `internal.in_project_audience`,
`can_post_channel`, `can_manage_channel`. Client labels/grouping:
`lib/lounge/audience.ts`.

| Scope | Audience | Who sees it |
| :--- | :--- | :--- |
| Community (no project) | `users` | Everyone signed in |
| Community | `admins` | Admins (`profiles.is_admin`) |
| Project | `team` | The creator and all crew (project not private) |
| Project | `owners` | The creator and `lead` crew |
| Project | `above` / `below` | Owners + crew whose craft is (not) `crafts.above_the_line` |
| Project | `guests` | Owners + crew with role `viewer` |
| Project | `public` | Anyone signed in (read; default post policy: managers) |

- **Private** (any scope): roster members, plus the project creator (project)
  or admins (community).
- **Guides** (`type = 'guide'`): read-only articles; only `can_manage_channel`
  may post. Rendered as sections (first line = heading).
- **Who runs a channel**: project creator; for community channels its creator
  or any admin; roster members with `can_manage`.
- **Creating**: project channels — creator or crew; community — admins only.
- **Messages** can be deleted by their sender or whoever runs the channel.
