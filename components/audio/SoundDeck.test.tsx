// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const spotify = {
  currentTrack: { name: 'Night Drive', artists: [{ name: 'Kavinsky' }], album: { images: [] } } as unknown,
  isPlaying: true, progressMs: 61_000, durationMs: 180_000, volume: 0.5,
  elsewhere: null as null | { id: string | null; name: string },
  isPremium: true, useIframeFallback: false, setUseIframeFallback: vi.fn(), logout: vi.fn(),
  togglePlay: vi.fn(), nextTrack: vi.fn(), prevTrack: vi.fn(), seek: vi.fn(), setVolumeLevel: vi.fn(), playHere: vi.fn(async () => true),
};
vi.mock('@/lib/os/SpotifyContext', () => ({ useSpotify: () => spotify }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
const cavern = vi.hoisted(() => ({ open: vi.fn() }));
vi.mock('@/lib/cavern/CavernContext', () => ({ useCavern: () => ({ mode: 'closed', open: cavern.open, minimise: vi.fn(), close: vi.fn() }) }));
vi.mock('./ListenWithoutPremium', () => ({ ListenWithoutPremium: () => <div>embedded players here</div> }));
import { SoundDeck } from './SoundDeck';

afterEach(() => { cleanup(); vi.clearAllMocks(); spotify.useIframeFallback = false; spotify.elsewhere = null; spotify.currentTrack = { name: 'Night Drive', artists: [{ name: 'Kavinsky' }], album: { images: [] } }; });

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
  it('asks for the full-screen cavern (the suite’s one cavern, which survives leaving the page)', () => {
    render(<SoundDeck />);
    fireEvent.click(screen.getByRole('button', { name: 'Full screen cavern' }));
    expect(cavern.open).toHaveBeenCalledOnce();
  });
  it('switches to listening without Premium (the embedded players show) and disconnects', () => {
    const { rerender } = render(<SoundDeck />);
    expect(screen.queryByText('embedded players here')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Switch to free mode/ }));
    expect(spotify.setUseIframeFallback).toHaveBeenCalledWith(true);
    spotify.useIframeFallback = true;
    rerender(<SoundDeck />);
    expect(screen.getByText('embedded players here')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Switch to the in-app player/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Disconnect Spotify/ }));
    expect(spotify.logout).toHaveBeenCalledOnce();
  });
});
