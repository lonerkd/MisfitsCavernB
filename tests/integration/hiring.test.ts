import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, anonClient, createCast, createPersona, destroyCast, type Cast, type Persona } from './support/personas';
import { createCrewedProject } from './support/project';

// The hiring loop as personas: Sam posts a casting call and a crew role on
// the project; Riley (an outsider) applies and is cast; Jordan (already a
// lead) is hired for a role and keeps being a lead; Casey is turned down.
let cast: Cast;
let casey: Persona;
let projectId: string;

const post = async (fields: Record<string, unknown>) => {
  const { data, error } = await cast.sam.client.from('jobs')
    .insert({ created_by: cast.sam.id, project_id: projectId, ...fields } as never).select('id').single();
  if (error) throw error;
  return data.id as string;
};
const apply = async (who: Persona, jobId: string) =>
  (await who.client.from('job_applications').insert({ job_id: jobId, applicant_id: who.id }).select('id').single()).data!.id as string;
const lastNote = async (who: Persona) =>
  (await who.client.from('notifications').select('title, body, link').eq('type', 'application').order('created_at', { ascending: false }).limit(1)).data?.[0];

beforeAll(async () => {
  cast = await createCast();
  casey = await createPersona('casey');
  ({ projectId } = await createCrewedProject(cast, 'Hiring'));
  await adminClient().from('project_crew').update({ role: 'lead' }).eq('project_id', projectId).eq('user_id', cast.jordan.id);
});
afterAll(async () => { await destroyCast({ ...cast, casey }); });

describe('posting', () => {
  it('a posting linked to a project needs the right to shape it', async () => {
    const { error } = await cast.riley.client.from('jobs')
      .insert({ created_by: cast.riley.id, project_id: projectId, title: 'Gaffer', role: 'Gaffer' });
    expect(error).not.toBeNull();
    // Unlinked postings are anyone's.
    expect((await cast.riley.client.from('jobs').insert({ created_by: cast.riley.id, title: 'Gaffer for a short', role: 'Gaffer' })).error).toBeNull();
  });

  it('a casting call names a character of its project', async () => {
    const { error } = await cast.sam.client.from('jobs')
      .insert({ created_by: cast.sam.id, title: 'MAYA', role: 'Actor', character_name: 'MAYA' });
    expect(error).not.toBeNull();
  });
});

// One SELECT policy decides this (20261007010000_jobs_one_select_policy).
describe('who reads a posting', () => {
  it('open: everyone, signed in or not; closed: the poster and its applicants only', async () => {
    const openId = await post({ title: 'Gaffer, second unit', role: 'Gaffer' });
    const closedId = await post({ title: 'Boom op, night shoot', role: 'Boom operator' });
    await apply(casey, closedId);
    await adminClient().from('jobs').update({ status: 'closed' }).eq('id', closedId);

    const sees = async (client: typeof cast.sam.client, id: string) =>
      ((await client.from('jobs').select('id').eq('id', id)).data ?? []).length === 1;
    const anon = anonClient();

    expect(await sees(anon, openId)).toBe(true);
    expect(await sees(cast.riley.client, openId)).toBe(true);

    expect(await sees(cast.sam.client, closedId)).toBe(true);    // the poster
    expect(await sees(casey.client, closedId)).toBe(true);       // an applicant
    expect(await sees(cast.riley.client, closedId)).toBe(false); // an outsider
    expect(await sees(anon, closedId)).toBe(false);              // signed out
    // An anonymous read of the board still works (the policy runs for anon).
    expect((await anon.from('jobs').select('id').eq('status', 'open').limit(5)).error).toBeNull();
  });
});

describe('responding', () => {
  it('accepting a casting call adds them to the crew, casts them, closes it and tells them', async () => {
    const jobId = await post({ title: 'Casting: MAYA', role: 'Actor', character_name: 'Maya' });
    const appId = await apply(cast.riley, jobId);
    // Only the poster responds. Castings are keyed in capitals, as the Casting board writes them.
    expect((await cast.jordan.client.rpc('respond_to_application', { p_application: appId, p_status: 'accepted' })).error?.message).toMatch(/not found/);

    const { data, error } = await cast.sam.client.rpc('respond_to_application', { p_application: appId, p_status: 'accepted', p_close: true });
    expect(error).toBeNull();
    expect(data).toEqual({ status: 'accepted', joined_crew: true, cast_as: 'Maya', closed: true });

    const admin = adminClient();
    expect((await admin.from('project_crew').select('role, craft, status').eq('project_id', projectId).eq('user_id', cast.riley.id).single()).data)
      .toEqual({ role: 'contributor', craft: 'Actor', status: 'confirmed' });
    expect((await admin.from('character_castings').select('crew_user_id').eq('project_id', projectId).eq('character_name', 'MAYA').single()).data?.crew_user_id)
      .toBe(cast.riley.id);
    expect(await lastNote(cast.riley)).toEqual({ title: 'You\'re in · Casting: MAYA', body: 'You\'re cast as Maya in Hiring.', link: `/projects/${projectId}` });
    // Closed, but Riley can still read what they applied to.
    expect((await cast.riley.client.from('jobs').select('status').eq('id', jobId).single()).data?.status).toBe('closed');
  });

  it('hiring someone already on the crew keeps their role and craft', async () => {
    const jobId = await post({ title: 'Second unit gaffer', role: 'Gaffer' });
    const appId = await apply(cast.jordan, jobId);
    const { data } = await cast.sam.client.rpc('respond_to_application', { p_application: appId, p_status: 'accepted' });
    expect(data).toEqual({ status: 'accepted', joined_crew: false, cast_as: null, closed: false });
    expect((await adminClient().from('project_crew').select('role, craft').eq('project_id', projectId).eq('user_id', cast.jordan.id).single()).data)
      .toEqual({ role: 'lead', craft: 'Production designer' });
    expect((await cast.jordan.client.from('jobs').select('status').eq('id', jobId).single()).data?.status).toBe('open');
  });

  it('turning someone down tells them, and adds nothing', async () => {
    const jobId = await post({ title: 'Boom op', role: 'Boom operator' });
    const appId = await apply(casey, jobId);
    expect((await cast.sam.client.rpc('respond_to_application', { p_application: appId, p_status: 'rejected' })).error).toBeNull();
    expect((await lastNote(casey))?.body).toBe('Your application was not selected this time.');
    expect((await adminClient().from('project_crew').select('id').eq('project_id', projectId).eq('user_id', casey.id)).data).toEqual([]);
    expect((await cast.sam.client.rpc('respond_to_application', { p_application: appId, p_status: 'maybe' })).error).not.toBeNull();
  });
});
