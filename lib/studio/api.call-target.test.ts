import { describe, expect, it, vi } from 'vitest';
import { createFakeSupabase } from '@/tests/unit-support/fakeSupabase';
import type { Client } from './api';

vi.mock('@/lib/supabase/activity', () => ({ logActivity: vi.fn() }));

import { createStudioApi, findCall, type CallSheetCall } from './api';

const call = (patch: Partial<CallSheetCall>): CallSheetCall => ({
  id: 'call-1', call_sheet_id: 'sheet-1', project_id: 'p1', crew_user_id: null, character_id: null,
  character_name: null, call_time: null, remarks: null, role_label: null, created_at: null, ...patch,
} as CallSheetCall);

describe('findCall — draft calls are matched by id, not by name', () => {
  it('matches a crew call by user id and a cast call by character id', () => {
    const rows = [
      call({ id: 'a', crew_user_id: 'u1', call_time: '05:45' }),
      call({ id: 'b', character_id: 'c1', character_name: 'MAYA', call_time: '06:30' }),
    ];
    expect(findCall(rows, { crew_user_id: 'u1' })?.id).toBe('a');
    expect(findCall(rows, { character_id: 'c1', character_name: 'MAYA' })?.id).toBe('b');
    expect(findCall(rows, { crew_user_id: 'u9' })).toBeUndefined();
  });

  it('does not cross two characters who share a name: the id decides', () => {
    const rows = [
      call({ id: 'a', character_id: 'c1', character_name: 'SAM', call_time: '06:00' }),
      call({ id: 'b', character_id: 'c9', character_name: 'SAM', call_time: '07:00' }),
    ];
    expect(findCall(rows, { character_id: 'c9', character_name: 'SAM' })?.call_time).toBe('07:00');
    // A stale name on the target (the character was renamed) still finds its call by id.
    expect(findCall(rows, { character_id: 'c1', character_name: 'SAM OLD' })?.id).toBe('a');
    // No id match, no call — the name alone never claims another character’s call.
    expect(findCall(rows, { character_id: 'gone', character_name: 'SAM' })).toBeUndefined();
  });
});

function apiFor(results: Parameters<typeof createFakeSupabase>[0] = {}) {
  const fake = createFakeSupabase(results);
  return { api: createStudioApi(fake.client as unknown as Client), fake };
}

describe('saveCall — a cast call is written with its character id and its name label', () => {
  it('inserts character_id alongside character_name (the trigger derives the id from the name, so both agree)', async () => {
    const saved = call({ character_id: 'c1', character_name: 'MAYA', call_time: '06:30' });
    const { api, fake } = apiFor({ call_sheet_calls: { data: saved, error: null } });
    const row = await api.saveCall(
      { id: 'sheet-1', project_id: 'p1' },
      { character_id: 'c1', character_name: 'MAYA' },
      undefined,
      { call_time: '06:30', remarks: null },
    );
    expect(row).toEqual(saved);
    expect(fake.argsOf('call_sheet_calls', 'insert')[0][0]).toMatchObject({
      call_sheet_id: 'sheet-1', project_id: 'p1', character_id: 'c1', character_name: 'MAYA', call_time: '06:30',
    });
  });

  it('a crew call is written by user id, with no character fields', async () => {
    const saved = call({ crew_user_id: 'u1', call_time: '05:45' });
    const { api, fake } = apiFor({ call_sheet_calls: { data: saved, error: null } });
    await api.saveCall({ id: 'sheet-1', project_id: 'p1' }, { crew_user_id: 'u1' }, undefined, { call_time: '05:45', remarks: null });
    expect(fake.argsOf('call_sheet_calls', 'insert')[0][0]).toMatchObject({ crew_user_id: 'u1' });
    expect(fake.argsOf('call_sheet_calls', 'insert')[0][0]).not.toHaveProperty('character_id');
  });
});

describe('getCallSheetView — a scene’s place comes through its linked location', () => {
  const sheet = { id: 'sheet-1', project_id: 'p1', shoot_day: 1, version: 1, issued: null };
  const scene = (patch: Record<string, unknown>) => ({
    id: 's1', scene_number: 1, ordinal: 0, script_id: 'sc1', heading: 'INT. HARBOR - DAY', title: 'Scene 1',
    location: 'HARBOR', location_id: null, est_duration: null, scene_characters: [], ...patch,
  });

  it('shows the linked record’s current name, and the heading text when there is no link', async () => {
    const { api, fake } = apiFor({
      call_sheets: { data: sheet, error: null },
      projects: { data: { id: 'p1', title: 'Night Shift', creator_id: 'owner-1' }, error: null },
      profiles: { data: { id: 'owner-1', username: 'Sam' }, error: null },
      call_sheet_calls: { data: [], error: null },
      scenes: {
        data: [
          scene({ id: 's1', location_id: 'loc-1' }),
          scene({ id: 's2', scene_number: 2, location: 'Old Pier', location_id: null }),
          scene({ id: 's3', scene_number: 3, location: 'Gone Place', location_id: 'loc-gone' }),
        ],
        error: null,
      },
      project_locations: { data: [{ id: 'loc-1', name: 'Dock Office' }], error: null },
      project_crew: { data: [], error: null },
      character_castings: { data: [], error: null },
      call_sheet_acks: { data: null, error: null },
    });
    const view = await api.getCallSheetView('sheet-1', 'u1');
    // The scenes query must ask for the link, and the places must be read, or there is nothing to resolve through.
    expect(fake.argsOf('scenes', 'select')[0][0]).toContain('location_id');
    expect(fake.argsOf('project_locations', 'select').length).toBeGreaterThan(0);
    expect(view?.scenes.map((s) => s.location)).toEqual(['DOCK OFFICE', 'OLD PIER', 'GONE PLACE']);
  });
});
