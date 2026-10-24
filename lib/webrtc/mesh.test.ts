import { describe, expect, it } from 'vitest';
import { MAX_VOICE_PARTICIPANTS, canJoinVoiceRoom, holdsSeat, seatedIds, type VoicePresenceState } from './mesh';

function room(n: number, at = (i: number) => i): VoicePresenceState {
  return Object.fromEntries(Array.from({ length: n }, (_, i) => [`u${i}`, [{ joinedAt: at(i) }]]));
}

describe('voice room seats', () => {
  it('lets the 8th in and turns the 9th away', () => {
    expect(canJoinVoiceRoom(MAX_VOICE_PARTICIPANTS - 1)).toBe(true);
    expect(canJoinVoiceRoom(MAX_VOICE_PARTICIPANTS)).toBe(false);
  });

  it('seats the earliest eight; the ninth to arrive has no seat', () => {
    const state = room(9);
    expect(seatedIds(state)).toHaveLength(MAX_VOICE_PARTICIPANTS);
    expect(holdsSeat(state, 'u7')).toBe(true);
    expect(holdsSeat(state, 'u8')).toBe(false);
  });

  it('breaks a same-instant tie by id, the same way for everyone', () => {
    const state = room(9, () => 1000);
    expect(holdsSeat(state, 'u8')).toBe(false);
    expect(holdsSeat(state, 'u0')).toBe(true);
  });

  it('treats someone not yet in presence as seated only if there is room', () => {
    expect(holdsSeat(room(7), 'late')).toBe(true);
    expect(holdsSeat(room(8), 'late')).toBe(false);
  });

  it('treats a client that publishes no join time as the oldest', () => {
    const state: VoicePresenceState = { ...room(8, i => 100 + i), legacy: [{}] };
    expect(holdsSeat(state, 'legacy')).toBe(true);
    expect(holdsSeat(state, 'u7')).toBe(false);
  });
});
