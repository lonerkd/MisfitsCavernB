'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useSyncExternalStore } from 'react';
import { getValidToken, logoutSpotify } from '../spotify/auth';
import { controlPlayback, fetchPlayback, type PlaybackDevice } from '../spotify/playback';

interface SpotifyContextValue {
  isAuthenticated: boolean;
  isPremium: boolean;
  isSDKReady: boolean;
  player: any | null;
  deviceId: string | null;
  currentTrack: Spotify.Track | null;
  isPlaying: boolean;
  progressMs: number;
  durationMs: number;
  volume: number;
  useIframeFallback: boolean;
  setUseIframeFallback: (v: boolean) => void;
  /** The device the music is on right now when it is not this browser (the phone's Spotify app, the desktop app…); null when it is here or nothing plays. */
  elsewhere: PlaybackDevice | null;
  /** Move the music to this browser's player. */
  playHere: () => Promise<boolean>;
  seek: (positionMs: number) => void;
  playUri: (uri: string) => Promise<void>;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  setVolumeLevel: (vol: number) => void;
  logout: () => void;
}

const Ctx = createContext<SpotifyContextValue | null>(null);

// Whether Spotify's Web Playback SDK has loaded: the SDK announces it once,
// through a global callback, and then stays loaded for the page's life.
const sdkListeners = new Set<() => void>();
const sdkReady = () => typeof window !== 'undefined' && !!window.Spotify;
const subscribeSdk = (onChange: () => void) => { sdkListeners.add(onChange); return () => { sdkListeners.delete(onChange); }; };
const announceSdkReady = () => sdkListeners.forEach((l) => l());

export function SpotifyProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const isSDKReady = useSyncExternalStore(subscribeSdk, sdkReady, () => false);
  const [player, setPlayer] = useState<any | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  const [currentTrack, setCurrentTrack] = useState<Spotify.Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progressMs, setProgressMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [volume, setVolume] = useState(0.5);

  // Music already playing on another of the person's devices: read it, show it, drive it (lib/spotify/playback.ts).
  const [elsewhereDevice, setElsewhere] = useState<PlaybackDevice | null>(null);
  const elsewhere = isAuthenticated ? elsewhereDevice : null; // signed out: nothing is playing "elsewhere"
  const [isPremium, setIsPremium] = useState(true);
  const [useIframeFallback, setUseIframeFallback] = useState(false);

  useEffect(() => {
    const checkToken = async () => {
      const token = await getValidToken();
      setIsAuthenticated(!!token);
    };

    checkToken();

    const onAuthChange = () => checkToken();
    window.addEventListener('spotify-auth-changed', onAuthChange);
    return () => window.removeEventListener('spotify-auth-changed', onAuthChange);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || useIframeFallback) return;

    const loadSdk = () => {
      if (window.Spotify) return;
      const script = document.createElement('script');
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      document.body.appendChild(script);
    };

    window.onSpotifyWebPlaybackSDKReady = announceSdkReady;
    loadSdk();
  }, [isAuthenticated, useIframeFallback]);

  useEffect(() => {
    if (!isSDKReady || !isAuthenticated || useIframeFallback) return;

    let localPlayer: any;

    const initPlayer = async () => {
      const token = await getValidToken();
      if (!token) return;

      localPlayer = new window.Spotify.Player({
        name: 'The Cavern Web Player',
        getOAuthToken: (cb: (token: string) => void) => {
          getValidToken().then(t => {
            if (t) cb(t);
          });
        },
        volume: 0.5
      });

      localPlayer.addListener('ready', ({ device_id }: { device_id: string }) => {
        setDeviceId(device_id);
      });

      localPlayer.addListener('not_ready', ({ device_id }: { device_id: string }) => {
        setDeviceId(null);
      });

      localPlayer.addListener('player_state_changed', (state: Spotify.PlaybackState | null) => {
        if (!state) return;
        setCurrentTrack(state.track_window.current_track);
        setIsPlaying(!state.paused);
        setProgressMs(state.position);
        setDurationMs(state.duration);
      });

      localPlayer.addListener('initialization_error', ({ message }: { message: string }) => {
        console.error('Spotify Init Error:', message);
      });

      localPlayer.addListener('authentication_error', ({ message }: { message: string }) => {
        console.error('Spotify Auth Error:', message);
        setIsAuthenticated(false);
      });

      localPlayer.addListener('account_error', ({ message }: { message: string }) => {
        console.error('Spotify Account Error (Premium Required?):', message);
        setIsPremium(false);
        setUseIframeFallback(true);
      });

      await localPlayer.connect();
      setPlayer(localPlayer);
    };

    initPlayer();

    return () => {
      if (localPlayer) localPlayer.disconnect();
      // A disconnected player has no track, no position and no controls: leaving them here would show the last
      // account's song (and let a button drive a dead player) until the next player reports in, which it may
      // never do if the person has just signed out or switched Spotify account.
      setPlayer(null);
      setDeviceId(null);
      setCurrentTrack(null);
      setIsPlaying(false);
      setProgressMs(0);
      setDurationMs(0);
    };
  }, [isSDKReady, isAuthenticated, useIframeFallback]);

  // Poll what Spotify is playing while the page is in view: a song started on the phone appears here (and the other way round).
  useEffect(() => {
    if (!isAuthenticated) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let waitUntil = 0;
    const tick = async () => {
      if (!alive) return;
      if (document.visibilityState === 'visible' && Date.now() >= waitUntil) {
        const r = await fetchPlayback();
        if (!alive) return;
        if (!r.ok) waitUntil = Date.now() + r.retryAfterMs;
        else if (r.playback && r.playback.device.id !== deviceId) {
          const pb = r.playback;
          setElsewhere(pb.device);
          setCurrentTrack(pb.track as unknown as Spotify.Track);
          setIsPlaying(pb.isPlaying);
          setProgressMs(pb.progressMs);
          setDurationMs(pb.durationMs);
          if (pb.device.volumePercent != null) setVolume(pb.device.volumePercent / 100);
        } else setElsewhere(null);
      }
      timer = setTimeout(tick, 4000);
    };
    void tick();
    const onVisible = () => { if (document.visibilityState === 'visible') { clearTimeout(timer); void tick(); } };
    document.addEventListener('visibilitychange', onVisible);
    return () => { alive = false; clearTimeout(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [isAuthenticated, deviceId]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setProgressMs(p => Math.min(p + 1000, durationMs));
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, durationMs]);

  const playUri = useCallback(async (uri: string) => {
    if (useIframeFallback) {

      return;
    }

    // Music goes where the music already is: the phone's app if that is playing, otherwise this browser.
    const target = elsewhere?.id ?? deviceId;
    if (!target) return;
    const token = await getValidToken();
    if (!token) return;

    try {
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${target}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context_uri: uri.includes('playlist') || uri.includes('album') ? uri : undefined,
          uris: uri.includes('track') ? [uri] : undefined,
        })
      });
    } catch (err) {
      console.error('Failed to play URI', err);
    }
  }, [deviceId, elsewhere, useIframeFallback]);

  // Controls drive whichever device has the music: the phone's app through the Web API, or this browser's player.
  const togglePlay = useCallback(() => {
    if (elsewhere) { void controlPlayback({ kind: isPlaying ? 'pause' : 'play' }, elsewhere.id).then((ok) => { if (ok) setIsPlaying(!isPlaying); }); return; }
    if (player) player.togglePlay();
  }, [player, elsewhere, isPlaying]);

  const nextTrack = useCallback(() => {
    if (elsewhere) { void controlPlayback({ kind: 'next' }, elsewhere.id); return; }
    if (player) player.nextTrack();
  }, [player, elsewhere]);

  const prevTrack = useCallback(() => {
    if (elsewhere) { void controlPlayback({ kind: 'previous' }, elsewhere.id); return; }
    if (player) player.previousTrack();
  }, [player, elsewhere]);

  const setVolumeLevel = useCallback((vol: number) => {
    if (elsewhere) { void controlPlayback({ kind: 'volume', percent: vol * 100 }, elsewhere.id).then((ok) => { if (ok) setVolume(vol); }); return; }
    if (player) {
      player.setVolume(vol).then(() => setVolume(vol));
    }
  }, [player, elsewhere]);

  const seek = useCallback((positionMs: number) => {
    if (elsewhere) { void controlPlayback({ kind: 'seek', positionMs }, elsewhere.id).then((ok) => { if (ok) setProgressMs(positionMs); }); return; }
    if (player) void player.seek(positionMs).then(() => setProgressMs(positionMs));
  }, [player, elsewhere]);

  const playHere = useCallback(async () => {
    if (!deviceId) return false;
    const ok = await controlPlayback({ kind: 'transfer', deviceId, play: true });
    if (ok) setElsewhere(null);
    return ok;
  }, [deviceId]);

  return (
    <Ctx.Provider value={{
      isAuthenticated, isPremium, isSDKReady, player, deviceId,
      currentTrack, isPlaying, progressMs, durationMs, volume,
      useIframeFallback, setUseIframeFallback,
      elsewhere, playHere, seek,
      playUri, togglePlay, nextTrack, prevTrack, setVolumeLevel,
      logout: logoutSpotify
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSpotify() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useSpotify must be used within SpotifyProvider');
  return c;
}

declare global {
  interface Window {
    Spotify: any;
    onSpotifyWebPlaybackSDKReady: () => void;
  }

  namespace Spotify {
    interface Track {
      uri: string;
      id: string | null;
      type: 'track' | 'episode' | 'ad';
      media_type: 'audio' | 'video';
      name: string;
      is_playable: boolean;
      album: {
        uri: string;
        name: string;
        images: { url: string }[];
      };
      artists: { uri: string; name: string }[];
    }
    interface PlaybackState {
      context: { uri: string; metadata: any };
      disallows: { pausing: boolean; peeking_next: boolean; peeking_prev: boolean; resuming: boolean; seeking: boolean; skipping_next: boolean; skipping_prev: boolean };
      paused: boolean;
      position: number;
      duration: number;
      track_window: { current_track: Track; previous_tracks: Track[]; next_tracks: Track[] };
    }
  }
}
