// What Spotify is playing right now, on any of the person's devices, and the controls for that device. The in-app player
// (the Web Playback SDK) is one device among them; a song already running on a phone or the desktop app is the common
// case for someone working, so the suite reads it (GET /me/player) and drives it instead of starting a second player.

import { getValidToken } from './auth';

export interface RemoteTrack { id: string | null; uri: string; name: string; artists: Array<{ uri: string; name: string }>; album: { uri: string; name: string; images: Array<{ url: string }> } }
export interface PlaybackDevice { id: string | null; name: string; type: string; isActive: boolean; volumePercent: number | null }
export interface RemotePlayback { track: RemoteTrack; isPlaying: boolean; progressMs: number; durationMs: number; device: PlaybackDevice }

// Spotify's response is untyped JSON from outside; parsePlayback is the one place that reads it and checks every field it uses.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any> | null | undefined;

/** The Web API's `/me/player` body as the suite's shape; null when nothing (or only an ad or an unplayable item) is playing. */
export function parsePlayback(body: Json): RemotePlayback | null {
  const item = body?.item;
  const device = body?.device;
  if (!body || !item || !device || (item.type && item.type !== 'track' && item.type !== 'episode')) return null;
  return {
    track: {
      id: item.id ?? null, uri: String(item.uri ?? ''), name: String(item.name ?? ''),
      artists: (item.artists ?? item.show ? (item.artists ?? [{ uri: item.show?.uri ?? '', name: item.show?.name ?? '' }]) : []).map((a: Json) => ({ uri: String(a?.uri ?? ''), name: String(a?.name ?? '') })),
      album: { uri: String(item.album?.uri ?? ''), name: String(item.album?.name ?? ''), images: (item.album?.images ?? item.images ?? []).map((i: Json) => ({ url: String(i?.url ?? '') })) },
    },
    isPlaying: !!body.is_playing,
    progressMs: Number(body.progress_ms) || 0,
    durationMs: Number(item.duration_ms) || 0,
    device: { id: device.id ?? null, name: String(device.name ?? 'Spotify'), type: String(device.type ?? ''), isActive: !!device.is_active, volumePercent: typeof device.volume_percent === 'number' ? device.volume_percent : null },
  };
}

export type PlaybackResult = { ok: true; playback: RemotePlayback | null } | { ok: false; status: number; retryAfterMs: number };

const API = 'https://api.spotify.com/v1/me/player';

/** Read what is playing. 204 means nothing is playing anywhere (not an error). A 429 says how long to wait. */
export async function fetchPlayback(): Promise<PlaybackResult> {
  const token = await getValidToken();
  if (!token) return { ok: false, status: 401, retryAfterMs: 0 };
  try {
    const res = await fetch(`${API}?additional_types=track,episode`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 204) return { ok: true, playback: null };
    if (!res.ok) return { ok: false, status: res.status, retryAfterMs: res.status === 429 ? (Number(res.headers.get('Retry-After')) || 5) * 1000 : 0 };
    return { ok: true, playback: parsePlayback(await res.json()) };
  } catch {
    return { ok: false, status: 0, retryAfterMs: 0 };
  }
}

export type Control =
  | { kind: 'play' } | { kind: 'pause' } | { kind: 'next' } | { kind: 'previous' }
  | { kind: 'seek'; positionMs: number } | { kind: 'volume'; percent: number }
  | { kind: 'transfer'; deviceId: string; play: boolean };

/** The request a control makes (pure: tested without a network). */
export function controlRequest(c: Control, deviceId?: string | null): { method: 'PUT' | 'POST'; url: string; body?: string } {
  const q = (params: Record<string, string | number>) => {
    const u = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
    if (deviceId) u.set('device_id', deviceId);
    const s = u.toString();
    return s ? `?${s}` : '';
  };
  switch (c.kind) {
    case 'play': return { method: 'PUT', url: `${API}/play${q({})}` };
    case 'pause': return { method: 'PUT', url: `${API}/pause${q({})}` };
    case 'next': return { method: 'POST', url: `${API}/next${q({})}` };
    case 'previous': return { method: 'POST', url: `${API}/previous${q({})}` };
    case 'seek': return { method: 'PUT', url: `${API}/seek${q({ position_ms: Math.max(0, Math.round(c.positionMs)) })}` };
    case 'volume': return { method: 'PUT', url: `${API}/volume${q({ volume_percent: Math.min(100, Math.max(0, Math.round(c.percent))) })}` };
    case 'transfer': return { method: 'PUT', url: API, body: JSON.stringify({ device_ids: [c.deviceId], play: c.play }) };
  }
}

/** Drive a device. Returns false when Spotify refused (no Premium, no active device, expired); the caller says so. */
export async function controlPlayback(c: Control, deviceId?: string | null): Promise<boolean> {
  const token = await getValidToken();
  if (!token) return false;
  const r = controlRequest(c, deviceId);
  try {
    const res = await fetch(r.url, { method: r.method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: r.body });
    return res.ok || res.status === 204;
  } catch {
    return false;
  }
}
