// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { MAX_VOICE_PARTICIPANTS } from './mesh';

// A stand-in for Supabase Realtime: one shared presence table per channel name,
// with the join/sync events delivered the way the real client delivers them.
type Meta = { joinedAt?: number; name?: string };
const presence = new Map<string, Meta>();
const handlers: Record<string, () => void> = {};
const removed: string[] = [];
const sent: Array<{ event: string; payload: { to: string } }> = [];
/** Runs once our own `track` has landed: lets a test add people in the same instant. */
let onTracked: (() => void) | null = null;

function state() {
  return Object.fromEntries([...presence].map(([k, v]) => [k, [v]]));
}

const fakeChannel = {
  on(type: string, filter: { event: string }, cb: () => void) { if (type === 'presence') handlers[filter.event] = cb; return fakeChannel; },
  subscribe(cb: (s: string) => Promise<void>) { void Promise.resolve().then(() => cb('SUBSCRIBED')); return fakeChannel; },
  presenceState: () => state(),
  async track(meta: Meta & { id: string }) {
    presence.set(meta.id, meta);
    onTracked?.();
    handlers.sync?.();
  },
  send(msg: { event: string; payload: { to: string } }) { sent.push(msg); },
};

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    channel: () => fakeChannel,
    removeChannel: (c: unknown) => { removed.push(c === fakeChannel ? 'voice' : '?'); },
  },
}));

const connections: Array<{ closed: boolean }> = [];
class FakePeerConnection {
  connectionState = 'new';
  closed = false;
  constructor() { connections.push(this); }
  addTrack() {}
  async createOffer() { return { type: 'offer', sdp: 'x' }; }
  async setLocalDescription() {}
  close() { this.closed = true; }
}

const trackStops: number[] = [];

import { useVoiceRoom } from './voice';

const me = { id: 'me', name: 'Me' };
const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)); });

function seed(n: number) {
  for (let i = 0; i < n; i++) presence.set(`peer${i}`, { joinedAt: 1000 + i, name: `Peer ${i}` });
}

beforeEach(() => {
  presence.clear(); removed.length = 0; sent.length = 0; connections.length = 0; trackStops.length = 0;
  onTracked = null;
  for (const k of Object.keys(handlers)) delete handlers[k];
  vi.stubGlobal('RTCPeerConnection', FakePeerConnection);
  vi.stubGlobal('RTCSessionDescription', class { constructor(public init: unknown) {} });
  vi.stubGlobal('RTCIceCandidate', class { constructor(public init: unknown) {} });
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: async () => ({ getTracks: () => [{ stop: () => trackStops.push(1) }], getAudioTracks: () => [] }) },
  });
});

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('useVoiceRoom — full mesh limit', () => {
  it('lets the 8th person in and connects to the seven others', async () => {
    seed(MAX_VOICE_PARTICIPANTS - 1);
    const onFull = vi.fn();
    const { result } = renderHook(() => useVoiceRoom('room', me, true, onFull));
    await flush();
    expect(onFull).not.toHaveBeenCalled();
    expect(result.current.live).toBe(true);
    expect(connections).toHaveLength(MAX_VOICE_PARTICIPANTS - 1);
    expect(sent.filter(m => m.event === 'rtc_offer')).toHaveLength(MAX_VOICE_PARTICIPANTS - 1);
  });

  it('turns the 9th person away before opening any connection, and lets go of the mic and channel', async () => {
    seed(MAX_VOICE_PARTICIPANTS);
    const onFull = vi.fn();
    const { result } = renderHook(() => useVoiceRoom('room', me, true, onFull));
    await flush();
    expect(onFull).toHaveBeenCalledTimes(1);
    expect(result.current.live).toBe(false);
    expect(connections).toHaveLength(0);
    expect(sent).toHaveLength(0);
    expect(presence.has('me')).toBe(false);
    expect(removed).toEqual(['voice']);
    expect(trackStops.length).toBeGreaterThan(0);
  });

  it('tears the session down even when the caller keeps `joined` true', async () => {
    seed(MAX_VOICE_PARTICIPANTS);
    const { result } = renderHook(() => useVoiceRoom('room', me, true, () => {}));
    await flush();
    expect(removed).toEqual(['voice']);
    expect(result.current.peers).toEqual([]);
  });

  it('settles a same-instant race: two people see seven others, only the earlier keeps the seat', async () => {
    seed(MAX_VOICE_PARTICIPANTS - 1);
    // Another newcomer, who joined a moment before us, lands as ours is published.
    onTracked = () => presence.set('rival', { joinedAt: 1, name: 'Rival' });
    const onFull = vi.fn();
    const { result } = renderHook(() => useVoiceRoom('room', me, true, onFull));
    await flush();
    expect(onFull).toHaveBeenCalledTimes(1);
    expect(result.current.live).toBe(false);
    expect(connections).toHaveLength(0);
  });

  it('keeps the seat when we were the earlier of the two', async () => {
    seed(MAX_VOICE_PARTICIPANTS - 1);
    onTracked = () => presence.set('rival', { joinedAt: Date.now() + 60_000, name: 'Rival' });
    const onFull = vi.fn();
    const { result } = renderHook(() => useVoiceRoom('room', me, true, onFull));
    await flush();
    expect(onFull).not.toHaveBeenCalled();
    expect(result.current.live).toBe(true);
    // The rival holds no seat, so no offer goes to them.
    expect(sent.some(m => m.payload.to === 'rival')).toBe(false);
  });

  it('leaves when presence later shows we lost the seat', async () => {
    seed(MAX_VOICE_PARTICIPANTS - 1);
    const onFull = vi.fn();
    const { result } = renderHook(() => useVoiceRoom('room', me, true, onFull));
    await flush();
    expect(result.current.live).toBe(true);
    await act(async () => { presence.set('early', { joinedAt: 1 }); handlers.sync?.(); });
    expect(onFull).toHaveBeenCalledTimes(1);
    expect(result.current.live).toBe(false);
    expect(removed).toEqual(['voice']);
  });
});
