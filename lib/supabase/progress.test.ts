import { afterEach, describe, expect, it, vi } from 'vitest';
import { useFake } from '@/tests/unit-support/fakeSupabase';

vi.mock('./client', async () => ({ supabase: (await import('@/tests/unit-support/fakeSupabase')).supabaseProxy }));

import {
  PROGRESS_EVENT, announceProgressChange, fetchProjectSignals, fetchProjectsSignals, patchProjectSettings, setProjectArchived,
  setProjectFormat, setProjectLogline, setProjectPhase, setUnlockAllTools,
} from './progress';

const boom = { message: 'rls says no' };
const owned = { data: [{ id: 'p1' }] };

afterEach(() => vi.unstubAllGlobals());

function listenForEvents() {
  const heard: unknown[] = [];
  vi.stubGlobal('window', { dispatchEvent: (e: CustomEvent) => heard.push(e.detail) });
  return heard;
}

describe('announceProgressChange', () => {
  it('tells every panel which project changed', () => {
    const heard = listenForEvents();
    announceProgressChange('p1');
    expect(heard).toEqual([{ projectId: 'p1' }]);
    expect(PROGRESS_EVENT).toBe('mc-progress-refresh');
  });

  it('does nothing without a window (server)', () => {
    expect(() => announceProgressChange('p1')).not.toThrow();
  });
});

describe('fetchProjectSignals', () => {
  it('is null when the caller cannot see the project', async () => {
    useFake({}, { project_progress: { data: null } });
    expect(await fetchProjectSignals('p1')).toBeNull();
  });

  it('normalises what the database sends', async () => {
    useFake({}, { project_progress: { data: { scripts: '3', has_logline: true } } });
    const s = await fetchProjectSignals('p1');
    expect(s).not.toBeNull();
    expect(Number((s as unknown as Record<string, unknown>).scripts)).toBe(3);
  });

  it('throws with the database message, or a plain one', async () => {
    useFake({}, { project_progress: { error: boom } });
    await expect(fetchProjectSignals('p1')).rejects.toThrow('rls says no');
    useFake({}, { project_progress: { error: { message: '' } } });
    await expect(fetchProjectSignals('p1')).rejects.toThrow('Could not load project progress');
  });
});

describe('fetchProjectsSignals', () => {
  it('asks for nothing when there are no projects', async () => {
    const f = useFake();
    expect(await fetchProjectsSignals([])).toEqual({});
    expect(f.calls).toEqual([]);
  });

  it('asks for at most 200 projects, and leaves out the ones it cannot see', async () => {
    const f = useFake({}, { projects_progress: { data: { a: { scripts: 1 }, b: null } } });
    const ids = Array.from({ length: 250 }, (_, i) => `p${i}`);
    const out = await fetchProjectsSignals(ids);
    expect(Object.keys(out)).toEqual(['a']);
    expect((f.calls[0].args[0] as { p_projects: string[] }).p_projects).toHaveLength(200);
  });

  it('throws on an error', async () => {
    useFake({}, { projects_progress: { error: boom } });
    await expect(fetchProjectsSignals(['a'])).rejects.toThrow('rls says no');
  });
});

describe('owner-only changes', () => {
  it('setProjectPhase writes the status the phase maps to, then announces', async () => {
    const heard = listenForEvents();
    const f = useFake({ projects: owned });
    await setProjectPhase('p1', 'delivery');
    expect(f.argsOf('projects', 'update')[0]).toEqual([{ status: 'completed' }]);
    expect(heard).toEqual([{ projectId: 'p1' }]);
  });

  it('a non-owner updates zero rows: it says so and announces nothing', async () => {
    const heard = listenForEvents();
    useFake({ projects: { data: [] } });
    await expect(setProjectPhase('p1', 'production')).rejects.toThrow('Only the project owner can change its phase');
    await expect(setProjectFormat('p1', 'Short')).rejects.toThrow('Only the project owner can change its format');
    await expect(setProjectLogline('p1', 'x')).rejects.toThrow('Only the project owner can change the logline');
    await expect(setProjectArchived('p1', true)).rejects.toThrow('Only the project owner can archive it');
    expect(heard).toEqual([]);
  });

  it('a failed write throws the database message', async () => {
    useFake({ projects: { error: boom } });
    await expect(setProjectFormat('p1', 'Short')).rejects.toThrow('rls says no');
  });

  it('setProjectLogline trims', async () => {
    const f = useFake({ projects: owned });
    await setProjectLogline('p1', '  A cook finds a map.  ');
    expect(f.argsOf('projects', 'update')[0]).toEqual([{ description: 'A cook finds a map.' }]);
  });

  it('setProjectArchived stamps a time to shelve and null to bring back', async () => {
    const f = useFake({ projects: owned });
    await setProjectArchived('p1', true);
    await setProjectArchived('p1', false);
    const [shelve, restore] = f.argsOf('projects', 'update').map((a) => (a[0] as { archived_at: string | null }).archived_at);
    expect(Number.isNaN(Date.parse(shelve as string))).toBe(false);
    expect(restore).toBeNull();
  });
});

describe('patchProjectSettings', () => {
  it('merges the patch into what is saved, and returns the result', async () => {
    const f = useFake({ projects: [{ data: { settings: { dayLength: 5, unlockAllTools: false } } }, owned] });
    const merged = await patchProjectSettings('p1', { unlockAllTools: true });
    expect(merged).toEqual({ dayLength: 5, unlockAllTools: true });
    expect(f.argsOf('projects', 'update')[0]).toEqual([{ settings: merged }]);
  });

  it('starts from nothing when no settings are saved yet', async () => {
    useFake({ projects: [{ data: { settings: null } }, owned] });
    expect(await patchProjectSettings('p1', { unlockAllTools: true })).toEqual({ unlockAllTools: true });
  });

  it('fails when it cannot read the settings, or is not the owner', async () => {
    useFake({ projects: { error: boom } });
    await expect(patchProjectSettings('p1', {})).rejects.toThrow('rls says no');
    useFake({ projects: [{ data: { settings: {} } }, { data: [] }] });
    await expect(patchProjectSettings('p1', {})).rejects.toThrow('Only the project owner can change this');
  });

  it('setUnlockAllTools goes through it', async () => {
    const f = useFake({ projects: [{ data: { settings: {} } }, owned] });
    await setUnlockAllTools('p1', true);
    expect(f.argsOf('projects', 'update')[0]).toEqual([{ settings: { unlockAllTools: true } }]);
  });
});
