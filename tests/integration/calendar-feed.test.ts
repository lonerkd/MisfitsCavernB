import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, anonClient, createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

// A calendar feed is read by a calendar app with no login, by its secret link. It must show a person only what they may
// already see (their own projects, call sheets only once issued, their own tasks), only to the exact token, and the token
// table must be readable and writable by its owner alone.
let cast: Cast;
let projectId: string;
let otherProjectId: string;
let samToken: string;
let jordanToken: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Feed'));
  // Riley's own project: Sam and Jordan must never see it in their feeds.
  const other = await cast.riley.client.from('projects').insert({ title: 'Riley only', creator_id: cast.riley.id }).select('id').single();
  if (other.error) throw other.error;
  otherProjectId = other.data.id;

  const admin = adminClient();
  const day1 = await admin.from('shoot_days').insert({ project_id: projectId, day_number: 1, shoot_date: '2026-12-01' }).select('id').single();
  const day2 = await admin.from('shoot_days').insert({ project_id: projectId, day_number: 2, shoot_date: '2026-12-02' }).select('id').single();
  if (day1.error || day2.error) throw day1.error ?? day2.error;
  await admin.from('shoot_days').insert({ project_id: otherProjectId, day_number: 1, shoot_date: '2026-12-09' });
  // Day 1's call sheet is issued, day 2's is a draft.
  const s1 = await admin.from('call_sheets').insert({ project_id: projectId, shoot_day: 1, shoot_day_id: day1.data!.id, shoot_date: '2026-12-01', general_call: '07:00', estimated_wrap: '19:00' }).select('id').single();
  if (s1.error) throw s1.error;
  const s2 = await admin.from('call_sheets').insert({ project_id: projectId, shoot_day: 2, shoot_day_id: day2.data!.id, shoot_date: '2026-12-02', general_call: '06:00' });
  if (s2.error) throw s2.error;
  // Jordan has an earlier personal call on day 1.
  const call = await admin.from('call_sheet_calls').insert({ project_id: projectId, call_sheet_id: s1.data!.id, crew_user_id: cast.jordan.id, call_time: '05:30' });
  if (call.error) throw call.error;
  // Call sheets are issued only through the function (the table refuses a direct issued_at).
  const issued = await cast.sam.client.rpc('issue_call_sheet', { p_sheet: s1.data!.id });
  if (issued.error) throw issued.error;
  await admin.from('project_tasks').insert([
    { project_id: projectId, title: 'Scout the pier', assigned_to: cast.jordan.id, due_date: '2026-11-30' },
    { project_id: projectId, title: 'Sam only task', assigned_to: cast.sam.id, due_date: '2026-11-29' },
    { project_id: projectId, title: 'Done task', assigned_to: cast.jordan.id, due_date: '2026-11-28', completed: true },
  ]);

  const a = await cast.sam.client.from('calendar_feeds').insert({ user_id: cast.sam.id }).select('token').single();
  const b = await cast.jordan.client.from('calendar_feeds').insert({ user_id: cast.jordan.id }).select('token').single();
  if (a.error || b.error) throw a.error ?? b.error;
  samToken = a.data.token;
  jordanToken = b.data.token;
});

afterAll(async () => {
  await destroyCast(cast);
});

const feed = async (token: string) => {
  const { data, error } = await anonClient().rpc('calendar_feed', { p_token: token });
  if (error) throw error;
  return data ?? [];
};

describe('the calendar feed', () => {
  it('shows the days, the issued call sheet and the person\'s own tasks, by the exact token, with no login', async () => {
    const rows = await feed(jordanToken);
    const summaries = rows.map((r) => r.summary).sort();
    // Day 1 is an issued call (not also a plain day); day 2 has only a draft sheet, so it is a plain day; one open task.
    expect(summaries).toEqual(['Call: day 1', 'Scout the pier', 'Shoot day 2']);
    const call = rows.find((r) => r.kind === 'call')!;
    expect(call.start_time).toBe('05:30:00'); // Jordan's own call beats the general call
    expect(call.end_time).toBe('19:00:00');
    const sam = await feed(samToken);
    expect(sam.find((r) => r.kind === 'call')!.start_time).toBe('07:00:00'); // no personal call: the general one
    expect(sam.map((r) => r.summary)).toContain('Sam only task');
    expect(sam.map((r) => r.summary)).not.toContain('Scout the pier');
  });

  it('never shows a project the person is not on', async () => {
    for (const token of [samToken, jordanToken]) {
      const titles = (await feed(token)).map((r) => r.project_title);
      expect(titles).not.toContain('Riley only');
    }
  });

  it('shows nothing for an unknown token', async () => {
    expect(await feed('00000000-0000-4000-8000-000000000000')).toEqual([]);
  });

  it('stops a revoked token and a switched-off feed', async () => {
    const fresh = await cast.jordan.client.from('calendar_feeds').update({ token: '11111111-1111-4111-8111-111111111111' }).eq('user_id', cast.jordan.id).select('token').single();
    expect(fresh.error).toBeNull();
    expect(await feed(jordanToken)).toEqual([]);
    expect((await feed('11111111-1111-4111-8111-111111111111')).length).toBeGreaterThan(0);
    await cast.jordan.client.from('calendar_feeds').delete().eq('user_id', cast.jordan.id);
    expect(await feed('11111111-1111-4111-8111-111111111111')).toEqual([]);
  });

  it('keeps the token table to its owner: Riley and anon cannot read or write Sam\'s row', async () => {
    const riley = await cast.riley.client.from('calendar_feeds').select('token').eq('user_id', cast.sam.id);
    expect(riley.data ?? []).toEqual([]);
    const anon = await anonClient().from('calendar_feeds').select('token');
    expect(anon.data ?? []).toEqual([]);
    const steal = await cast.riley.client.from('calendar_feeds').update({ token: '22222222-2222-4222-8222-222222222222' }).eq('user_id', cast.sam.id).select('token');
    expect(steal.data ?? []).toEqual([]);
    const forged = await cast.riley.client.from('calendar_feeds').insert({ user_id: cast.sam.id });
    expect(forged.error).not.toBeNull();
    expect((await feed(samToken)).length).toBeGreaterThan(0); // still Sam's
  });
});
