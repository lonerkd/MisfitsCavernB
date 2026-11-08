// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const toast = vi.fn();
const spotify = vi.hoisted(() => ({ isAuthenticated: true, currentTrack: null as null | { name: string; artists: Array<{ name: string }> }, isPlaying: false, progressMs: 30_000, durationMs: 180_000, elsewhere: null as null | { name: string }, togglePlay: vi.fn(), playUri: vi.fn(), seek: vi.fn(), playHere: vi.fn().mockResolvedValue(true) }));
const search = vi.hoisted(() => vi.fn());
const audio = vi.hoisted(() => ({ addAudioRef: vi.fn(), listAudioRefs: vi.fn(), tagAudioRef: vi.fn() }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/lib/os/SpotifyContext', () => ({ useSpotify: () => spotify }));
vi.mock('@/lib/spotify/search', () => ({ searchSpotify: search }));
vi.mock('@/lib/supabase/client', () => ({ supabase: {} }));
vi.mock('@/lib/supabase/audio', async (orig) => ({ ...(await orig<typeof import('@/lib/supabase/audio')>()), ...audio }));
import { SoundPanel, type SoundPanelProps } from './SoundPanel';

const base = (over: Partial<SoundPanelProps> = {}): SoundPanelProps => ({
  tableRead: { supported: true, playing: false, lineIdx: null, totalLines: 40, sceneStartLine: 12, start: vi.fn(), pause: vi.fn(), resume: vi.fn(), stop: vi.fn() },
  sceneId: 'sc2', sceneLabel: 'Scene 2', sceneBody: 'He runs. Guns fire. A chase through the market.', timeOfDay: 'DAY',
  projectId: 'p1', userId: 'u1', refs: [], onRefsChanged: vi.fn(), playRef: vi.fn(), ...over,
});

beforeEach(() => { spotify.isAuthenticated = true; spotify.currentTrack = null; spotify.elsewhere = null; search.mockResolvedValue([{ id: 't1', uri: 'spotify:track:t1', name: 'Chase Theme', artists: [{ name: 'Ada' }] }]); audio.addAudioRef.mockResolvedValue(undefined); audio.tagAudioRef.mockResolvedValue(undefined); audio.listAudioRefs.mockResolvedValue([{ id: 'r1' }]); });
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
    expect(screen.getByRole('link', { name: 'Connect in Sound' })).toBeTruthy();
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

describe('SoundPanel: music that is already playing', () => {
  it('says which device it is on, lets you move it here, and seek', async () => {
    spotify.currentTrack = { name: 'On The Phone', artists: [{ name: 'Ada' }] };
    spotify.elsewhere = { name: 'Pixel 8' };
    render(<SoundPanel {...base()} />);
    expect(screen.getByText(/Playing on Pixel 8/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Position in the song'), { target: { value: '90000' } });
    expect(spotify.seek).toHaveBeenCalledWith(90000);
    fireEvent.click(screen.getByRole('button', { name: 'Play here' }));
    await waitFor(() => expect(spotify.playHere).toHaveBeenCalled());
  });
  it('a failed move says so', async () => {
    spotify.currentTrack = { name: 'X', artists: [] };
    spotify.elsewhere = { name: 'Pixel 8' };
    spotify.playHere.mockResolvedValueOnce(false);
    render(<SoundPanel {...base()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Play here' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.stringMatching(/Could not move/), 'error'));
  });
  it('without a device elsewhere there is no "Play here"', () => {
    spotify.currentTrack = { name: 'X', artists: [] };
    render(<SoundPanel {...base()} />);
    expect(screen.queryByRole('button', { name: 'Play here' })).toBeNull();
  });
});

describe('SoundPanel: tags', () => {
  const saved = { id: 'a', title: 'Saved One', reference_type: 'spotify', uri: 'spotify:track:x', for_scene: null, role: null, tags: [] as string[] };
  it('tags a saved track: a role, tags, and this scene', async () => {
    const p = base({ refs: [saved] });
    render(<SoundPanel {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tag Saved One' }));
    fireEvent.change(screen.getByLabelText('Role in the scene'), { target: { value: 'theme' } });
    fireEvent.change(screen.getByLabelText(/Tags/), { target: { value: 'tense, Strings ,tense' } });
    fireEvent.click(screen.getByLabelText('For this scene'));
    fireEvent.click(screen.getByRole('button', { name: 'Save tags' }));
    await waitFor(() => expect(audio.tagAudioRef).toHaveBeenCalledWith('a', { sceneId: 'sc2', role: 'theme', tags: ['tense', 'Strings'] }));
    await waitFor(() => expect(p.onRefsChanged).toHaveBeenCalled());
  });
  it('shows a track\'s role, tags and "this scene", and lists this scene\'s tracks first', () => {
    const tagged = { ...saved, id: 'b', title: 'Tagged', for_scene: 'sc2', role: 'source', tags: ['radio'] };
    render(<SoundPanel {...base({ refs: [saved, tagged] })} />);
    const items = screen.getAllByRole('listitem').filter((li) => li.textContent?.includes('Saved One') || li.textContent?.includes('Tagged'));
    expect(items[0].textContent).toContain('Tagged');
    expect(items[0].textContent).toContain('this scene');
    expect(items[0].textContent).toContain('Source music');
    expect(items[0].textContent).toContain('radio');
  });
  it('a refused tag says so', async () => {
    audio.tagAudioRef.mockRejectedValueOnce(new Error('You cannot tag this track.'));
    render(<SoundPanel {...base({ refs: [saved] })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tag Saved One' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save tags' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('You cannot tag this track.', 'error'));
  });
  it('the song playing now is saved and tagged to the scene in one tap, as a temp score', async () => {
    spotify.currentTrack = { name: 'Playing', artists: [{ name: 'Bo' }], uri: 'spotify:track:now' } as never;
    const p = base();
    render(<SoundPanel {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tag this song to Scene 2' }));
    await waitFor(() => expect(audio.addAudioRef).toHaveBeenCalledWith(expect.objectContaining({ uri: 'spotify:track:now', sceneId: 'sc2', role: 'temp' })));
  });
  it('a song already saved is only tagged, not saved twice', async () => {
    spotify.currentTrack = { name: 'Saved One', artists: [{ name: 'Bo' }], uri: 'spotify:track:x' } as never;
    render(<SoundPanel {...base({ refs: [saved] })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tag this song to Scene 2' }));
    await waitFor(() => expect(audio.tagAudioRef).toHaveBeenCalledWith('a', { sceneId: 'sc2', role: 'temp', tags: [] }));
    expect(audio.addAudioRef).not.toHaveBeenCalled();
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
  it('tells an iPhone writer about the side switch', () => {
    const spy = vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)');
    render(<SoundPanel {...base()} />);
    expect(screen.getByRole('note').textContent).toMatch(/side switch/);
    spy.mockRestore();
  });
});

describe('SoundPanel: who may tag', () => {
  const refs = [{ id: 'r1', title: 'Chase Theme', uri: 'spotify:track:t1', for_scene: 'sc2', role: 'temp', tags: [] }];
  it('shows the Tag buttons to an owner or writer', () => {
    render(<SoundPanel {...base({ refs, canTag: true })} />);
    expect(screen.getByRole('button', { name: 'Tag Chase Theme' })).toBeTruthy();
  });
  it('hides them from everyone else, who still sees the track', () => {
    render(<SoundPanel {...base({ refs, canTag: false })} />);
    expect(screen.queryByRole('button', { name: 'Tag Chase Theme' })).toBeNull();
    expect(screen.getAllByText(/Chase Theme/).length).toBeGreaterThan(0);
  });
});
