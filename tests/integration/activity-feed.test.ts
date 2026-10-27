import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, createCast, createPersona, destroyCast, type Cast, type Persona } from './support/personas';
import { createCrewedProject, setVisibility } from './support/project';
import type { Json } from '@/lib/supabase/database.types';

// The activity feed carries titles of beats, scenes and campaigns. It must be
// readable only by the author and by people with access to the project named
// in metadata.project_id — never by everyone (the pre-fix behaviour).
let cast: Cast;
let casey: Persona;
let projectId: string;

beforeAll(async () => {
  cast = await createCast();
  casey = await createPersona('casey');
  ({ projectId } = await createCrewedProject(cast, 'Activity'));
  await adminClient().from('project_crew').insert({ project_id: projectId, user_id: casey.id, role: 'viewer', status: 'confirmed' });
});

afterAll(async () => {
  await destroyCast({ ...cast, casey });
});

async function log(who: Persona, action: string, metadata: Record<string, unknown>) {
  return who.client.from('activity_feed').insert({ user_id: who.id, action, target_type: 'project', target_id: projectId, metadata: metadata as Json }).select('id').single();
}
async function sees(who: Persona, id: string) {
  const { data } = await who.client.from('activity_feed').select('id').eq('id', id);
  return (data ?? []).length === 1;
}

describe('activity feed', () => {
  it('project activity reaches the owner and crew, never an outsider', async () => {
    const { data, error } = await log(cast.sam, 'added the beat "The reveal"', { project_id: projectId });
    expect(error).toBeNull();
    expect(await sees(cast.sam, data!.id)).toBe(true);
    expect(await sees(cast.jordan, data!.id)).toBe(true);
    expect(await sees(cast.riley, data!.id)).toBe(false);
  });

  it('an entry without a project is visible to its author only', async () => {
    const { data } = await log(cast.sam, 'did something personal', {});
    expect(await sees(cast.sam, data!.id)).toBe(true);
    expect(await sees(cast.jordan, data!.id)).toBe(false);
    expect(await sees(cast.riley, data!.id)).toBe(false);
  });

  it('paperwork activity is visible only to shapers and its author', async () => {
    const { data, error } = await log(cast.sam, 'updated production paperwork', { project_id: projectId, audience: 'shapers' });
    expect(error).toBeNull();
    expect(await sees(cast.sam, data!.id)).toBe(true);
    expect(await sees(cast.jordan, data!.id)).toBe(true);
    expect(await sees(casey, data!.id)).toBe(false);
    expect(await sees(cast.riley, data!.id)).toBe(false);

    const denied = await log(casey, 'updated production paperwork', { project_id: projectId, audience: 'shapers' });
    expect(denied.error).not.toBeNull();
  });

  it('a private project’s activity is the owner’s alone', async () => {
    const { data } = await log(cast.sam, 'wrapped scene 4', { project_id: projectId });
    await setVisibility(cast, projectId, 'private');
    expect(await sees(cast.jordan, data!.id)).toBe(false);
    await setVisibility(cast, projectId, 'team');
    expect(await sees(cast.jordan, data!.id)).toBe(true);
  });

  it('an outsider cannot write into a project’s feed', async () => {
    const { error } = await log(cast.riley, 'spam', { project_id: projectId });
    expect(error).not.toBeNull();
  });

  it('a malformed project id does not break reads', async () => {
    const { data, error } = await log(cast.sam, 'odd metadata', { project_id: 'not-a-uuid' });
    expect(error).toBeNull();
    const all = await cast.riley.client.from('activity_feed').select('id').limit(50);
    expect(all.error).toBeNull();
    expect(await sees(cast.sam, data!.id)).toBe(true);
  });
});
