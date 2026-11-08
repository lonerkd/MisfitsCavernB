import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';
import { createStudioApi } from '@/lib/studio/api';

// The narrow read of a shoot day's clock that the island makes on every page of a shoot day: the owner and crew read
// the day's call sheet and the clock stamps (and only those: not the notes in the set log); an outsider reads nothing.
let cast: Cast;
let projectId: string;
let sheetId: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Day clock'));
  sheetId = (await cast.sam.client.from('call_sheets').insert({ project_id: projectId, shoot_day: 1, shoot_date: '2026-12-01', estimated_wrap: '19:00:00' }).select('id').single()).data!.id;
  const ins = await cast.sam.client.from('set_log').insert([
    { project_id: projectId, call_sheet_id: sheetId, kind: 'call', at: '2026-12-01T06:30:00Z' },
    { project_id: projectId, call_sheet_id: sheetId, kind: 'rolling', at: '2026-12-01T07:10:00Z' },
    { project_id: projectId, call_sheet_id: sheetId, kind: 'note', at: '2026-12-01T08:00:00Z', body: 'Private note about the day' },
  ]);
  expect(ins.error).toBeNull();
});
afterAll(async () => { await destroyCast(cast); });

describe('getDayClock', () => {
  it('the owner and a crew member read the day’s sheet and its clock stamps, without the notes', async () => {
    for (const who of [cast.sam, cast.jordan]) {
      const day = await createStudioApi(who.client).getDayClock(projectId, 1);
      expect(day.sheet).toMatchObject({ id: sheetId, shoot_date: '2026-12-01', estimated_wrap: '19:00:00' });
      expect(day.rows.map((r) => r.kind).sort()).toEqual(['call', 'rolling']);
      expect(JSON.stringify(day)).not.toContain('Private note');
    }
  });

  it('a day with no call sheet has no clock', async () => {
    expect(await createStudioApi(cast.sam.client).getDayClock(projectId, 2)).toEqual({ sheet: null, rows: [] });
  });

  it('an outsider reads nothing', async () => {
    expect(await createStudioApi(cast.riley.client).getDayClock(projectId, 1)).toEqual({ sheet: null, rows: [] });
  });
});
