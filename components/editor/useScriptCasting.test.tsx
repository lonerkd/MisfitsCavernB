// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';

const toast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));
const os = vi.hoisted(() => ({ awaitOSUser: vi.fn() }));
vi.mock('@/lib/os', () => os);
const casting = vi.hoisted(() => ({ getCastingsForProject: vi.fn(), setCasting: vi.fn(), removeCasting: vi.fn() }));
vi.mock('@/lib/supabase/casting', () => casting);
const crew = vi.hoisted(() => ({ getProjectCrew: vi.fn() }));
vi.mock('@/lib/supabase/crew-management', () => crew);

import { useScriptCasting } from './useScriptCasting';

const MAYA = { id: 'c1', project_id: 'p1', character_name: 'MAYA', crew_user_id: 'u1', created_at: '' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  os.awaitOSUser.mockResolvedValue({ id: 'me' });
  casting.getCastingsForProject.mockResolvedValue({ MAYA });
  crew.getProjectCrew.mockResolvedValue([{ user_id: 'u1', status: 'confirmed' }]);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('useScriptCasting', () => {
  it('loads a project’s castings and people, and none without a project', async () => {
    const { result, rerender } = renderHook(({ id }) => useScriptCasting(id), { initialProps: { id: 'p1' as string | undefined } });
    await waitFor(() => expect(result.current.castings).toEqual({ MAYA }));
    expect(result.current.projectCrew).toHaveLength(1);
    rerender({ id: undefined });
    await waitFor(() => expect(result.current.castings).toEqual({}));
    expect(result.current.projectCrew).toEqual([]);
  });

  it('casts someone, then shows the project’s castings as saved', async () => {
    const { result } = renderHook(() => useScriptCasting('p1'));
    await waitFor(() => expect(result.current.castings).toEqual({ MAYA }));
    casting.getCastingsForProject.mockResolvedValue({ MAYA, LEO: { ...MAYA, id: 'c2', character_name: 'LEO' } });
    await act(async () => { await result.current.castCharacter('LEO', 'u2'); });
    expect(casting.setCasting).toHaveBeenCalledWith('p1', 'LEO', 'u2', 'me');
    expect(Object.keys(result.current.castings).sort()).toEqual(['LEO', 'MAYA']);
  });

  it('clears a casting when no one is chosen', async () => {
    const { result } = renderHook(() => useScriptCasting('p1'));
    await waitFor(() => expect(result.current.castings).toEqual({ MAYA }));
    await act(async () => { await result.current.castCharacter('maya', ''); });
    expect(casting.removeCasting).toHaveBeenCalledWith('p1', 'maya');
    expect(result.current.castings).toEqual({});
  });

  it('says why it could not cast (database errors are plain objects), and does nothing signed out or without a project', async () => {
    const { result } = renderHook(() => useScriptCasting('p1'));
    await waitFor(() => expect(result.current.castings).toEqual({ MAYA }));
    casting.setCasting.mockRejectedValue({ message: 'not allowed' });
    await act(async () => { await result.current.castCharacter('LEO', 'u2'); });
    expect(toast).toHaveBeenCalledWith('not allowed', 'error');

    vi.clearAllMocks();
    os.awaitOSUser.mockResolvedValue(null);
    await act(async () => { await result.current.castCharacter('LEO', 'u2'); });
    expect(casting.setCasting).not.toHaveBeenCalled();

    const none = renderHook(() => useScriptCasting(undefined));
    await act(async () => { await none.result.current.castCharacter('LEO', 'u2'); });
    expect(casting.setCasting).not.toHaveBeenCalled();
  });
});
