import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, anonClient, type Cast } from './support/personas';

// Project visibility, end to end through PostgREST + RLS as each persona.
//   private → owner only      team → owner + crew (default)
//   link    → owner + crew; anyone else only via get_shared_project(token)
//   public  → same row access as link; share RPC also resolves
// Nobody outside the project may ever read the row directly (Riley P0).
let cast: Cast;
let projectId: string;
let shareToken: string;

beforeAll(async () => {
  cast = await createCast();
  const { data, error } = await cast.sam.client
    .from('projects')
    .insert({ title: 'Visibility Matrix', creator_id: cast.sam.id })
    .select('id, share_token, visibility')
    .single();
  if (error) throw error;
  projectId = data.id;
  shareToken = data.share_token;
  expect(data.visibility).toBe('team');

  const crew = await cast.sam.client
    .from('project_crew')
    .insert({ project_id: projectId, user_id: cast.jordan.id, role: 'Editor', status: 'confirmed' });
  if (crew.error) throw crew.error;
});

afterAll(async () => {
  await destroyCast(cast);
});

async function canSee(client: typeof cast.sam.client): Promise<boolean> {
  const { data, error } = await client.from('projects').select('id').eq('id', projectId);
  if (error) throw error;
  return (data ?? []).length === 1;
}

async function setVisibility(v: 'private' | 'team' | 'link' | 'public') {
  const { error } = await cast.sam.client.from('projects').update({ visibility: v }).eq('id', projectId);
  if (error) throw error;
}

async function shareLookup(token: string) {
  const { data, error } = await anonClient().rpc('get_shared_project', { p_token: token });
  if (error) throw error;
  return data ?? [];
}

describe('project visibility — who can read the row', () => {
  it('team (default): owner and crew see it; the outsider and anon do not', async () => {
    await setVisibility('team');
    expect(await canSee(cast.sam.client)).toBe(true);
    expect(await canSee(cast.jordan.client)).toBe(true);
    expect(await canSee(cast.riley.client)).toBe(false);
    expect(await canSee(anonClient())).toBe(false);
  });

  it('private: only the owner sees it — crew loses access', async () => {
    await setVisibility('private');
    expect(await canSee(cast.sam.client)).toBe(true);
    expect(await canSee(cast.jordan.client)).toBe(false);
    expect(await canSee(cast.riley.client)).toBe(false);
  });

  it('link: still no direct row access for outsiders or anon', async () => {
    await setVisibility('link');
    expect(await canSee(cast.riley.client)).toBe(false);
    expect(await canSee(anonClient())).toBe(false);
  });

  it('anon cannot enumerate projects at all', async () => {
    await setVisibility('public');
    const { data, error } = await anonClient().from('projects').select('id');
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});

describe('share links — get_shared_project(token)', () => {
  it('resolves a link-shared project for anyone holding the exact token', async () => {
    await setVisibility('link');
    const rows = await shareLookup(shareToken);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ title: 'Visibility Matrix', visibility: 'link', creator_username: cast.sam.username });
  });

  it('returns overview fields only — never budget, settings or the token', async () => {
    await setVisibility('link');
    const [row] = await shareLookup(shareToken);
    expect(Object.keys(row).sort()).toEqual(['accent_color', 'creator_username', 'description', 'status', 'title', 'visibility']);
  });

  it('does not resolve team or private projects, even with the right token', async () => {
    await setVisibility('team');
    expect(await shareLookup(shareToken)).toHaveLength(0);
    await setVisibility('private');
    expect(await shareLookup(shareToken)).toHaveLength(0);
  });

  it('does not resolve a wrong or empty token', async () => {
    await setVisibility('link');
    expect(await shareLookup('0'.repeat(32))).toHaveLength(0);
    expect(await shareLookup('')).toHaveLength(0);
  });
});

describe('who can change visibility', () => {
  it('crew cannot change it; the attempt affects no rows', async () => {
    await setVisibility('team');
    const { data, error } = await cast.jordan.client
      .from('projects')
      .update({ visibility: 'public' })
      .eq('id', projectId)
      .select('id');
    expect(error).toBeNull();
    expect(data).toEqual([]);
    const { data: check } = await cast.sam.client.from('projects').select('visibility').eq('id', projectId).single();
    expect(check?.visibility).toBe('team');
  });
});
