import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';
import { createStudioApi } from '@/lib/studio/api';

// Locations as personas, through the Studio data layer the app uses: the
// production (Sam, Jordan) keeps the records together; Riley sees nothing.
let cast: Cast;
let projectId: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Locations'));
});
afterAll(async () => { await destroyCast(cast); });

describe('project_locations', () => {
  it('a record is keyed by the heading’s name, and later saves change only what they say', async () => {
    const sam = createStudioApi(cast.sam.client);
    const first = await sam.saveLocation(projectId, ' harbor ', { address: '12 Harbor Rd' });
    expect(first).toMatchObject({ name: 'HARBOR', address: '12 Harbor Rd', status: 'scouting', permit: 'unknown', created_by: cast.sam.id });

    const jordan = createStudioApi(cast.jordan.client);
    const next = await jordan.saveLocation(projectId, 'Harbor', { status: 'confirmed', permit: 'applied', cost: 250 });
    expect(next).toMatchObject({ id: first.id, address: '12 Harbor Rd', status: 'confirmed', permit: 'applied', cost: 250, created_by: cast.sam.id });
    expect((await jordan.listLocations(projectId)).map((l) => l.name)).toEqual(['HARBOR']);
  });

  it('refuses nonsense and outsiders', async () => {
    const sam = createStudioApi(cast.sam.client);
    await expect(sam.saveLocation(projectId, 'HARBOR', { status: 'maybe' })).rejects.toThrow();
    await expect(sam.saveLocation(projectId, 'HARBOR', { cost: -5 })).rejects.toThrow();
    const lower = await cast.sam.client.from('project_locations').insert({ project_id: projectId, name: 'harbor' });
    expect(lower.error).not.toBeNull();

    expect((await cast.riley.client.from('project_locations').select('id').eq('project_id', projectId)).data).toEqual([]);
    await expect(createStudioApi(cast.riley.client).saveLocation(projectId, 'CAVE', {})).rejects.toThrow();
  });
});
