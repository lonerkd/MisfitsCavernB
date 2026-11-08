import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./auth', () => ({ getValidToken: vi.fn().mockResolvedValue('tok') }));
import { controlPlayback, controlRequest, fetchPlayback, parsePlayback } from './playback';

const body = {
  is_playing: true, progress_ms: 61000,
  device: { id: 'dev1', name: 'Pixel 8', type: 'Smartphone', is_active: true, volume_percent: 40 },
  item: { type: 'track', id: 't1', uri: 'spotify:track:t1', name: 'Song', duration_ms: 200000, artists: [{ uri: 'spotify:artist:a', name: 'Ada' }], album: { uri: 'spotify:album:b', name: 'Album', images: [{ url: 'http://img' }] } },
};

afterEach(() => vi.unstubAllGlobals());

describe('parsePlayback', () => {
  it('reads the track, the position and the device it is on', () => {
    expect(parsePlayback(body)).toEqual({
      track: { id: 't1', uri: 'spotify:track:t1', name: 'Song', artists: [{ uri: 'spotify:artist:a', name: 'Ada' }], album: { uri: 'spotify:album:b', name: 'Album', images: [{ url: 'http://img' }] } },
      isPlaying: true, progressMs: 61000, durationMs: 200000,
      device: { id: 'dev1', name: 'Pixel 8', type: 'Smartphone', isActive: true, volumePercent: 40 },
    });
  });
  it('nothing playing, an ad, or no device is null', () => {
    expect(parsePlayback(null)).toBeNull();
    expect(parsePlayback({ ...body, item: null })).toBeNull();
    expect(parsePlayback({ ...body, item: { ...body.item, type: 'ad' } })).toBeNull();
    expect(parsePlayback({ ...body, device: null })).toBeNull();
  });
  it('an episode is read through its show', () => {
    const p = parsePlayback({ ...body, item: { type: 'episode', id: 'e1', uri: 'spotify:episode:e1', name: 'Ep', duration_ms: 1000, show: { uri: 'spotify:show:s', name: 'The Show' }, images: [{ url: 'http://ep' }] } });
    expect(p?.track.artists[0].name).toBe('The Show');
    expect(p?.track.album.images[0].url).toBe('http://ep');
  });
});

describe('controlRequest', () => {
  it('addresses the device it was given', () => {
    expect(controlRequest({ kind: 'pause' }, 'd1')).toEqual({ method: 'PUT', url: 'https://api.spotify.com/v1/me/player/pause?device_id=d1' });
    expect(controlRequest({ kind: 'next' })).toEqual({ method: 'POST', url: 'https://api.spotify.com/v1/me/player/next' });
  });
  it('seek and volume are clamped and rounded', () => {
    expect(controlRequest({ kind: 'seek', positionMs: -50 }).url).toContain('position_ms=0');
    expect(controlRequest({ kind: 'volume', percent: 140.4 }).url).toContain('volume_percent=100');
  });
  it('transfer moves playback to a device and says whether to play', () => {
    expect(controlRequest({ kind: 'transfer', deviceId: 'd2', play: true })).toEqual({ method: 'PUT', url: 'https://api.spotify.com/v1/me/player', body: JSON.stringify({ device_ids: ['d2'], play: true }) });
  });
});

describe('fetchPlayback', () => {
  it('204 is "nothing playing", not an error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 204, ok: true }));
    expect(await fetchPlayback()).toEqual({ ok: true, playback: null });
  });
  it('returns what is playing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200, ok: true, json: async () => body }));
    const r = await fetchPlayback();
    expect(r.ok && r.playback?.device.name).toBe('Pixel 8');
  });
  it('a 429 says how long to wait', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 429, ok: false, headers: { get: () => '7' } }));
    expect(await fetchPlayback()).toEqual({ ok: false, status: 429, retryAfterMs: 7000 });
  });
  it('a network failure is a failure, not a throw', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await fetchPlayback()).toEqual({ ok: false, status: 0, retryAfterMs: 0 });
  });
});

describe('controlPlayback', () => {
  it('true on success (204 included), false when Spotify refuses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ status: 204, ok: true }).mockResolvedValueOnce({ status: 403, ok: false }));
    expect(await controlPlayback({ kind: 'pause' }, 'd')).toBe(true);
    expect(await controlPlayback({ kind: 'pause' }, 'd')).toBe(false);
  });
});
