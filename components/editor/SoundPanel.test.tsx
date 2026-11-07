// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const toast = vi.fn();
const spotify = vi.hoisted(() => ({ isAuthenticated: true, currentTrack: null as null | { name: string; artists: Array<{ name: string }> }, isPlaying: false, togglePlay: vi.fn(), playUri: vi.fn() }));
const search = vi.hoisted(() => vi.fn());
const audio = vi.hoisted(() => ({ addAudioRef: vi.fn(), listAudioRefs: vi.fn() }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/lib/os/SpotifyContext', () => ({ useSpotify: () => spotify }));
vi.mock('@/lib/spotify/search', () => ({ searchSpotify: search }));
vi.mock('@/lib/supabase/audio', () => audio);
import { SoundPanel, type SoundPanelProps } from './SoundPanel';

const base = (over: Partial<SoundPanelProps> = {}): SoundPanelProps => ({
  tableRead: { supported: true, playing: false, lineIdx: null, totalLines: 40, sceneStartLine: 12, start: vi.fn(), pause: vi.fn(), resume: vi.fn(), stop: vi.fn() },
  sceneLabel: 'Scene 2', sceneBody: 'He runs. Guns fire. A chase through the market.', timeOfDay: 'DAY',
  projectId: 'p1', userId: 'u1', refs: [], onRefsChanged: vi.fn(), playRef: vi.fn(), ...over,
});

beforeEach(() => { spotify.isAuthenticated = true; spotify.currentTrack = null; search.mockResolvedValue([{ id: 't1', uri: 'spotify:track:t1', name: 'Chase Theme', artists: [{ name: 'Ada' }] }]); audio.addAudioRef.mockResolvedValue(undefined); audio.listAudioRefs.mockResolvedValue([{ id: 'r1' }]); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('SoundPanel: the table read', () => {
  it('plays from the top, from this scene, and says which line it is on', () => {
    const p = base();
    const { rerender } = render(<SoundPanel {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'Play table read' }));
    expect(p.tableRead.start).toHaveBeenCalledWith(0);
    fireEvent.click(screen.getByRole('button', { name: 'From this scene' }));
    expect(p.tableRead.start).toHaveBeenCalledWith(12);
    rerender(<SoundPanel {...base({ tableRead: { ...p.tableRead, playing: true, lineIdx: 4 } })} />);
    expect(screen.getByText('Reading line 5 of 40.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Pause table read' }));
    expect(p.tableRead.pause).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Stop table read' }));
    expect(p.tableRead.stop).toHaveBeenCalled();
  });
  it('says so when the browser cannot read aloud', () => {
    render(<SoundPanel {...base({ tableRead: { ...base().tableRead, supported: false } })} />);
    expect(screen.getByText('This browser cannot read aloud.')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Play table read' }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('resumes a paused read instead of starting over', () => {
    const p = base({ tableRead: { ...base().tableRead, playing: false, lineIdx: 7 } });
    render(<SoundPanel {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'Play table read' }));
    expect(p.tableRead.resume).toHaveBeenCalled();
    expect(p.tableRead.start).not.toHaveBeenCalled();
  });
});

describe('SoundPanel: music for the scene', () => {
  it('reads the scene\'s mood, searches for it, plays and saves a suggestion', async () => {
    const p = base();
    render(<SoundPanel {...p} />);
    expect(screen.getByText('Action')).toBeTruthy();
    await screen.findByText('Chase Theme');
    expect(search).toHaveBeenCalledWith('action chase film score', 'track');
    fireEvent.click(screen.getByRole('button', { name: 'Play Chase Theme' }));
    expect(spotify.playUri).toHaveBeenCalledWith('spotify:track:t1');
    fireEvent.click(screen.getByRole('button', { name: 'Save Chase Theme to the project' }));
    await waitFor(() => expect(audio.addAudioRef).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'p1', uri: 'spotify:track:t1', title: 'Chase Theme — Ada', description: 'Action · Scene 2' })));
    await waitFor(() => expect(p.onRefsChanged).toHaveBeenCalledWith([{ id: 'r1' }]));
  });
  it('without Spotify it says how to connect and searches for nothing', () => {
    spotify.isAuthenticated = false;
    render(<SoundPanel {...base()} />);
    expect(screen.getByRole('link', { name: 'Connect in Soundtrack' })).toBeTruthy();
    expect(search).not.toHaveBeenCalled();
  });
  it('a failed search says why', async () => {
    search.mockRejectedValue(new Error('Spotify search failed'));
    render(<SoundPanel {...base()} />);
    expect((await screen.findByRole('alert')).textContent).toBe('Spotify search failed');
  });
  it('a script with no project cannot save, and says so', async () => {
    render(<SoundPanel {...base({ projectId: null })} />);
    await screen.findByText('Chase Theme');
    fireEvent.click(screen.getByRole('button', { name: 'Save Chase Theme to the project' }));
    expect(toast).toHaveBeenCalledWith(expect.stringMatching(/from a project/), 'info');
    expect(audio.addAudioRef).not.toHaveBeenCalled();
  });
  it('shows what is playing now, with a play/pause', () => {
    spotify.currentTrack = { name: 'Already On', artists: [{ name: 'Bo' }] };
    render(<SoundPanel {...base()} />);
    expect(screen.getByText('Already On')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Play music' }));
    expect(spotify.togglePlay).toHaveBeenCalled();
  });
});

describe('SoundPanel: saved tracks', () => {
  it('lists the project\'s tracks and plays one', () => {
    const p = base({ refs: [{ id: 'a', title: 'Saved One', reference_type: 'spotify', uri: 'spotify:track:x' }] });
    render(<SoundPanel {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'Play Saved One' }));
    expect(p.playRef).toHaveBeenCalledWith(p.refs[0]);
  });
  it('says what to do when there are none', () => {
    render(<SoundPanel {...base()} />);
    expect(screen.getByText(/Nothing saved yet/)).toBeTruthy();
  });
});
