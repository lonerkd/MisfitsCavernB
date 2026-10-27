import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { adminClient, anonClient, createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

let cast: Cast;
let projectId: string;
let otherProjectId: string;
let scriptIds: string[];
let referenceId: string;

const admin = () => adminClient();
const sam = () => cast.sam.client;
const guest = () => anonClient();

async function addScript(project: string, title: string) {
  const { data, error } = await sam().from('scripts').insert({
    project_id: project, title, content: '# BODY\nFresh from the cave.', format: 'copy',
    status: 'draft', created_by: cast.sam.id, last_edited_by: cast.sam.id,
  }).select('id').single();
  if (error) throw error;
  return data.id;
}

async function approve(scriptId: string) {
  const version = await sam().from('item_versions').insert({ project_id: projectId, script_id: scriptId, label: 'Client round' }).select('id').single();
  expect(version.error).toBeNull();
  expect((await sam().from('item_versions').update({ status: 'sent' }).eq('id', version.data!.id)).error).toBeNull();
  const link = await sam().from('review_links').insert({ project_id: projectId, version_ids: [version.data!.id] }).select('token').single();
  expect(link.error).toBeNull();
  expect((await guest().rpc('decide_review', {
    p_token: link.data!.token, p_version: version.data!.id, p_decision: 'approved', p_name: 'Casey',
  })).data).toBe(true);
  expect((await sam().from('item_versions').update({ confirmed_at: new Date().toISOString() }).eq('id', version.data!.id)).error).toBeNull();
}

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Copy campaign'));
  ({ projectId: otherProjectId } = await createCrewedProject(cast, 'Other project'));
  await admin().from('projects').update({ project_type: 'Advertising', status: 'concept' }).eq('id', projectId);
  scriptIds = [await addScript(projectId, '30-second spot'), await addScript(projectId, 'Social post')];
});

afterAll(async () => {
  await admin().from('projects').delete().in('id', [projectId, otherProjectId]);
  await destroyCast(cast);
});

describe('advertising deliverables and references', () => {
  it('creates a project-bound deliverable entity for each script and rejects cross-project assignment', async () => {
    const format = await admin().from('project_formats').select('script_format').eq('name', 'Advertising').single();
    expect(format.data?.script_format).toBe('copy');
    const rows = await sam().from('deliverables').select('script_id, project_id, kind, title').eq('project_id', projectId);
    expect(rows.data).toHaveLength(2);
    expect(rows.data?.map((row) => row.script_id).sort()).toEqual([...scriptIds].sort());
    const entity = await sam().from('entities').select('kind, label').eq('id', scriptIds[0]).single();
    expect(entity.data).toMatchObject({ kind: 'deliverable', label: '30-second spot' });

    const otherScriptId = await addScript(otherProjectId, 'Not in this campaign');
    const crossProject = await sam().from('deliverables').insert({
      script_id: otherScriptId, project_id: projectId, title: 'Cross-project piece',
    });
    expect(crossProject.error).not.toBeNull();
  });

  it('allows the project owner to approve references and keeps approved copy immutable', async () => {
    const created = await sam().from('ad_references').insert({
      project_id: projectId, kind: 'brief', title: 'Approved brief', content: 'Keep it warm and direct.',
    }).select('id, status, approved_at, approved_by').single();
    expect(created.error).toBeNull();
    referenceId = created.data!.id;
    expect(created.data).toMatchObject({ status: 'draft', approved_at: null, approved_by: null });
    expect((await sam().from('ad_references').update({ status: 'approved' }).eq('id', referenceId)).error).toBeNull();
    const approved = await sam().from('ad_references').select('status, approved_by').eq('id', referenceId).single();
    expect(approved.data).toMatchObject({ status: 'approved', approved_by: cast.sam.id });
    expect((await sam().from('ad_references').update({ content: 'Changed after approval.' }).eq('id', referenceId)).error).not.toBeNull();
    expect((await sam().from('ad_references').delete().eq('id', referenceId).select('id')).data).toEqual([]);
  });

  it('keeps brand-rule text limited to shapers and prevents non-owners from editing it', async () => {
    const rule = await sam().from('brand_rules').insert({
      project_id: projectId, kind: 'must_include', text: 'Fresh from the cave', severity: 'blocker',
    }).select('id').single();
    expect(rule.error).toBeNull();
    await admin().from('project_crew').update({ role: 'viewer' }).eq('project_id', projectId).eq('user_id', cast.jordan.id);
    expect((await cast.jordan.client.from('deliverables').select('script_id').eq('project_id', projectId)).data).toHaveLength(2);
    expect((await cast.jordan.client.from('ad_references').select('id').eq('project_id', projectId)).data).toEqual([]);
    expect((await cast.jordan.client.from('brand_rules').select('id').eq('project_id', projectId)).data).toEqual([]);
    expect((await cast.jordan.client.from('brand_rules').insert({
      project_id: projectId, kind: 'never_say', text: 'Guaranteed', severity: 'blocker',
    })).error).not.toBeNull();
    expect((await cast.riley.client.from('deliverables').select('script_id').eq('project_id', projectId)).data).toEqual([]);
    expect((await cast.riley.client.from('brand_rules').select('id').eq('project_id', projectId)).data).toEqual([]);
    expect((await guest().from('brand_rules').select('id')).data ?? []).toEqual([]);
    await admin().from('project_crew').update({ role: 'contributor' }).eq('project_id', projectId).eq('user_id', cast.jordan.id);
  });

  it('requires every ad deliverable to have a client-approved and team-confirmed version before leaving the gated phase', async () => {
    expect((await sam().from('projects').update({ status: 'pre-production' }).eq('id', projectId)).error).toBeNull();
    expect((await sam().from('projects').update({ status: 'production' }).eq('id', projectId)).error).not.toBeNull();
    await approve(scriptIds[0]);
    expect((await sam().from('projects').update({ status: 'production' }).eq('id', projectId)).error).not.toBeNull();
    await approve(scriptIds[1]);
    expect((await sam().from('projects').update({ status: 'production' }).eq('id', projectId)).error).toBeNull();
  });
});
