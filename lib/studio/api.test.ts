import { describe, expect, it } from 'vitest';
import { createFakeSupabase } from '@/tests/unit-support/fakeSupabase';
import { createStudioApi, type Client } from './api';

describe('call sheet scene cast', () => {
  it('uses the linked characters and ignores the legacy cast text', async () => {
    const fake = createFakeSupabase({
      call_sheets: { data: { id: 'sheet', project_id: 'project', shoot_day: 2 } },
      projects: { data: { id: 'project', title: 'Night Shift', creator_id: 'owner' } },
      scenes: { data: [
        { id: 'scene-1', scene_number: 1, heading: 'INT. STUDIO - NIGHT', title: 'Scene 1', cast_list: 'OLD TEXT' },
        { id: 'scene-2', scene_number: 2, heading: null, title: 'Scene 2', cast_list: 'STALE NAME' },
      ] },
      scene_characters: { data: [
        { scene_id: 'scene-1', character_id: 'maya', character: { id: 'maya', name: 'MAYA' } },
        { scene_id: 'scene-1', character_id: 'eli', character: { id: 'eli', name: 'ELI' } },
      ] },
      project_crew: { data: [] },
      character_castings: { data: [] },
      call_sheet_acks: { data: null },
      call_sheet_calls: { data: [] },
    });

    const view = await createStudioApi(fake.client as unknown as Client).getCallSheetView('sheet', 'viewer');

    expect(view?.scenes).toEqual([
      { id: 'scene-1', scene_number: 1, heading: 'INT. STUDIO - NIGHT', title: 'Scene 1', cast: ['ELI', 'MAYA'] },
      { id: 'scene-2', scene_number: 2, heading: null, title: 'Scene 2', cast: [] },
    ]);
    expect(fake.argsOf('scenes', 'select')).toEqual([['id, scene_number, heading, title']]);
    expect(fake.argsOf('scene_characters', 'eq')).toContainEqual(['project_id', 'project']);
    expect(fake.argsOf('scene_characters', 'in')).toContainEqual(['scene_id', ['scene-1', 'scene-2']]);
  });
});
