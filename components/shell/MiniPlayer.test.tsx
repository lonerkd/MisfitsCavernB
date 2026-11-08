// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const spotify = {
  currentTrack: { name: 'Night Drive', artists: [{ name: 'Kavinsky' }], album: { images: [] } } as unknown,
  isPlaying: true, progressMs: 60_000, durationMs: 180_000, elsewhere: null as null | { id: string; name: string },
  togglePlay: vi.fn(), nextTrack: vi.fn(), prevTrack: vi.fn(),
};
vi.mock('@/lib/os/SpotifyContext', () => ({ useSpotify: () => spotify }));
import { MiniPlayer } from './MiniPlayer';

afterEach(() => { cleanup(); vi.clearAllMocks(); spotify.elsewhere = null; spotify.currentTrack = { name: 'Night Drive', artists: [{ name: 'Kavinsky' }], album: { images: [] } }; });

describe('MiniPlayer', () => {
  it('shows the song, the transport, and a way to the Sound page', () => {
    const onNavigate = vi.fn(), onFull = vi.fn();
    render(<MiniPlayer onFull={onFull} onNavigate={onNavigate} />);
    expect(screen.getByText('Night Drive')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next track' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous track' }));
    expect(spotify.togglePlay).toHaveBeenCalledOnce(); expect(spotify.nextTrack).toHaveBeenCalledOnce(); expect(spotify.prevTrack).toHaveBeenCalledOnce();
    const link = screen.getByRole('link', { name: 'Open Sound' });
    expect(link.getAttribute('href')).toBe('/soundtrack');
    fireEvent.click(link);
    expect(onNavigate).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Full screen cavern' }));
    expect(onFull).toHaveBeenCalledOnce();
  });
  it('with nothing playing shows no transport and points to the page', () => {
    spotify.currentTrack = null;
    render(<MiniPlayer onFull={() => {}} onNavigate={() => {}} />);
    expect(screen.getByText('Nothing playing')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Pause' })).toBeNull();
    expect(screen.getByText('Find something on the Sound page')).toBeTruthy();
  });
  it('says which device the music is on', () => {
    spotify.elsewhere = { id: 'p', name: 'Pixel 8' };
    render(<MiniPlayer onFull={() => {}} onNavigate={() => {}} />);
    expect(screen.getByText('on Pixel 8')).toBeTruthy();
  });
});
