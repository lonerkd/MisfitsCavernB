import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject, createScript } from './support/project';

// The role tools' records: Sam owns the project, Jordan is crew who shapes it, Riley is an outsider; a viewer reads only.
let cast: Cast;
let projectId: string;

beforeAll(async () => { cast = await createCast(); ({ projectId } = await createCrewedProject(cast, 'Records')); });
afterAll(async () => { await destroyCast(cast); });

type Who = 'sam' | 'jordan' | 'riley';
const add = (who: Who, item_id: string, kind = 'permits') =>
  cast[who].client.from('production_records').insert({ project_id: projectId, kind, item_id, data: { location: 'Pier 9' } }).select('id, created_by');
const rows = (who: Who) => cast[who].client.from('production_records').select('item_id').eq('project_id', projectId);

describe('production records', () => {
  it('the owner adds a record, and it is theirs', async () => {
    const r = await add('sam', 'p-1');
    expect(r.error).toBeNull();
    expect(r.data?.[0].created_by).toBe(cast.sam.id);
  });

  it('crew save their own tool’s record (the case that was refused when it lived in settings), and the owner sees it', async () => {
    const r = await add('jordan', 'p-2', 'cameraReports');
    expect(r.error).toBeNull();
    expect((await rows('sam')).data?.map((x) => x.item_id).sort()).toEqual(['p-1', 'p-2']);
  });

  it('crew edit and delete records', async () => {
    const e = await cast.jordan.client.from('production_records').update({ data: { location: 'Dock' } }).eq('project_id', projectId).eq('item_id', 'p-1').select('data');
    expect(e.data?.[0].data).toEqual({ location: 'Dock' });
    const d = await cast.jordan.client.from('production_records').delete().eq('project_id', projectId).eq('item_id', 'p-2').select('id');
    expect(d.data).toHaveLength(1);
  });

  it('an outsider reads nothing, adds nothing, changes nothing, deletes nothing', async () => {
    expect((await rows('riley')).data).toEqual([]);
    expect((await add('riley', 'x-1')).error?.code).toBe('42501');
    const u = await cast.riley.client.from('production_records').update({ data: {} }).eq('project_id', projectId).select('id');
    expect(u.data ?? []).toEqual([]);
    const d = await cast.riley.client.from('production_records').delete().eq('project_id', projectId).select('id');
    expect(d.data ?? []).toEqual([]);
    expect((await rows('sam')).data).toHaveLength(1);
  });

  it('a viewer reads but cannot add, edit or delete', async () => {
    await cast.sam.client.from('project_crew').update({ role: 'viewer' }).eq('project_id', projectId).eq('user_id', cast.jordan.id);
    expect((await rows('jordan')).data).toHaveLength(1);
    expect((await add('jordan', 'v-1')).error?.code).toBe('42501');
    expect((await cast.jordan.client.from('production_records').update({ data: {} }).eq('project_id', projectId).select('id')).data ?? []).toEqual([]);
    expect((await cast.jordan.client.from('production_records').delete().eq('project_id', projectId).select('id')).data ?? []).toEqual([]);
    await cast.sam.client.from('project_crew').update({ role: 'contributor' }).eq('project_id', projectId).eq('user_id', cast.jordan.id);
  });

  it('only the known kinds, small records, and a record keeps its project, kind and id', async () => {
    expect((await add('sam', 'k-1', 'nonsense')).error?.code).toBe('23514');
    const big = await cast.sam.client.from('production_records').insert({ project_id: projectId, kind: 'gear', item_id: 'big', data: { x: 'a'.repeat(25000) } });
    expect(big.error?.code).toBe('23514');
    const move = await cast.sam.client.from('production_records').update({ kind: 'gear' }).eq('project_id', projectId).eq('item_id', 'p-1');
    expect(move.error?.code).toBe('42501');
  });

  it('two people adding at once both keep their record (the whole-list overwrite is gone)', async () => {
    await Promise.all([add('sam', 'c-1', 'gear'), add('jordan', 'c-2', 'gear')]);
    const r = await rows('sam');
    expect(r.data?.map((x) => x.item_id)).toEqual(expect.arrayContaining(['c-1', 'c-2']));
  });

  // ── Links to the film graph (migration 20261108040000) ──────────────────────────────────────────────────────────────
  describe('links to scenes and characters', () => {
    let sceneId: string;
    let otherSceneId: string;
    let characterId: string;
    let otherProjectId: string;

    beforeAll(async () => {
      const other = await createCrewedProject(cast, 'Elsewhere');
      otherProjectId = other.projectId;
      const script = await createScript(cast, projectId, 'INT. KITCHEN - DAY\n');
      const otherScript = await createScript(cast, other.projectId, 'INT. GARDEN - DAY\n');
      const a = await cast.sam.client.from('scenes').insert({ project_id: projectId, script_id: script, scene_number: 1, title: 'KITCHEN' }).select('id').single();
      const b = await cast.sam.client.from('scenes').insert({ project_id: other.projectId, script_id: otherScript, scene_number: 1, title: 'GARDEN' }).select('id').single();
      const c = await cast.sam.client.from('characters').insert({ project_id: projectId, name: 'MAYA' }).select('id').single();
      if (a.error || b.error || c.error) throw a.error ?? b.error ?? c.error;
      sceneId = a.data.id; otherSceneId = b.data.id; characterId = c.data.id;
    });

    const link = (who: Who, item_id: string, extra: Record<string, unknown>) =>
      cast[who].client.from('production_records').insert({ project_id: projectId, kind: 'costumes', item_id, data: { character: 'Maya' }, ...extra } as never).select('id, scene_ids, character_id');

    it('crew link a record to scenes and a character of this project', async () => {
      const r = await link('jordan', 'l-1', { scene_ids: [sceneId], character_id: characterId });
      expect(r.error).toBeNull();
      expect(r.data?.[0].scene_ids).toEqual([sceneId]);
      expect(r.data?.[0].character_id).toBe(characterId);
    });

    it('a record cannot link to a scene of another project, nor to the same scene twice', async () => {
      expect((await link('sam', 'l-2', { scene_ids: [otherSceneId] })).error?.code).toBe('23514');
      expect((await link('sam', 'l-3', { scene_ids: [sceneId, sceneId] })).error?.code).toBe('23514');
    });

    it('a character of another project cannot be linked either (a real foreign key)', async () => {
      const foreign = await cast.sam.client.from('characters').insert({ project_id: otherProjectId, name: 'ELI' }).select('id').single();
      expect((await link('sam', 'l-4', { character_id: foreign.data!.id })).error?.code).toBe('23503');
    });

    it('an outsider cannot read the links', async () => {
      expect((await cast.riley.client.from('production_records').select('scene_ids').eq('item_id', 'l-1')).data).toEqual([]);
    });

    it('deleting the character clears the link and keeps the record and its label', async () => {
      await cast.sam.client.from('characters').delete().eq('id', characterId);
      const r = await cast.sam.client.from('production_records').select('character_id, project_id, data').eq('item_id', 'l-1').single();
      expect(r.data?.character_id).toBeNull();
      expect(r.data?.project_id).toBe(projectId);
      expect(r.data?.data).toEqual({ character: 'Maya' });
    });

    it('deleting a scene leaves the record’s links and keeps its label', async () => {
      await cast.sam.client.from('scenes').delete().eq('id', sceneId);
      const r = await cast.sam.client.from('production_records').select('scene_ids, data').eq('item_id', 'l-1').single();
      expect(r.data?.scene_ids).toEqual([]);
      expect(r.data?.data).toEqual({ character: 'Maya' });
    });
  });
});
