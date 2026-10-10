import { describe, expect, it, vi } from 'vitest';
import { useFake } from '@/tests/unit-support/fakeSupabase';

vi.mock('./client', async () => ({ supabase: (await import('@/tests/unit-support/fakeSupabase')).supabaseProxy }));

import { getTodayWork, nameUnread } from './today';

const boom = { message: 'nope' };

describe('getTodayWork', () => {
  it('lists the sheets and tasks and keys my calls by call sheet', async () => {
    useFake({
      call_sheets: { data: [{ id: 'c1', shoot_date: '2026-10-12' }] },
      call_sheet_calls: { data: [{ call_sheet_id: 'c1', call_time: '06:30' }, { call_sheet_id: 'c2', call_time: null }] },
      project_tasks: { data: [{ id: 't1', title: 'Return the lens' }] },
    });
    const w = await getTodayWork('u1', ['p1'], '2026-10-10');
    expect(w.sheets).toHaveLength(1);
    expect(w.myCalls).toEqual({ c1: '06:30', c2: null });
    expect(w.tasks).toHaveLength(1);
  });

  it('reads no sheets or tasks for a person with no projects', async () => {
    const f = useFake({ call_sheet_calls: { data: [] } });
    const w = await getTodayWork('u1', [], '2026-10-10');
    expect(w).toEqual({ sheets: [], myCalls: {}, tasks: [] });
    expect(f.calls.some((c) => c.table === 'call_sheets' || c.table === 'project_tasks')).toBe(false);
  });

  it('asks only for upcoming sheets, and for my open tasks', async () => {
    const f = useFake({});
    await getTodayWork('u1', ['p1'], '2026-10-10');
    expect(f.argsOf('call_sheets', 'gte')[0]).toEqual(['shoot_date', '2026-10-10']);
    expect(f.argsOf('project_tasks', 'eq')).toEqual([['assigned_to', 'u1'], ['completed', false]]);
  });

  it('throws when any part fails', async () => {
    useFake({ call_sheet_calls: { error: boom } });
    await expect(getTodayWork('u1', ['p1'], '2026-10-10')).rejects.toBe(boom);
  });
});

describe('nameUnread', () => {
  it('names the unread channels and people', async () => {
    useFake({
      channels: { data: [{ id: 'ch1', name: 'general', project_id: null }] },
      profiles: { data: [{ id: 'u2', username: 'sam' }] },
    });
    const n = await nameUnread({ channels: { ch1: 2 }, people: { u2: 1 } } as never);
    expect(n.channels[0].name).toBe('general');
    expect(n.people[0].username).toBe('sam');
  });

  it('reads nothing when nothing is unread', async () => {
    const f = useFake();
    expect(await nameUnread({ channels: {}, people: {} } as never)).toEqual({ channels: [], people: [] });
    expect(f.calls).toEqual([]);
  });

  it('throws when a read fails', async () => {
    useFake({ channels: { error: boom } });
    await expect(nameUnread({ channels: { a: 1 }, people: {} } as never)).rejects.toBe(boom);
    useFake({ profiles: { error: boom } });
    await expect(nameUnread({ channels: {}, people: { a: 1 } } as never)).rejects.toBe(boom);
  });
});
