// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { activityStore } from './activities';

let spotify: Record<string, unknown> = {};
vi.mock('@/lib/os/SpotifyContext', () => ({ useSpotify: () => spotify }));
import { useMusicActivity } from './useMusicActivity';
import { PAUSED_HOLD_MS } from './musicActivity';

function Probe() { useMusicActivity(); return null; }
const base = { isAuthenticated: true, currentTrack: { name: 'Harbor Lights', artists: [{ name: 'Ana Ruiz' }] }, progressMs: 0, durationMs: 100_000, togglePlay: () => {}, nextTrack: () => {} };
const music = () => activityStore.getSnapshot().find((a) => a.id === 'music');
const show = (view: ReturnType<typeof render> | null, isPlaying: boolean) => {
  spotify = { ...base, isPlaying };
  return view ? (view.rerender(<Probe />), view) : render(<Probe />);
};

beforeEach(() => { vi.useFakeTimers(); spotify = { ...base, isPlaying: false }; });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('useMusicActivity', () => {
  it('holds nothing for a session that has never played anything, even with a track loaded', () => {
    const view = show(null, false);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(music()).toBeUndefined();
    view.unmount();
  });

  it('holds the music once it plays, and lets go of it when the page goes away', () => {
    const view = show(null, true);
    act(() => { vi.advanceTimersByTime(10); });
    expect(music()).toMatchObject({ title: 'Harbor Lights' });
    view.unmount();
    expect(music()).toBeUndefined();
  });

  it('keeps a just-paused track on the island for a while, then lets it go', () => {
    const view = show(null, true);
    act(() => { vi.advanceTimersByTime(10); });
    show(view, false);
    act(() => { vi.advanceTimersByTime(PAUSED_HOLD_MS - 1000); });
    expect(music()).toMatchObject({ tone: 'warn' }); // still there, paused
    act(() => { vi.advanceTimersByTime(2000); });
    expect(music()).toBeUndefined();
    view.unmount();
  });

  it('playing again before the hold runs out keeps it, and starts a fresh hold afterwards', () => {
    const view = show(null, true);
    act(() => { vi.advanceTimersByTime(10); });
    show(view, false);
    act(() => { vi.advanceTimersByTime(PAUSED_HOLD_MS - 5000); });
    show(view, true);
    act(() => { vi.advanceTimersByTime(PAUSED_HOLD_MS + 5000); });
    expect(music()).toMatchObject({ tone: 'info' }); // playing: never let go of
    view.unmount();
  });
});
