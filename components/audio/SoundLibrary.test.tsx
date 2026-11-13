// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const spotify = { playUri: vi.fn() };
const audio = vi.hoisted(() => ({
  listAudioRefs: vi.fn(), listProjectSfx: vi.fn(), listSceneChoices: vi.fn(), tagAudioRef: vi.fn(), deleteAudioRef: vi.fn(), uploadSfx: vi.fn(),
}));
const toast = vi.fn();
vi.mock('@/lib/os/SpotifyContext', () => ({ useSpotify: () => spotify }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/lib/supabase/client', () => ({ supabase: {} }));
vi.mock('@/lib/supabase/audio', async (orig) => ({ ...(await orig<typeof import('@/lib/supabase/audio')>()), ...audio }));
import { SoundLibrary } from './SoundLibrary';

const refs = [
  { id: 'a', project_id: 'p', reference_type: 'spotify', uri: 'spotify:track:1', title: 'Chase Theme', description: 'Ada', role: 'theme', for_scene: 'sc1', tags: ['tense'] },
  { id: 'b', project_id: 'p', reference_type: 'spotify', uri: 'spotify:track:2', title: 'Slow Radio', description: 'Bo', role: null, for_scene: null, tags: [] },
];
const sfx = [{ id: 's1', project_id: 'p', user_id: 'u', title: 'door.wav', audio_url: 'https://x/door.wav', tags: ['Cavern Created'] }];

beforeEach(() => {
  audio.listAudioRefs.mockResolvedValue(refs); audio.listProjectSfx.mockResolvedValue(sfx);
  audio.listSceneChoices.mockResolvedValue([{ id: 'sc1', label: '1 · INT. KITCHEN - DAY' }]);
  audio.tagAudioRef.mockResolvedValue(undefined); audio.deleteAudioRef.mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const open = async (canTag = true) => {
  render(<SoundLibrary projectId="p" projectTitle="Undertow" userId="u" canTag={canTag} />);
  await screen.findByText('Chase Theme');
};

describe('SoundLibrary', () => {
  it('lists songs, sound references and the project’s sound effects together, with their scene, role and tags', async () => {
    await open();
    expect(screen.getByText('Slow Radio')).toBeTruthy();
    expect(screen.getByText('door.wav')).toBeTruthy();
    expect(screen.getByText('3 items: songs, sound files and effects')).toBeTruthy();
    const first = within(screen.getAllByRole('listitem')[0]);
    expect(first.getByText('1 · INT. KITCHEN - DAY')).toBeTruthy();
    expect(first.getByText('Theme')).toBeTruthy();
  });

  it('filters by kind, by tag and by "not in a scene"', async () => {
    await open();
    fireEvent.change(screen.getByLabelText('Kind'), { target: { value: 'sound' } });
    expect(screen.queryByText('Chase Theme')).toBeNull();
    expect(screen.getByText('door.wav')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Kind'), { target: { value: 'all' } });
    fireEvent.click(screen.getByRole('button', { name: 'tense' }));
    expect(screen.queryByText('Slow Radio')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    fireEvent.change(screen.getByLabelText('Scene'), { target: { value: 'none' } });
    expect(screen.queryByText('Chase Theme')).toBeNull();
    expect(screen.getByText('Slow Radio')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Search the library'), { target: { value: 'zzz' } });
    expect(screen.getByText('Nothing matches these filters.')).toBeTruthy();
  });

  it('plays a song through Spotify', async () => {
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Play Chase Theme' }));
    expect(spotify.playUri).toHaveBeenCalledWith('spotify:track:1');
  });

  it('tags a track in place: role, tags and scene', async () => {
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Tag Slow Radio' }));
    const card = within(screen.getByText('Slow Radio').closest('li')!);
    fireEvent.change(card.getByLabelText('Role in the scene'), { target: { value: 'source' } });
    fireEvent.change(card.getByLabelText('Tags (comma separated)'), { target: { value: 'radio, warm' } });
    fireEvent.change(card.getByLabelText('Scene'), { target: { value: 'sc1' } });
    fireEvent.click(card.getByRole('button', { name: 'Save tags' }));
    await waitFor(() => expect(audio.tagAudioRef).toHaveBeenCalledWith('b', { sceneId: 'sc1', role: 'source', tags: ['radio', 'warm'] }));
  });

  it('shows no Tag buttons to someone who may not tag, and says nothing was saved when a tag is refused', async () => {
    await open(false);
    expect(screen.queryByRole('button', { name: 'Tag Slow Radio' })).toBeNull();
    cleanup();
    audio.tagAudioRef.mockRejectedValueOnce(new Error('You cannot tag this track.'));
    await open(true);
    fireEvent.click(screen.getByRole('button', { name: 'Tag Slow Radio' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save tags' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('You cannot tag this track.', 'error'));
  });

  it('removes a reference, and says so when that fails', async () => {
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Slow Radio' }));
    await waitFor(() => expect(audio.deleteAudioRef).toHaveBeenCalledWith('b'));
    expect(toast).toHaveBeenCalledWith('Removed from the library', 'success');
    audio.deleteAudioRef.mockRejectedValueOnce(new Error('denied'));
    fireEvent.click(screen.getByRole('button', { name: 'Remove Chase Theme' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Could not remove it: denied', 'error'));
  });

  it('does not offer to tag or remove an upload that is not a saved reference', async () => {
    await open();
    expect(screen.queryByRole('button', { name: 'Tag door.wav' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Remove door.wav' })).toBeNull();
  });
});
