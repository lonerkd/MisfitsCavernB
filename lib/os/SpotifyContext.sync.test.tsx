// @vitest-environment jsdom
// Music already playing on another device (the phone's Spotify app) shows up here and is driven from here, instead of the suite
// starting a second player next to it.
import React, { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';

vi.mock('../spotify/auth', () => ({ getValidToken: async () => 'tok', logoutSpotify: () => {} }));
const api = vi.hoisted(() => ({ fetchPlayback: vi.fn(), controlPlayback: vi.fn() }));
vi.mock('../spotify/playback', () => api);

type Listener = (arg: unknown) => void;
let players: FakePlayer[] = [];
class FakePlayer {
  listeners = new Map<string, Listener>();
  constructor() { players.push(this); }
  addListener(event: string, cb: Listener) { this.listeners.set(event, cb); }
  async connect() { return true; }
  disconnect() {}
  emit(event: string, arg?: unknown) { this.listeners.get(event)?.(arg); }
}
import { SpotifyProvider, useSpotify } from './SpotifyContext';

let seen: ReturnType<typeof useSpotify>;
function Probe() { const s = useSpotify(); useEffect(() => { seen = s; }); return null; }
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });

const onPhone = (over: Record<string, unknown> = {}) => ({
  ok: true,
  playback: {
    track: { id: 't', uri: 'spotify:track:t', name: 'On The Phone', artists: [{ uri: '', name: 'Ada' }], album: { uri: '', name: '', images: [] } },
    isPlaying: true, progressMs: 30_000, durationMs: 180_000,
    device: { id: 'phone1', name: 'Pixel 8', type: 'Smartphone', isActive: true, volumePercent: 40 }, ...over,
  },
});

beforeEach(() => { players = []; api.fetchPlayback.mockResolvedValue(onPhone()); api.controlPlayback.mockResolvedValue(true); vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 })); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); delete (window as unknown as { Spotify?: unknown }).Spotify; });

describe('SpotifyProvider: music playing elsewhere', () => {
  it('shows the song already playing on another device, with where it is', async () => {
    render(<SpotifyProvider><Probe /></SpotifyProvider>);
    await flush();
    expect(seen.currentTrack?.name).toBe('On The Phone');
    expect(seen.isPlaying).toBe(true);
    expect(seen.progressMs).toBe(30_000);
    expect(seen.elsewhere?.name).toBe('Pixel 8');
    expect(seen.volume).toBeCloseTo(0.4);
  });

  it('play/pause, next, previous, seek and volume drive that device', async () => {
    render(<SpotifyProvider><Probe /></SpotifyProvider>);
    await flush();
    act(() => seen.togglePlay()); await flush();
    expect(api.controlPlayback).toHaveBeenCalledWith({ kind: 'pause' }, 'phone1');
    act(() => seen.nextTrack());
    act(() => seen.prevTrack());
    act(() => seen.seek(90_000));
    act(() => seen.setVolumeLevel(0.7));
    expect(api.controlPlayback).toHaveBeenCalledWith({ kind: 'next' }, 'phone1');
    expect(api.controlPlayback).toHaveBeenCalledWith({ kind: 'previous' }, 'phone1');
    expect(api.controlPlayback).toHaveBeenCalledWith({ kind: 'seek', positionMs: 90_000 }, 'phone1');
    expect(api.controlPlayback).toHaveBeenCalledWith({ kind: 'volume', percent: 70 }, 'phone1');
  });

  it('a song chosen in the suite goes to the device that already has the music', async () => {
    render(<SpotifyProvider><Probe /></SpotifyProvider>);
    await flush();
    await act(async () => { await seen.playUri('spotify:track:new'); });
    expect((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain('device_id=phone1');
  });

  it('nothing playing anywhere clears it', async () => {
    api.fetchPlayback.mockResolvedValue({ ok: true, playback: null });
    render(<SpotifyProvider><Probe /></SpotifyProvider>);
    await flush();
    expect(seen.elsewhere).toBeNull();
  });

  it('"Play here" moves the music to this browser, and the suite stops saying it is elsewhere', async () => {
    (window as unknown as { Spotify: unknown }).Spotify = { Player: FakePlayer };
    render(<SpotifyProvider><Probe /></SpotifyProvider>);
    await flush();
    act(() => players[0].emit('ready', { device_id: 'browser1' }));
    await flush();
    let ok = false;
    await act(async () => { ok = await seen.playHere(); });
    expect(ok).toBe(true);
    expect(api.controlPlayback).toHaveBeenCalledWith({ kind: 'transfer', deviceId: 'browser1', play: true });
    expect(seen.elsewhere).toBeNull();
  });

  it('the in-app player being the active device is not "elsewhere"', async () => {
    (window as unknown as { Spotify: unknown }).Spotify = { Player: FakePlayer };
    api.fetchPlayback.mockResolvedValue(onPhone({ device: { id: 'browser1', name: 'The Cavern Web Player', type: 'Computer', isActive: true, volumePercent: 50 } }));
    render(<SpotifyProvider><Probe /></SpotifyProvider>);
    await flush();
    act(() => players[0].emit('ready', { device_id: 'browser1' }));
    await flush();
    expect(seen.elsewhere).toBeNull();
  });
});
