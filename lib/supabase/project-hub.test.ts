import { describe, expect, it, vi } from 'vitest';
import { useFake } from '@/tests/unit-support/fakeSupabase';

vi.mock('./client', async () => ({ supabase: (await import('@/tests/unit-support/fakeSupabase')).supabaseProxy }));

import {
  addCrewByUsername, addTask, getProductionData, getProductionFeed, getProjectOverview, getProjectRow, saveFestivals, setBudgetActual,
} from './project-hub';

const boom = { message: 'permission denied' };

describe('getProjectOverview', () => {
  it('sums the scene index in eighths and counts what is done', async () => {
    useFake({
      scripts: { data: [{ id: 's1' }, { id: 's2' }] },
      project_tasks: { data: [{ completed: true }, { completed: false }, { completed: true }] },
      budget_items: { data: [{ amount: 100 }, { amount: '250.5' }, { amount: null }] },
      scenes: { data: [{ est_duration: '3/8' }, { est_duration: '1 2/8' }, { est_duration: '' }, { est_duration: null }] },
      media: { count: 7 },
      campaigns: { count: 2 },
      project_crew: { data: [
        { user_id: 'a', role: 'lead', craft: null, profiles: { username: 'maya' } },
        { user_id: 'b', role: 'contributor', craft: 'Gaffer', profiles: null },
        { user_id: 'c', role: 'viewer', craft: null, profiles: { username: 'sam' } },
      ] },
      projects: { data: { festival_submissions: [{ status: 'accepted' }] } },
    });
    const o = await getProjectOverview('p1');
    expect(o.scripts).toBe(2);
    expect(o.scenes).toBe(4);
    expect(o.eighths).toBe(5); // 3/8, and the 2/8 inside "1 2/8"
    expect(o.tasks).toBe(3);
    expect(o.tasksDone).toBe(2);
    expect(o.budget).toBe(350.5);
    expect(o.concepts).toBe(7);
    expect(o.campaigns).toBe(2);
    expect(o.crew).toEqual([
      { id: 'a', name: 'maya', role: 'Lead' },
      { id: 'b', name: 'Crew', role: 'Gaffer' },
      { id: 'c', name: 'sam', role: 'Crew' },
    ]);
    expect(o.festivals).toEqual([{ status: 'accepted' }]);
  });

  it('is empty, not broken, for a project with nothing in it', async () => {
    useFake({});
    const o = await getProjectOverview('p1');
    expect(o).toMatchObject({ scripts: 0, scenes: 0, eighths: 0, tasks: 0, budget: 0, concepts: 0, campaigns: 0, festivals: [], crew: [] });
  });

  it('ignores a festival list that is not a list', async () => {
    useFake({ projects: { data: { festival_submissions: { oops: true } } } });
    expect((await getProjectOverview('p1')).festivals).toEqual([]);
  });

  it('throws when any read fails, rather than showing a partial page', async () => {
    useFake({ budget_items: { error: boom } });
    await expect(getProjectOverview('p1')).rejects.toBe(boom);
  });
});

describe('getProjectRow', () => {
  it('returns the row, or null when it cannot be seen', async () => {
    useFake({ projects: { data: { id: 'p1' } } });
    expect(await getProjectRow('p1')).toEqual({ id: 'p1' });
    useFake({ projects: { data: null } });
    expect(await getProjectRow('p1')).toBeNull();
  });

  it('throws on an error', async () => {
    useFake({ projects: { error: boom } });
    await expect(getProjectRow('p1')).rejects.toBe(boom);
  });
});

describe('getProductionData', () => {
  it('reads the owner so they can be given tasks', async () => {
    useFake({
      projects: { data: { settings: { dayLength: 5 }, festival_submissions: null, creator_id: 'o1' } },
      profiles: { data: { id: 'o1', username: 'owner', extra: 'x' } },
    });
    const d = await getProductionData('p1');
    expect(d.owner).toEqual({ id: 'o1', username: 'owner' });
    expect(d.settings).toEqual({ dayLength: 5 });
    expect(d.festivals).toEqual([]);
  });

  it('has no owner when their profile is gone, and reads no profile without a creator', async () => {
    const f = useFake({ projects: { data: { creator_id: 'o1' } }, profiles: { data: null } });
    expect((await getProductionData('p1')).owner).toBeNull();
    expect(f.calls.some((c) => c.table === 'profiles')).toBe(true);
    const g = useFake({ projects: { data: { creator_id: null } } });
    expect((await getProductionData('p1')).owner).toBeNull();
    expect(g.calls.some((c) => c.table === 'profiles')).toBe(false);
  });

  it('throws when the owner read fails', async () => {
    useFake({ projects: { data: { creator_id: 'o1' } }, profiles: { error: boom } });
    await expect(getProductionData('p1')).rejects.toBe(boom);
  });
});

describe('writes', () => {
  it('addTask inserts into the project and returns the saved row', async () => {
    const f = useFake({ project_tasks: { data: { id: 't1', title: 'Scout' } } });
    expect(await addTask('p1', 'Scout')).toEqual({ id: 't1', title: 'Scout' });
    expect(f.argsOf('project_tasks', 'insert')[0]).toEqual([{ project_id: 'p1', title: 'Scout' }]);
  });

  it('setBudgetActual clears with null', async () => {
    const f = useFake({ budget_items: {} });
    await setBudgetActual('b1', null);
    expect(f.argsOf('budget_items', 'update')[0]).toEqual([{ actual_cost: null }]);
  });

  it('saveFestivals writes the whole list', async () => {
    const f = useFake({ projects: {} });
    const list = [{ id: 'f1', name: 'Sundance', status: 'planned' as const }];
    await saveFestivals('p1', list);
    expect(f.argsOf('projects', 'update')[0]).toEqual([{ festival_submissions: list }]);
  });

  it('a failed write throws', async () => {
    useFake({ project_tasks: { error: boom } });
    await expect(addTask('p1', 'x')).rejects.toBe(boom);
  });
});

describe('addCrewByUsername', () => {
  it('says so when there is no such person, and adds nothing', async () => {
    const f = useFake({ profiles: { data: null } });
    expect(await addCrewByUsername('p1', 'nobody', null)).toBe('no-user');
    expect(f.argsOf('project_crew', 'insert')).toEqual([]);
  });

  it('adds the person with their craft, matching the trimmed name', async () => {
    const f = useFake({ profiles: { data: { id: 'u9' } }, project_crew: {} });
    expect(await addCrewByUsername('p1', '  maya ', 'Gaffer')).toBe('added');
    expect(f.argsOf('profiles', 'eq')[0]).toEqual(['username', 'maya']);
    expect(f.argsOf('project_crew', 'insert')[0]).toEqual([{ project_id: 'p1', user_id: 'u9', craft: 'Gaffer' }]);
  });
});

describe('getProductionFeed', () => {
  it('merges the lists newest first and labels each kind', async () => {
    useFake({
      scenes: { data: [{ title: 'INT. KITCHEN', created_at: '2026-10-01T10:00:00Z' }] },
      budget_items: { data: [{ category: 'Camera', created_at: '2026-10-03T10:00:00Z' }] },
      timeline_items: { data: [{ title: 'Lock picture', created_at: '2026-10-02T10:00:00Z' }] },
      project_crew: { data: [{ created_at: '2026-10-04T10:00:00Z', profiles: null }] },
      media: { data: [{ title: null, created_at: '2026-10-05T10:00:00Z' }] },
      script_annotations: { data: [{ type: 'shot', text: 'Dolly in', created_at: '2026-10-06T10:00:00Z' }] },
    });
    const feed = await getProductionFeed('p1', 5);
    expect(feed.map((x) => x.label)).toEqual([
      'Script shot — "Dolly in"',
      'Reference — untitled',
      'Crew — member',
      'Budget — Camera',
      'Milestone — Lock picture',
    ]);
  });

  it('throws when a list fails to load', async () => {
    useFake({ media: { error: boom } });
    await expect(getProductionFeed('p1')).rejects.toBe(boom);
  });
});
