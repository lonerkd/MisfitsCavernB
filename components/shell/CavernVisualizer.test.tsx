// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const spotify = {
  currentTrack: { name: 'Night Drive', artists: [{ name: 'Kavinsky' }], album: { images: [] } }, isPlaying: true, progressMs: 61_000, durationMs: 180_000,
  togglePlay: vi.fn(), nextTrack: vi.fn(), prevTrack: vi.fn(), seek: vi.fn(),
};
vi.mock('@/lib/os/SpotifyContext', () => ({ useSpotify: () => spotify }));
import { CavernVisualizer } from './CavernVisualizer';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('CavernVisualizer', () => {
  it('shows the song and drives the player', () => {
    render(<CavernVisualizer onClose={() => {}} />);
    expect(screen.getByText('Night Drive')).toBeTruthy();
    expect(screen.getByText('Kavinsky')).toBeTruthy();
    expect(screen.getByText('1:01')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next track' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous track' }));
    expect(spotify.togglePlay).toHaveBeenCalledOnce(); expect(spotify.nextTrack).toHaveBeenCalledOnce(); expect(spotify.prevTrack).toHaveBeenCalledOnce();
    fireEvent.change(screen.getByRole('slider', { name: 'Seek' }), { target: { value: '90000' } });
    expect(spotify.seek).toHaveBeenCalledWith(90000);
  });
  it('closes with its button and with Escape, and Space plays or pauses', () => {
    const onClose = vi.fn();
    render(<CavernVisualizer onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close the visualizer' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(window, { key: ' ' });
    expect(spotify.togglePlay).toHaveBeenCalledOnce();
  });
});
