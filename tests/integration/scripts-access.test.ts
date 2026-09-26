import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, anonClient, type Cast } from './support/personas';

// Scripts and their metadata (title page, character bible), through the real
// API as each persona. script_metadata / script_revisions are guarded by
// internal.can_access_script(), so these tests exercise that function for the
// owner, for crew on the script's project, and for an outsider.
let cast: Cast;
let projectId: string;
let scriptId: string;

beforeAll(async () => {
  cast = await createCast();
  const project = await cast.sam.client
    .from('projects')
    .insert({ title: 'Script Access', creator_id: cast.sam.id })
    .select('id')
    .single();
  if (project.error) throw project.error;
  projectId = project.data.id;

  const crew = await cast.sam.client
    .from('project_crew')
    .insert({ project_id: projectId, user_id: cast.jordan.id, role: 'Writer', status: 'confirmed' });
  if (crew.error) throw crew.error;

  // Same shape the editor's saveScript() inserts.
  const script = await cast.sam.client
    .from('scripts')
    .insert({ title: 'Draft One', content: 'INT. CAVE - NIGHT', created_by: cast.sam.id, last_edited_by: cast.sam.id, project_id: projectId, status: 'draft' })
    .select('id')
    .single();
  if (script.error) throw script.error;
  scriptId = script.data.id;
});

afterAll(async () => {
  await destroyCast(cast);
});

describe('scripts — content round-trips and stays scoped', () => {
  it('the owner saves content and reads back exactly what was written', async () => {
    const content = 'INT. CAVE - NIGHT\n\nSAM\nIt saved.\n';
    const upd = await cast.sam.client.from('scripts').update({ content, last_edited_by: cast.sam.id }).eq('id', scriptId).select('content').single();
    expect(upd.error).toBeNull();
    const { data } = await cast.sam.client.from('scripts').select('content').eq('id', scriptId).single();
    expect(data?.content).toBe(content);
  });

  it('crew on the project can read and edit the script', async () => {
    const read = await cast.jordan.client.from('scripts').select('id').eq('id', scriptId);
    expect(read.data).toHaveLength(1);
    const upd = await cast.jordan.client.from('scripts').update({ title: 'Draft One (Jordan pass)', last_edited_by: cast.jordan.id }).eq('id', scriptId).select('id');
    expect(upd.error).toBeNull();
    expect(upd.data).toHaveLength(1);
  });

  it('an outsider and anon cannot read it', async () => {
    expect((await cast.riley.client.from('scripts').select('id').eq('id', scriptId)).data).toEqual([]);
    expect((await anonClient().from('scripts').select('id').eq('id', scriptId)).data).toEqual([]);
  });
});

describe('script metadata — guarded by internal.can_access_script', () => {
  it('the owner can write and read the title page', async () => {
    const up = await cast.sam.client
      .from('script_metadata')
      .upsert({ script_id: scriptId, title_page: { title: 'Draft One', author: 'Sam' }, updated_by: cast.sam.id })
      .select('title_page');
    expect(up.error).toBeNull();
    const { data, error } = await cast.sam.client.from('script_metadata').select('title_page').eq('script_id', scriptId).single();
    expect(error).toBeNull();
    expect(data?.title_page).toEqual({ title: 'Draft One', author: 'Sam' });
  });

  it('crew on the script’s project can read it', async () => {
    const { data, error } = await cast.jordan.client.from('script_metadata').select('script_id').eq('script_id', scriptId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it('an outsider cannot read or write it', async () => {
    const read = await cast.riley.client.from('script_metadata').select('script_id').eq('script_id', scriptId);
    expect(read.error).toBeNull();
    expect(read.data).toEqual([]);
    const write = await cast.riley.client.from('script_metadata').upsert({ script_id: scriptId, title_page: { hijacked: true } });
    expect(write.error).not.toBeNull();
  });
});
