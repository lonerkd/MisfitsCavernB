'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getValidToken, logoutSpotify } from '../spotify/auth';

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
  playUri: (uri: string) => Promise<void>;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  setVolumeLevel: (vol: number) => void;
  logout: () => void;
}

const Ctx = createContext<SpotifyContextValue | null>(null);

export function SpotifyProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSDKReady, setIsSDKReady] = useState(false);
  const [player, setPlayer] = useState<any | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  
  // Playback state
  const [currentTrack, setCurrentTrack] = useState<Spotify.Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progressMs, setProgressMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [volume, setVolume] = useState(0.5);
  
  // Settings
  const [isPremium, setIsPremium] = useState(true); // Default assume premium until forbidden
  const [useIframeFallback, setUseIframeFallback] = useState(false);

  // Poll for token existence (since it might change from other tabs or redirect)
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

  // Initialize Web Playback SDK
  useEffect(() => {
    if (!isAuthenticated || useIframeFallback) return;

    const loadSdk = () => {
      if (window.Spotify) return;
      const script = document.createElement('script');
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      document.body.appendChild(script);
    };

    window.onSpotifyWebPlaybackSDKReady = () => {
      setIsSDKReady(true);
    };

    if (!window.Spotify) {
      loadSdk();
    } else {
      setIsSDKReady(true);
    }
  }, [isAuthenticated, useIframeFallback]);

  useEffect(() => {
    if (!isSDKReady || !isAuthenticated || useIframeFallback) return;

    let localPlayer: any;
    
    const initPlayer = async () => {
      const token = await getValidToken();
      if (!token) return;

      localPlayer = new window.Spotify.Player({
        name: 'Misfits Cavern Web Player',
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
    };
  }, [isSDKReady, isAuthenticated, useIframeFallback]);

  // Sync progress bar locally
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setProgressMs(p => Math.min(p + 1000, durationMs));
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, durationMs]);

  const playUri = useCallback(async (uri: string) => {
    if (useIframeFallback) {
      // Handled by UI
      return;
    }

    if (!deviceId) return;
    const token = await getValidToken();
    if (!token) return;

    try {
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
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
  }, [deviceId, useIframeFallback]);

  const togglePlay = useCallback(() => {
    if (player) player.togglePlay();
  }, [player]);

  const nextTrack = useCallback(() => {
    if (player) player.nextTrack();
  }, [player]);

  const prevTrack = useCallback(() => {
    if (player) player.previousTrack();
  }, [player]);

  const setVolumeLevel = useCallback((vol: number) => {
    if (player) {
      player.setVolume(vol).then(() => setVolume(vol));
    }
  }, [player]);

  return (
    <Ctx.Provider value={{
      isAuthenticated, isPremium, isSDKReady, player, deviceId,
      currentTrack, isPlaying, progressMs, durationMs, volume,
      useIframeFallback, setUseIframeFallback,
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

// Ensure TypeScript knows about window.Spotify
declare global {
  interface Window {
    Spotify: any;
    onSpotifyWebPlaybackSDKReady: () => void;
  }
  
  // Basic Spotify SDK Types to avoid implicitly any where easily avoidable
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
