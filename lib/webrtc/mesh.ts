// A voice room is a full mesh: every person holds one RTCPeerConnection per
// other person, so uplink and CPU grow with the square of the room. Past
// about eight people it needs an SFU (BACKLOG 3.24); until then the room says
// "full" instead of degrading everyone's audio.

export const MAX_VOICE_PARTICIPANTS = 8;

export const VOICE_ROOM_FULL_MESSAGE = `This voice room is full (${MAX_VOICE_PARTICIPANTS} people). Try again when someone leaves.`;

/** What each person publishes to the room's presence (`joinedAt` is their clock). */
export type VoicePresenceState = Record<string, Array<{ joinedAt?: number }>>;

/** Is there a seat for one more, given how many others are already here? */
export function canJoinVoiceRoom(others: number): boolean {
  return others < MAX_VOICE_PARTICIPANTS;
}

/**
 * The people who hold a seat: the earliest `MAX_VOICE_PARTICIPANTS` by join
 * time, ties broken by id. Everyone computes the same list from the same
 * presence, so when two people join in the same instant (each saw seven others
 * and both passed the first check) exactly one of them loses the seat.
 */
export function seatedIds(state: VoicePresenceState): string[] {
  return Object.entries(state)
    .map(([id, metas]) => ({ id, at: metas[0]?.joinedAt ?? 0 }))
    .sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, MAX_VOICE_PARTICIPANTS)
    .map(p => p.id);
}

/** Does `id` hold a seat? Someone not in the presence yet holds one only if there is room. */
export function holdsSeat(state: VoicePresenceState, id: string): boolean {
  if (id in state) return seatedIds(state).includes(id);
  return canJoinVoiceRoom(Object.keys(state).length);
}
