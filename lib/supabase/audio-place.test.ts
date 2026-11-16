import { describe, expect, it, vi, beforeEach } from 'vitest';

// A tiny stand-in for the project_audio_references table: what select returns, and what insert / update were called with.
const db = vi.hoisted(() => ({ rows: [] as { id: string; for_scene: string | null; role: string | null; tags: string[] }[], inserts: [] as unknown[], updates: [] as unknown[] }));
vi.mock('./client', () => {
  const chain = (result: () => unknown) => {
    const c: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'limit']) c[m] = () => c;
    (c as { then: unknown }).then = (res: (v: unknown) => unknown) => Promise.resolve(result()).then(res);
    return c;
  };
  return {
    supabase: {
      from: () => ({
        select: () => chain(() => ({ data: db.rows, error: null })),
        insert: (row: unknown) => { db.inserts.push(row); return Promise.resolve({ error: null }); },
        update: (row: unknown) => { db.updates.push(row); return chain(() => ({ data: [{ id: 'r1' }], error: null })); },
      }),
    },
  };
});

import { placeTrackInScene } from './audio';

const t = { projectId: 'p1', userId: 'u1', uri: 'spotify:track:abc', title: 'Night Drive — K', description: 'K', sceneId: 's2' };

describe('placeTrackInScene', () => {
  beforeEach(() => { db.rows = []; db.inserts = []; db.updates = []; });

  it('saves a new track tagged to the scene as a temp score', async () => {
    expect(await placeTrackInScene(t)).toBe('tagged');
    expect(db.inserts).toEqual([expect.objectContaining({ project_id: 'p1', uri: 'spotify:track:abc', for_scene: 's2', role: 'temp', tags: [] })]);
  });

  it('tags the saved copy instead of saving a second one, keeping its role and tags', async () => {
    db.rows = [{ id: 'r1', for_scene: null, role: 'theme', tags: ['tense'] }];
    expect(await placeTrackInScene(t)).toBe('tagged');
    expect(db.inserts).toEqual([]);
    expect(db.updates).toEqual([{ for_scene: 's2', role: 'theme', tags: ['tense'] }]);
  });

  it('moves a track tagged to another scene, and says so', async () => {
    db.rows = [{ id: 'r1', for_scene: 's1', role: null, tags: [] }];
    expect(await placeTrackInScene(t)).toBe('moved');
    expect(db.updates).toEqual([{ for_scene: 's2', role: 'temp', tags: [] }]);
  });

  it('changes nothing when the track is already in that scene', async () => {
    db.rows = [{ id: 'r1', for_scene: 's2', role: 'temp', tags: [] }];
    expect(await placeTrackInScene(t)).toBe('already');
    expect(db.updates).toEqual([]);
  });
});
