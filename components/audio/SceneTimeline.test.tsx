// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const spotify = { playUri: vi.fn() };
const audio = vi.hoisted(() => ({
  listAudioRefs: vi.fn(), listProjectScripts: vi.fn(), loadScriptForTimeline: vi.fn(), moveAudioRefScene: vi.fn(), tagAudioRef: vi.fn(), deleteAudioRef: vi.fn(),
}));
const toast = vi.fn();
const undo = vi.hoisted(() => ({ pushUndo: vi.fn(), undoOrigin: vi.fn(() => ({ scope: 'soundtrack' })) }));
vi.mock('@/lib/os/SpotifyContext', () => ({ useSpotify: () => spotify }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/lib/supabase/client', () => ({ supabase: {} }));
vi.mock('@/lib/supabase/audio', async (orig) => ({ ...(await orig<typeof import('@/lib/supabase/audio')>()), ...audio }));
vi.mock('@/lib/os/undo', async (orig) => ({ ...(await orig<typeof import('@/lib/os/undo')>()), ...undo }));
import { SceneTimeline } from './SceneTimeline';

const script = 'INT. KITCHEN - DAY\n\nHe runs. Guns fire. A chase.\n\nEXT. GARDEN - NIGHT\n\nShe waits in silence.\n';
const scenes = [
  { id: 's1', scene_number: 1, heading: 'INT. KITCHEN - DAY', time_of_day: 'DAY', est_duration: '16/8', read_seconds: null },
  { id: 's2', scene_number: 2, heading: 'EXT. GARDEN - NIGHT', time_of_day: 'NIGHT', est_duration: '8/8', read_seconds: null },
];
const refs = [{ id: 'r1', project_id: 'p', reference_type: 'spotify', uri: 'spotify:track:1', title: 'Chase Theme', for_scene: 's1', role: 'theme', tags: ['tense'], description: null }];

beforeEach(() => {
  audio.listProjectScripts.mockResolvedValue([{ id: 'sc', title: 'Pilot', updated_at: null }]);
  audio.loadScriptForTimeline.mockResolvedValue({ content: script, scenes });
  audio.listAudioRefs.mockResolvedValue(refs);
  audio.moveAudioRefScene.mockResolvedValue(true);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const open = async (canTag = true, onFind = vi.fn()) => {
  render(<SceneTimeline projectId="p" projectTitle="Undertow" canTag={canTag} onFind={onFind} />);
  await screen.findByRole('button', { name: /^Scene 1,/ });
  return onFind;
};

describe('SceneTimeline', () => {
  it('draws each scene with its mood, length and whether it has music', async () => {
    await open();
    expect(screen.getByRole('button', { name: 'Scene 1, Action, 2:00, 1 track' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Scene 2, .*1:00, no music$/ })).toBeTruthy();
    expect(screen.getByText('2 scenes, 3:00 · 1 with no music')).toBeTruthy();
  });

  it('opens a scene’s detail with its tracks, and "Find music" hands the mood’s search and the scene to the page', async () => {
    const onFind = await open();
    fireEvent.click(screen.getByRole('button', { name: /^Scene 1,/ }));
    const detail = within(screen.getByRole('region', { name: 'Scene 1' }));
    expect(detail.getByText('Chase Theme')).toBeTruthy();
    expect(detail.getByText(/Length estimated from page length/)).toBeTruthy();
    fireEvent.click(detail.getByRole('button', { name: /Find music for this scene/ }));
    expect(onFind).toHaveBeenCalledWith('action chase film score', 's1');
  });

  it('says so when a scene has no music', async () => {
    await open();
    fireEvent.click(screen.getByRole('button', { name: /^Scene 2,/ }));
    expect(within(screen.getByRole('region', { name: 'Scene 2' })).getByText('No music in this scene yet.')).toBeTruthy();
  });

  it('plays a bar through Spotify', async () => {
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Chase Theme, in scene 1' }));
    expect(spotify.playUri).toHaveBeenCalledWith('spotify:track:1');
  });

  it('drags a bar to another scene (one conditional write) and offers an undo that moves it back', async () => {
    await open();
    const bar = screen.getByRole('button', { name: 'Chase Theme, in scene 1' });
    const lane = bar.parentElement!;
    const cell = lane.querySelectorAll('div')[1]; // scene 2's drop cell
    fireEvent.dragStart(bar);
    fireEvent.dragOver(cell);
    fireEvent.drop(cell);
    await waitFor(() => expect(audio.moveAudioRefScene).toHaveBeenCalledWith('r1', 's1', 's2'));
    expect(undo.pushUndo).toHaveBeenCalledOnce();
    await undo.pushUndo.mock.calls[0][1]();
    expect(audio.moveAudioRefScene).toHaveBeenLastCalledWith('r1', 's2', 's1');
  });

  it('says nothing moved when the track changed since it was seen', async () => {
    audio.moveAudioRefScene.mockResolvedValueOnce(false);
    await open();
    const bar = screen.getByRole('button', { name: 'Chase Theme, in scene 1' });
    fireEvent.dragStart(bar);
    fireEvent.drop(bar.parentElement!.querySelectorAll('div')[1]);
    await waitFor(() => expect(toast).toHaveBeenCalledWith('That track was changed (or you cannot edit it), so nothing moved.', 'error'));
    expect(undo.pushUndo).not.toHaveBeenCalled();
  });

  it('gives someone who may not tag a read-only timeline: no drag, no Tag or Remove', async () => {
    await open(false);
    const bar = screen.getByRole('button', { name: 'Chase Theme, in scene 1' });
    expect(bar.getAttribute('draggable')).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: /^Scene 1,/ }));
    const detail = within(screen.getByRole('region', { name: 'Scene 1' }));
    expect(detail.queryByRole('button', { name: 'Tag' })).toBeNull();
    expect(detail.queryByRole('button', { name: 'Remove Chase Theme' })).toBeNull();
  });

  it('says so for a script with no scenes', async () => {
    audio.loadScriptForTimeline.mockResolvedValue({ content: '', scenes: [] });
    render(<SceneTimeline projectId="p" projectTitle="Undertow" canTag onFind={vi.fn()} />);
    expect(await screen.findByText(/This script has no scenes yet/)).toBeTruthy();
  });
});
