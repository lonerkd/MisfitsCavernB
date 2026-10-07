import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, anonClient, type Cast } from './support/personas';

// Script share links (/s/<token>), as each persona. A shared script is read
// only through get_shared_script(token): the exact token, while sharing is on.
// Nobody can list shared scripts or read one by id (Riley and anon — P0).
// Turning sharing on/off or rotating the token is the owner's, or a shaper's
// on a project script — never a viewer's, never the outsider's.
let cast: Cast;
let projectId: string;
let scriptId: string;
let soloId: string;

beforeAll(async () => {
  cast = await createCast();
  const project = await cast.sam.client
    .from('projects')
    .insert({ title: 'Share Links', creator_id: cast.sam.id })
    .select('id')
    .single();
  if (project.error) throw project.error;
  projectId = project.data.id;

  const crew = await cast.sam.client
    .from('project_crew')
    .insert({ project_id: projectId, user_id: cast.jordan.id, craft: 'Writer', status: 'confirmed', role: 'viewer' });
  if (crew.error) throw crew.error;

  const script = await cast.sam.client
    .from('scripts')
    .insert({ title: 'Shared Draft', content: 'INT. CAVE - NIGHT\n\nSAM\nRead me.\n', created_by: cast.sam.id, last_edited_by: cast.sam.id, project_id: projectId })
    .select('id')
    .single();
  if (script.error) throw script.error;
  scriptId = script.data.id;

  const solo = await cast.sam.client
    .from('scripts')
    .insert({ title: 'Solo Draft', content: 'EXT. RIDGE - DAWN', created_by: cast.sam.id, last_edited_by: cast.sam.id })
    .select('id')
    .single();
  if (solo.error) throw solo.error;
  soloId = solo.data.id;
});

afterAll(async () => {
  await destroyCast(cast);
});

async function tokenOf(id: string): Promise<string> {
  const { data, error } = await cast.sam.client.from('scripts').select('share_token').eq('id', id).single();
  if (error) throw error;
  return data.share_token as string;
}

async function lookup(token: string, client = anonClient()) {
  const { data, error } = await client.rpc('get_shared_script', { p_token: token });
  if (error) throw error;
  return data ?? [];
}

describe('script share links — the token is the only way in', () => {
  it('the owner turns sharing on', async () => {
    const { error } = await cast.sam.client.from('scripts').update({ shared: true }).eq('id', scriptId);
    expect(error).toBeNull();
  });

  it('anon and the outsider cannot list shared scripts or read one by id', async () => {
    for (const client of [anonClient(), cast.riley.client]) {
      const list = await client.from('scripts').select('id').eq('shared', true);
      expect(list.error).toBeNull();
      expect((list.data ?? []).map((r) => r.id)).not.toContain(scriptId);
      const byId = await client.from('scripts').select('id').eq('id', scriptId);
      expect(byId.data ?? []).toEqual([]);
    }
  });

  it('anyone with the link reads it — title, content and the author, nothing else', async () => {
    const token = await tokenOf(scriptId);
    for (const client of [anonClient(), cast.riley.client]) {
      const rows = await lookup(token, client);
      expect(rows).toHaveLength(1);
      expect(rows[0].title).toBe('Shared Draft');
      expect(rows[0].content).toContain('Read me.');
      expect(rows[0].author_username).toBe(cast.sam.username);
      expect(Object.keys(rows[0]).sort()).toEqual(['author_avatar_url', 'author_role', 'author_username', 'content', 'format', 'title', 'updated_at']);
    }
  });

  it('a wrong, empty or partial token finds nothing', async () => {
    const token = await tokenOf(scriptId);
    expect(await lookup('nope')).toEqual([]);
    expect(await lookup('')).toEqual([]);
    expect(await lookup(token.slice(0, 8))).toEqual([]);
  });

  it('a script that isn’t shared does not resolve by its token', async () => {
    expect(await lookup(await tokenOf(soloId))).toEqual([]);
  });

  it('the outsider and a viewer can’t turn sharing on or rotate the token', async () => {
    const before = await tokenOf(scriptId);
    const riley = await cast.riley.client.from('scripts').update({ share_token: 'riley-owns-this' }).eq('id', scriptId).select('id');
    expect(riley.data ?? []).toEqual([]);
    const jordan = await cast.jordan.client.from('scripts').update({ share_token: 'jordan-rotates' }).eq('id', scriptId);
    expect(jordan.error).not.toBeNull();
    const jordanOff = await cast.jordan.client.from('scripts').update({ shared: false }).eq('id', scriptId);
    expect(jordanOff.error).not.toBeNull();
    expect(await tokenOf(scriptId)).toBe(before);
  });

  it('a viewer can still edit the script’s words (sharing is guarded, not the row)', async () => {
    const upd = await cast.jordan.client.from('scripts').update({ title: 'Shared Draft (notes)' }).eq('id', scriptId).select('title');
    expect(upd.error).toBeNull();
  });

  it('revoking (a new token) kills the old link; the new one works', async () => {
    const old = await tokenOf(scriptId);
    const fresh = crypto.randomUUID().replace(/-/g, '');
    const { error } = await cast.sam.client.from('scripts').update({ share_token: fresh }).eq('id', scriptId);
    expect(error).toBeNull();
    expect(await lookup(old)).toEqual([]);
    expect(await lookup(fresh)).toHaveLength(1);
  });

  it('a short token is refused (links must stay unguessable)', async () => {
    const { error } = await cast.sam.client.from('scripts').update({ share_token: 'abc' }).eq('id', scriptId);
    expect(error).not.toBeNull();
  });

  it('turning sharing off closes the link at once', async () => {
    const token = await tokenOf(scriptId);
    const { error } = await cast.sam.client.from('scripts').update({ shared: false }).eq('id', scriptId);
    expect(error).toBeNull();
    expect(await lookup(token)).toEqual([]);
  });

  it('a lead on the project may share; the owner of a solo script may share it', async () => {
    const promote = await cast.sam.client.from('project_crew').update({ role: 'lead' }).eq('project_id', projectId).eq('user_id', cast.jordan.id);
    expect(promote.error).toBeNull();
    const lead = await cast.jordan.client.from('scripts').update({ shared: true }).eq('id', scriptId);
    expect(lead.error).toBeNull();
    const solo = await cast.sam.client.from('scripts').update({ shared: true }).eq('id', soloId);
    expect(solo.error).toBeNull();
    expect(await lookup(await tokenOf(soloId))).toHaveLength(1);
  });
});
