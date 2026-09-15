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
To support sensitive production announcements, channel visibility is secured based on project scopes and private rosters.

| Channel Type | Visibility Rule | Posting Rule |
| :--- | :--- | :--- |
| **Global / Community** | All authenticated users. | Determined by `post_policy` config. |
| **Public Project Channel** | Any confirmed crew member in `project_crew` or the project creator. | Restrictable to Project Managers via `post_policy = 'managers'`. |
| **Private Project Channel** | Explicitly restricted to profiles listed inside the `channel_members` roster. | Only roster members with `can_post = true`. |

Permissions are evaluated dynamically on both the server (via `can_view_channel` / `can_post_channel` security helper functions) and client (via `lib/permissions/usePermissions.ts`).
