import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, createCast, createPersona, destroyCast, type Cast, type Persona } from './support/personas';
import { createCrewedProject, tinyPng } from './support/project';

// Paperwork as personas: Sam (owner) and Jordan (contributor) keep the
// production's documents; Casey (a viewer on the crew) sees only the paper
// that's theirs — record and file. Riley sees nothing. A permit on file moves
// its location's permit along.
const BUCKET = 'project-papers';
let cast: Cast;
let casey: Persona;
let projectId: string;
const uploaded: string[] = [];

beforeAll(async () => {
  cast = await createCast();
  casey = await createPersona('casey');
  ({ projectId } = await createCrewedProject(cast, 'Paperwork'));
  await adminClient().from('project_crew').insert({ project_id: projectId, user_id: casey.id, role: 'viewer', status: 'confirmed' });
});
afterAll(async () => {
  if (uploaded.length) await adminClient().storage.from(BUCKET).remove(uploaded);
  await destroyCast({ ...cast, casey });
});

describe('project_documents', () => {
  it('the people who shape the project keep them; each person sees their own', async () => {
    const release = (await cast.jordan.client.from('project_documents')
      .insert({ project_id: projectId, kind: 'release', title: 'Appearance release — casey', person_id: casey.id })
      .select('id').single()).data!;
    const insurance = (await cast.sam.client.from('project_documents')
      .insert({ project_id: projectId, kind: 'insurance', title: 'General liability', status: 'done', expires_on: '2027-01-01' })
      .select('id').single()).data!;

    const mine = (await casey.client.from('project_documents').select('id').eq('project_id', projectId)).data!;
    expect(mine.map((d) => d.id)).toEqual([release.id]);
    expect((await casey.client.from('project_documents').update({ status: 'done' }).eq('id', release.id).select('id')).data).toEqual([]);
    expect((await casey.client.from('project_documents').insert({ project_id: projectId, kind: 'other', title: 'Mine' })).error).not.toBeNull();

    expect((await cast.riley.client.from('project_documents').select('id').eq('project_id', projectId)).data).toEqual([]);
    expect((await cast.riley.client.from('project_documents').insert({ project_id: projectId, kind: 'other', title: 'Sneaky' })).error).not.toBeNull();

    expect((await cast.jordan.client.from('project_documents').select('id').eq('project_id', projectId)).data).toHaveLength(2);
    expect((await cast.jordan.client.from('project_documents').delete().eq('id', insurance.id).select('id')).data).toHaveLength(1);
  });

  it('a permit on file moves its location’s permit along', async () => {
    const loc = (await cast.sam.client.from('project_locations')
      .insert({ project_id: projectId, name: 'HARBOR', permit: 'needed' }).select('id').single()).data!;
    const permit = (await cast.sam.client.from('project_documents')
      .insert({ project_id: projectId, kind: 'permit', title: 'Filming permit — HARBOR', location_id: loc.id, status: 'pending' })
      .select('id').single()).data!;
    const permitOf = async () => (await adminClient().from('project_locations').select('permit').eq('id', loc.id).single()).data!.permit;
    expect(await permitOf()).toBe('applied');
    await cast.sam.client.from('project_documents').update({ status: 'done' }).eq('id', permit.id);
    expect(await permitOf()).toBe('granted');
  });

  it('can’t point at another project’s location', async () => {
    const other = (await adminClient().from('projects').insert({ title: 'Other', creator_id: cast.sam.id }).select('id').single()).data!;
    const otherLoc = (await adminClient().from('project_locations').insert({ project_id: other.id, name: 'ELSEWHERE' }).select('id').single()).data!;
    const { error } = await cast.sam.client.from('project_documents')
      .insert({ project_id: projectId, kind: 'permit', title: 'Wrong', location_id: otherLoc.id });
    expect(error).not.toBeNull();
    await adminClient().from('projects').delete().eq('id', other.id);
  });
});

describe('the papers bucket', () => {
  it('the file is for the shapers and the person it’s about', async () => {
    const doc = (await cast.sam.client.from('project_documents')
      .insert({ project_id: projectId, kind: 'contract', title: 'Deal memo — casey', person_id: casey.id })
      .select('id').single()).data!;
    const path = `${projectId}/${doc.id}/memo.png`;
    expect((await casey.client.storage.from(BUCKET).upload(path, tinyPng(), { contentType: 'image/png' })).error).not.toBeNull();
    expect((await cast.jordan.client.storage.from(BUCKET).upload(path, tinyPng(), { contentType: 'image/png' })).error).toBeNull();
    uploaded.push(path);
    await cast.jordan.client.from('project_documents').update({ storage_path: path, file_name: 'memo.png', mime_type: 'image/png', size_bytes: tinyPng().size }).eq('id', doc.id);

    expect((await casey.client.storage.from(BUCKET).createSignedUrl(path, 60)).error).toBeNull();
    expect((await cast.sam.client.storage.from(BUCKET).createSignedUrl(path, 60)).error).toBeNull();
    expect((await cast.riley.client.storage.from(BUCKET).createSignedUrl(path, 60)).error).not.toBeNull();

    // Another crew member's paper stays theirs.
    const other = (await cast.sam.client.from('project_documents')
      .insert({ project_id: projectId, kind: 'contract', title: 'Deal memo — jordan', person_id: cast.jordan.id })
      .select('id').single()).data!;
    const otherPath = `${projectId}/${other.id}/memo.png`;
    expect((await cast.sam.client.storage.from(BUCKET).upload(otherPath, tinyPng(), { contentType: 'image/png' })).error).toBeNull();
    uploaded.push(otherPath);
    await cast.sam.client.from('project_documents').update({ storage_path: otherPath, file_name: 'memo.png', mime_type: 'image/png', size_bytes: 1 }).eq('id', other.id);
    expect((await casey.client.storage.from(BUCKET).createSignedUrl(otherPath, 60)).error).not.toBeNull();

    // A path must sit under its own document.
    const { error } = await cast.sam.client.from('project_documents').update({ storage_path: `${projectId}/elsewhere/x.png` }).eq('id', other.id);
    expect(error).not.toBeNull();
  });
});
