import { describe, expect, it, vi } from 'vitest';
import { musicActivity, quantize, type MusicState } from './musicActivity';

const state = (over: Partial<MusicState> = {}): MusicState => ({
  isAuthenticated: true,
  currentTrack: { name: 'Harbor Lights', artists: [{ name: 'Ana Ruiz' }, { name: 'The Tugs' }] },
  isPlaying: true, progressMs: 45_000, durationMs: 180_000,
  togglePlay: vi.fn(), nextTrack: vi.fn(), prevTrack: vi.fn(), ...over,
});

describe('musicActivity', () => {
  it('is nothing when Spotify is not connected, or nothing has been loaded', () => {
    expect(musicActivity(state({ isAuthenticated: false }), true)).toBeNull();
    expect(musicActivity(state({ currentTrack: null }), true)).toBeNull();
  });

  it('holds what is playing: the track, who plays it, how far along, with Pause and Next', () => {
    const a = musicActivity(state(), true)!;
    expect(a).toMatchObject({ id: 'music', kind: 'music', tone: 'info', title: 'Harbor Lights', detail: 'Ana Ruiz, The Tugs', progress: 0.25 });
    expect(a.controls?.map((c) => [c.id, c.label])).toEqual([['toggle', 'Pause'], ['prev', 'Previous'], ['next', 'Next']]);
  });

  it('a paused track still on the island says so, with Play in place of Pause and a warning tone', () => {
    const a = musicActivity(state({ isPlaying: false }), true)!;
    expect(a).toMatchObject({ tone: 'warn', detail: 'Ana Ruiz, The Tugs · paused' });
    expect(a.controls?.[0]).toMatchObject({ id: 'toggle', label: 'Play' });
  });

  it('lets go of a track that has been paused a long while (held = false), but never of one that is playing', () => {
    expect(musicActivity(state({ isPlaying: false }), false)).toBeNull();
    expect(musicActivity(state({ isPlaying: true }), false)).not.toBeNull();
  });

  it('the buttons are the player\'s own', () => {
    const m = state();
    const a = musicActivity(m, true)!;
    a.controls?.find((c) => c.id === 'toggle')?.run();
    a.controls?.find((c) => c.id === 'prev')?.run();
    a.controls?.find((c) => c.id === 'next')?.run();
    expect(m.togglePlay).toHaveBeenCalledOnce();
    expect(m.prevTrack).toHaveBeenCalledOnce();
    expect(m.nextTrack).toHaveBeenCalledOnce();
  });

  it('copes with a track with no name or no artists, and with an unknown length (no bar rather than a wrong one)', () => {
    const a = musicActivity(state({ currentTrack: { name: '', artists: [] }, durationMs: 0 }), true)!;
    expect(a.title).toBe('Playing');
    expect(a.detail).toBeUndefined();
    expect(a.progress).toBeUndefined();
  });

  it('the bar moves in whole percent, and never leaves 0 to 1', () => {
    expect(quantize(0.2549)).toBe(0.25);
    expect(quantize(0.2551)).toBe(0.26);
    expect(quantize(-1)).toBe(0);
    expect(quantize(3)).toBe(1);
  });
});
