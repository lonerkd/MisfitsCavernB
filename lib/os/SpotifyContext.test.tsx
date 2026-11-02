// @vitest-environment jsdom
// The Spotify provider's player lifecycle: what the suite believes is playing must never outlive the player that
// reported it (the island holds "now playing" on every page from this state).
import React, { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';

let token: string | null = 'tok-a';
vi.mock('../spotify/auth', () => ({ getValidToken: async () => token, logoutSpotify: () => {} }));

type Listener = (arg: unknown) => void;
let players: FakePlayer[] = [];
class FakePlayer {
  listeners = new Map<string, Listener>();
  disconnected = false;
  constructor() { players.push(this); }
  addListener(event: string, cb: Listener) { this.listeners.set(event, cb); }
  async connect() { return true; }
  disconnect() { this.disconnected = true; }
  emit(event: string, arg?: unknown) { this.listeners.get(event)?.(arg); }
}
const stateOf = (name: string, paused: boolean) => ({
  paused, position: 12_000, duration: 200_000,
  track_window: { current_track: { name, artists: [{ name: 'Ana Ruiz' }] } },
});

import { SpotifyProvider, useSpotify } from './SpotifyContext';

let seen: ReturnType<typeof useSpotify>;
function Probe() {
  const s = useSpotify();
  useEffect(() => { seen = s; });
  return null;
}
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

beforeEach(() => {
  token = 'tok-a';
  players = [];
  (window as unknown as { Spotify: unknown }).Spotify = { Player: FakePlayer };
});
afterEach(() => { cleanup(); delete (window as unknown as { Spotify?: unknown }).Spotify; });

describe('SpotifyProvider', () => {
  it('reports what the player says is playing', async () => {
    render(<SpotifyProvider><Probe /></SpotifyProvider>);
    await flush();
    expect(players).toHaveLength(1);
    act(() => players[0].emit('player_state_changed', stateOf('Harbor Lights', false)));
    expect(seen.currentTrack?.name).toBe('Harbor Lights');
    expect(seen.isPlaying).toBe(true);
    expect(seen.durationMs).toBe(200_000);
  });

  it('signing out leaves nothing of the old player behind: no track, not playing, no player to drive', async () => {
    render(<SpotifyProvider><Probe /></SpotifyProvider>);
    await flush();
    act(() => players[0].emit('player_state_changed', stateOf('Harbor Lights', false)));
    expect(seen.isPlaying).toBe(true);

    token = null; // signed out
    await act(async () => { window.dispatchEvent(new Event('spotify-auth-changed')); await Promise.resolve(); await Promise.resolve(); });

    expect(players[0].disconnected).toBe(true);
    expect(seen.isAuthenticated).toBe(false);
    expect(seen.currentTrack).toBeNull();
    expect(seen.isPlaying).toBe(false);
    expect(seen.progressMs).toBe(0);
    expect(seen.durationMs).toBe(0);
    expect(seen.player).toBeNull();
    expect(seen.deviceId).toBeNull();
  });

  it('another account signing in starts from nothing: the previous account\'s song is not shown before the new player reports', async () => {
    render(<SpotifyProvider><Probe /></SpotifyProvider>);
    await flush();
    act(() => players[0].emit('player_state_changed', stateOf('Old account song', false)));

    token = null;
    await act(async () => { window.dispatchEvent(new Event('spotify-auth-changed')); await Promise.resolve(); await Promise.resolve(); });
    token = 'tok-b';
    await act(async () => { window.dispatchEvent(new Event('spotify-auth-changed')); await Promise.resolve(); await Promise.resolve(); });
    await flush();

    expect(players).toHaveLength(2);
    expect(players[1]).not.toBe(players[0]);
    expect(seen.isAuthenticated).toBe(true);
    expect(seen.currentTrack).toBeNull(); // until the new player reports in
    expect(seen.isPlaying).toBe(false);
    expect(seen.player).toBe(players[1]);
  });
});
