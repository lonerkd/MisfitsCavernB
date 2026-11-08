// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const spotify = {
  currentTrack: { name: 'Night Drive', artists: [{ name: 'Kavinsky' }], album: { images: [] } } as unknown,
  isPlaying: true, progressMs: 61_000, durationMs: 180_000, volume: 0.5,
  elsewhere: null as null | { id: string | null; name: string },
  togglePlay: vi.fn(), nextTrack: vi.fn(), prevTrack: vi.fn(), seek: vi.fn(), setVolumeLevel: vi.fn(), playHere: vi.fn(async () => true),
};
vi.mock('@/lib/os/SpotifyContext', () => ({ useSpotify: () => spotify }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/components/shell/CavernVisualizer', () => ({ CavernVisualizer: ({ onClose }: { onClose: () => void }) => <button onClick={onClose}>cave is open</button> }));
import { SoundDeck } from './SoundDeck';

afterEach(() => { cleanup(); vi.clearAllMocks(); spotify.elsewhere = null; spotify.currentTrack = { name: 'Night Drive', artists: [{ name: 'Kavinsky' }], album: { images: [] } }; });

describe('SoundDeck', () => {
  it('shows the song and drives the player', () => {
    render(<SoundDeck />);
    expect(screen.getByText('Night Drive')).toBeTruthy();
    expect(screen.getByText('Kavinsky')).toBeTruthy();
    expect(screen.getByText('1:01')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next track' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous track' }));
    expect(spotify.togglePlay).toHaveBeenCalledOnce(); expect(spotify.nextTrack).toHaveBeenCalledOnce(); expect(spotify.prevTrack).toHaveBeenCalledOnce();
    fireEvent.change(screen.getByRole('slider', { name: 'Position in the song' }), { target: { value: '90000' } });
    expect(spotify.seek).toHaveBeenCalledWith(90000);
    fireEvent.change(screen.getByRole('slider', { name: 'Volume' }), { target: { value: '0.8' } });
    expect(spotify.setVolumeLevel).toHaveBeenCalledWith(0.8);
  });
  it('says nothing is playing, and the seek bar is off', () => {
    spotify.currentTrack = null; spotify.durationMs = 0; spotify.progressMs = 0;
    render(<SoundDeck />);
    expect(screen.getByText('Nothing playing')).toBeTruthy();
    expect((screen.getByRole('slider', { name: 'Position in the song' }) as HTMLInputElement).disabled).toBe(true);
    spotify.durationMs = 180_000; spotify.progressMs = 61_000;
  });
  it('names the other device and moves the music here', () => {
    spotify.elsewhere = { id: 'phone1', name: 'Pixel 8' };
    render(<SoundDeck />);
    expect(screen.getByText('Playing on Pixel 8.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Play here' }));
    expect(spotify.playHere).toHaveBeenCalledOnce();
  });
  it('opens the full-screen cavern and closes it', () => {
    render(<SoundDeck />);
    fireEvent.click(screen.getByRole('button', { name: 'Full screen cavern' }));
    fireEvent.click(screen.getByText('cave is open'));
    expect(screen.queryByText('cave is open')).toBeNull();
  });
});
