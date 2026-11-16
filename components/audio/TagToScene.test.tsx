// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';

const toast = vi.fn();
const placeTrackInScene = vi.fn();
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/lib/supabase/client', () => ({ supabase: {} }));
vi.mock('@/lib/supabase/audio', () => ({ placeTrackInScene: (...a: unknown[]) => placeTrackInScene(...a) }));

import { TagToScene } from './TagToScene';

const scenes = [{ id: 's1', label: '1 · INT. KITCHEN - DAY' }, { id: 's2', label: '2 · EXT. ROOF - NIGHT' }];
const track = { uri: 'spotify:track:abc', name: 'Night Drive', artist: 'Kavinsky' };

describe('TagToScene', () => {
  beforeEach(() => { cleanup(); toast.mockReset(); placeTrackInScene.mockReset(); });

  it('starts on the scene Find was opened for, and tags it in one tap', async () => {
    placeTrackInScene.mockResolvedValue('tagged');
    const onPlaced = vi.fn();
    render(<TagToScene projectId="p1" userId="u1" scenes={scenes} initialSceneId="s2" track={track} onPlaced={onPlaced} />);
    expect((screen.getByLabelText('Scene for Night Drive') as HTMLSelectElement).value).toBe('s2');
    fireEvent.click(screen.getByRole('button', { name: /tag/i }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Tagged to 2 · EXT. ROOF - NIGHT', 'success'));
    expect(placeTrackInScene).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'p1', uri: 'spotify:track:abc', sceneId: 's2', title: 'Night Drive — Kavinsky' }));
    expect(onPlaced).toHaveBeenCalled();
  });

  it('cannot tag until a scene is picked', () => {
    render(<TagToScene projectId="p1" userId="u1" scenes={scenes} initialSceneId={null} track={track} />);
    expect((screen.getByRole('button', { name: /tag/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('says when the track moved from another scene, or was already there', async () => {
    placeTrackInScene.mockResolvedValueOnce('moved').mockResolvedValueOnce('already');
    render(<TagToScene projectId="p1" userId="u1" scenes={scenes} initialSceneId="s1" track={track} />);
    fireEvent.click(screen.getByRole('button', { name: /tag/i }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Moved to 1 · INT. KITCHEN - DAY (it was tagged to another scene)', 'success'));
    fireEvent.click(screen.getByRole('button', { name: /tag/i }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Already in 1 · INT. KITCHEN - DAY', 'success'));
  });

  it('tells the person when the save fails', async () => {
    placeTrackInScene.mockRejectedValue(new Error('You cannot tag this track.'));
    render(<TagToScene projectId="p1" userId="u1" scenes={scenes} initialSceneId="s1" track={track} />);
    fireEvent.click(screen.getByRole('button', { name: /tag/i }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('You cannot tag this track.', 'error'));
  });

  it('shows nothing for a project with no scenes', () => {
    const { container } = render(<TagToScene projectId="p1" userId="u1" scenes={[]} initialSceneId={null} track={track} />);
    expect(container.innerHTML).toBe('');
  });
});
