// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const spotify = {
  currentTrack: { name: 'Night Drive', artists: [{ name: 'Kavinsky' }], album: { images: [] }, uri: 'spotify:track:night' } as unknown,
  isPlaying: true, progressMs: 61_000, durationMs: 180_000, volume: 0.5,
  elsewhere: null as null | { id: string | null; name: string },
  isPremium: true, useIframeFallback: false, setUseIframeFallback: vi.fn(), logout: vi.fn(),
  togglePlay: vi.fn(), nextTrack: vi.fn(), prevTrack: vi.fn(), seek: vi.fn(), setVolumeLevel: vi.fn(), playHere: vi.fn(async () => true),
  playUri: vi.fn(async () => {}),
};
vi.mock('@/lib/os/SpotifyContext', () => ({ useSpotify: () => spotify }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
const cavern = vi.hoisted(() => ({ open: vi.fn() }));
vi.mock('@/lib/cavern/CavernContext', () => ({ useCavern: () => ({ mode: 'closed', open: cavern.open, minimise: vi.fn(), close: vi.fn() }) }));
vi.mock('./ListenWithoutPremium', () => ({ ListenWithoutPremium: () => <div>embedded players here</div> }));
vi.mock('@/lib/os/usePhone', () => ({ usePhoneLayout: () => ({ phone: false, landscape: false, keyboard: 0, typing: false, height: 800, offset: 0 }) }));
const audio = vi.hoisted(() => ({ listAudioRefs: vi.fn(async () => [] as unknown[]), listSceneChoices: vi.fn(async () => [] as unknown[]) }));
vi.mock('@/lib/supabase/audio', async (orig) => ({ ...(await orig<typeof import('@/lib/supabase/audio')>()), ...audio }));
import { SoundDeck } from './SoundDeck';

afterEach(() => { cleanup(); vi.clearAllMocks(); spotify.useIframeFallback = false; spotify.elsewhere = null; spotify.currentTrack = { name: 'Night Drive', artists: [{ name: 'Kavinsky' }], album: { images: [] }, uri: 'spotify:track:night' }; });

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
  it('with nothing playing it collapses to a slim strip: one line, no dead transport, no seek bar', () => {
    spotify.currentTrack = null; spotify.durationMs = 0; spotify.progressMs = 0;
    render(<SoundDeck />);
    expect(screen.getByText('Nothing playing')).toBeTruthy();
    expect(screen.queryByRole('slider', { name: 'Position in the song' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Next track' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Previous track' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Player settings' })).toBeTruthy();
    spotify.durationMs = 180_000; spotify.progressMs = 61_000;
  });
  it('the strip remembers the last thing played and can play it again', () => {
    const { rerender } = render(<SoundDeck />);
    expect(screen.getByText('Night Drive')).toBeTruthy();
    spotify.currentTrack = null;
    rerender(<SoundDeck />);
    expect(screen.getByText(/Last played/)).toBeTruthy();
    expect(screen.getByText('Night Drive')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Play Night Drive' }));
    expect(spotify.playUri).toHaveBeenCalledWith('spotify:track:night');
  });
  it('names the scene the track is tagged to in this project', async () => {
    audio.listAudioRefs.mockResolvedValue([{ uri: 'spotify:track:night', for_scene: 's1' }]);
    audio.listSceneChoices.mockResolvedValue([{ id: 's1', label: '1 · INT. KITCHEN - DAY', scriptId: null }]);
    render(<SoundDeck projectId="p1" />);
    expect(await screen.findByText(/Tagged to 1 · INT\. KITCHEN - DAY/)).toBeTruthy();
    expect(audio.listAudioRefs).toHaveBeenCalledWith('p1');
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
  it('player settings live in the deck’s own menu: the free-mode disc switches the player, and disconnect is there', () => {
    const { rerender } = render(<SoundDeck />);
    expect(screen.queryByText('embedded players here')).toBeNull();
    expect(screen.queryByRole('switch', { name: 'Free mode' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Player settings' }));
    const disc = screen.getByRole('switch', { name: 'Free mode' });
    expect(disc.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(disc);
    expect(spotify.setUseIframeFallback).toHaveBeenCalledWith(true);
    spotify.useIframeFallback = true;
    rerender(<SoundDeck />);
    expect(screen.getByText('embedded players here')).toBeTruthy();
    expect(screen.getByRole('switch', { name: 'Free mode' }).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: /Disconnect Spotify/ }));
    expect(spotify.logout).toHaveBeenCalledOnce();
  });
});
