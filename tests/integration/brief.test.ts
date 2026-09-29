import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, anonClient, createCast, createPersona, destroyCast, type Cast, type Persona } from './support/personas';
import { createCrewedProject, createScript } from './support/project';

// The project brief as personas. Sam owns the project, Jordan is crew (a
// contributor, production designer), Riley is an outsider, and Vic is added
// as a viewer (a guest). The catalogue is public and admin-curated; answers
// are checked against it; the team reads them, owner and contributors write.
let cast: Cast;
let vic: Persona;
let projectId: string;

beforeAll(async () => {
  cast = await createCast();
  vic = await createPersona('vic');
  ({ projectId } = await createCrewedProject(cast, 'Brief'));
  expect((await cast.sam.client.from('project_crew').insert({ project_id: projectId, user_id: vic.id, role: 'viewer', status: 'confirmed' })).error).toBeNull();
});

afterAll(async () => {
  await destroyCast({ ...cast, vic } as Cast);
});

const answer = (who: Persona, question: string, value: unknown) =>
  who.client.from('project_brief').upsert({ project_id: projectId, question, value: value as never }, { onConflict: 'project_id,question' }).select('question');

describe('the catalogue', () => {
  it('is readable by anyone, writable only by admins', async () => {
    const { data } = await anonClient().from('brief_questions').select('key, phase, kind').order('position');
    expect(data?.map((q) => q.key)).toEqual(expect.arrayContaining(['genre', 'target_runtime', 'budget_tier', 'needs', 'dailies', 'music', 'platforms']));
    expect((await cast.sam.client.from('brief_questions').update({ label: 'x' }).eq('key', 'genre').select('key')).data ?? []).toEqual([]);
    expect((await cast.sam.client.from('channel_presets').insert({ key: 'x-room', name: 'x' })).error).not.toBeNull();
    const { data: presets } = await cast.riley.client.from('channel_presets').select('key');
    expect(presets?.map((p) => p.key)).toEqual(expect.arrayContaining(['dailies', 'legal', 'production', 'script-notes']));
  });

  it('only points at crafts that exist', async () => {
    const [{ data: qs }, { data: crafts }] = await Promise.all([
      adminClient().from('brief_questions').select('options'),
      adminClient().from('crafts').select('name'),
    ]);
    const names = new Set(crafts!.map((c) => c.name));
    const implied = qs!.flatMap((q) => (q.options as Array<{ implies?: { crafts?: string[] } }>).flatMap((o) => o.implies?.crafts ?? []));
    expect(implied.length).toBeGreaterThan(10);
    expect(implied.filter((c) => !names.has(c))).toEqual([]);
  });
});

describe('answers', () => {
  it('the owner and a contributor answer; who answered is recorded', async () => {
    expect((await answer(cast.sam, 'genre', ['horror', 'drama'])).error).toBeNull();
    expect((await answer(cast.jordan, 'target_runtime', 12)).error).toBeNull();
    const { data } = await adminClient().from('project_brief').select('question, answered_by').eq('project_id', projectId).order('question');
    expect(data).toEqual([
      { question: 'genre', answered_by: cast.sam.id },
      { question: 'target_runtime', answered_by: cast.jordan.id },
    ]);
  });

  it('a viewer reads but can’t answer; an outsider neither', async () => {
    expect(((await vic.client.from('project_brief').select('question').eq('project_id', projectId)).data ?? []).length).toBe(2);
    expect((await answer(vic, 'tone', 'dark')).error).not.toBeNull();
    expect((await cast.riley.client.from('project_brief').select('question').eq('project_id', projectId)).data ?? []).toEqual([]);
    expect((await answer(cast.riley, 'tone', 'dark')).error).not.toBeNull();
    expect((await vic.client.from('project_brief').delete().eq('project_id', projectId).eq('question', 'genre').select('question')).data ?? []).toEqual([]);
  });

  it('must fit the question', async () => {
    expect((await answer(cast.sam, 'tone', 'spooky')).error?.message).toMatch(/Pick one/);
    expect((await answer(cast.sam, 'tone', ['dark'])).error).not.toBeNull();
    expect((await answer(cast.sam, 'genre', ['horror', 'horror'])).error).not.toBeNull();
    expect((await answer(cast.sam, 'genre', [])).error).not.toBeNull();
    expect((await answer(cast.sam, 'genre', ['horror', 'western'])).error).not.toBeNull();
    expect((await answer(cast.sam, 'target_runtime', 0)).error?.message).toMatch(/from 1 to 600/);
    expect((await answer(cast.sam, 'target_runtime', '12')).error).not.toBeNull();
    expect((await answer(cast.sam, 'no_such_question', 'x')).error).not.toBeNull();
    expect((await answer(cast.sam, 'tone', 'dark')).error).toBeNull();
  });
});

describe('what the suite knows (project_context)', () => {
  it('gathers scenes, crew crafts, breakdown and channels for the team only', async () => {
    const scriptId = await createScript(cast, projectId, 'EXT. FOREST - NIGHT\n\nRun.\n\nINT. CABIN - DAY\n\nHide.\n');
    expect((await adminClient().from('scenes').insert([
      { project_id: projectId, script_id: scriptId, scene_number: 1, ordinal: 0, title: 'Forest', heading: 'EXT. FOREST - NIGHT', location: 'Forest', time_of_day: 'NIGHT' },
      { project_id: projectId, script_id: scriptId, scene_number: 2, ordinal: 1, title: 'Cabin', heading: 'INT. CABIN - DAY', location: 'Cabin', time_of_day: 'DAY' },
    ])).error).toBeNull();

    const { data, error } = await cast.jordan.client.rpc('project_context', { p_project: projectId });
    expect(error).toBeNull();
    const c = data as Record<string, unknown>;
    expect(c).toMatchObject({ scenes: 2, exteriors: 1, night_exteriors: 1, locations: 2, crew: 2, viewers: 1, crafts: ['Production designer'] });
    expect((c.breakdown as Record<string, { label: string; n: number }>).stunts).toEqual({ label: 'Stunts', n: 0 });

    expect((await cast.riley.client.rpc('project_context', { p_project: projectId })).data).toBeNull();
    expect((await anonClient().rpc('project_context', { p_project: projectId })).error).not.toBeNull();
  });
});
