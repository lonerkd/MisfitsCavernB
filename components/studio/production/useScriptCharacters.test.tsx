// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';

const PODCAST = 'COLD OPEN\n\nHOST: Welcome back.\nGUEST: Glad to be here.\n';
vi.mock('@/lib/studio', () => ({ fetchScriptContent: vi.fn(async () => PODCAST) }));
vi.mock('@/lib/supabase/scripts', () => ({
  listScriptCharacters: vi.fn(async () => []),
  addScriptCharacter: vi.fn(),
  updateScriptCharacter: vi.fn(),
}));
import { useScriptCharacters } from './useScriptCharacters';

afterEach(cleanup);

describe('the Studio cast list reads a script with its own rules', () => {
  it('a podcast script lists both speakers; read as a screenplay it would list none', async () => {
    const podcast = renderHook(() => useScriptCharacters('s1', 'u1', 'podcast'));
    await waitFor(() => expect(podcast.result.current.status).toBe('ready'));
    expect(podcast.result.current.chars.map((c) => c.name).sort()).toEqual(['GUEST', 'HOST']);

    const asScreenplay = renderHook(() => useScriptCharacters('s1', 'u1', null));
    await waitFor(() => expect(asScreenplay.result.current.status).toBe('ready'));
    expect(asScreenplay.result.current.chars.map((c) => c.name)).not.toContain('GUEST');
  });
});
