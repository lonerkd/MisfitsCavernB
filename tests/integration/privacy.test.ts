import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, anonClient, adminClient, type Cast } from './support/personas';
import { createCrewedProject, createScript, setVisibility } from './support/project';

// Suite-wide privacy rules (migration 20260926030000), as each persona.
let cast: Cast;
let projectId: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Privacy'));
  const sam = cast.sam.client;
  await sam.from('budget_items').insert({ project_id: projectId, category: 'Camera', amount: 1200 });
  await sam.from('project_tasks').insert({ project_id: projectId, title: 'Lock locations' });
  await sam.from('project_beats').insert({ project_id: projectId, title: 'The reveal', content: 'x' });
  await createScript(cast, projectId, 'INT. VAULT - NIGHT\n\nSecret.\n');
});

afterAll(async () => {
  await setVisibility(cast, projectId, 'team').catch(() => {});
  await destroyCast(cast);
});

const count = async (client: Cast['sam']['client'], table: 'budget_items' | 'project_tasks' | 'project_beats' | 'scripts') =>
  ((await client.from(table).select('id').eq('project_id', projectId)).data ?? []).length;

describe('a private project is private everywhere', () => {
  it('crew read budget, tasks, beats and scripts on a team project…', async () => {
    for (const t of ['budget_items', 'project_tasks', 'project_beats', 'scripts'] as const) expect(await count(cast.jordan.client, t)).toBe(1);
  });

  it('…and none of it once the owner makes it private (the owner still does)', async () => {
    await setVisibility(cast, projectId, 'private');
    for (const t of ['budget_items', 'project_tasks', 'project_beats', 'scripts'] as const) {
      expect(await count(cast.jordan.client, t)).toBe(0);
      expect(await count(cast.sam.client, t)).toBe(1);
    }
    await setVisibility(cast, projectId, 'team');
  });

  it('outsiders never see any of it', async () => {
    for (const t of ['budget_items', 'project_tasks', 'project_beats', 'scripts'] as const) expect(await count(cast.riley.client, t)).toBe(0);
  });
});

describe('crew see their teammates', () => {
  it('a crew member sees the whole crew, not just their own row', async () => {
    const riley2 = cast.riley;
    await cast.sam.client.from('project_crew').insert({ project_id: projectId, user_id: riley2.id, role: 'Gaffer', status: 'confirmed' });
    const { data } = await cast.jordan.client.from('project_crew').select('user_id').eq('project_id', projectId);
    expect(data?.map((r) => r.user_id).sort()).toEqual([cast.jordan.id, riley2.id].sort());
    await cast.sam.client.from('project_crew').delete().eq('project_id', projectId).eq('user_id', riley2.id);
  });
});

describe('notifications cannot be forged', () => {
  const send = (from: Cast['sam'], to: string, link: string | null = '/projects') =>
    from.client.from('notifications').insert({ user_id: to, type: 'test', title: 'Hello', link });

  it('crew can notify each other', async () => {
    expect((await send(cast.jordan, cast.sam.id)).error).toBeNull();
  });

  it('a stranger cannot notify someone they have no connection to', async () => {
    expect((await send(cast.riley, cast.sam.id)).error).not.toBeNull();
  });

  it('links must stay on this site', async () => {
    for (const bad of ['https://evil.example/login', '//evil.example', 'javascript:alert(1)', '/\\evil.example']) {
      expect((await send(cast.jordan, cast.sam.id, bad)).error).not.toBeNull();
    }
  });

  it('the sender is recorded and cannot be spoofed', async () => {
    const spoof = await cast.jordan.client.from('notifications').insert({ user_id: cast.sam.id, type: 't', title: 'x', created_by: cast.sam.id });
    expect(spoof.error).not.toBeNull();
    const { data } = await cast.sam.client.from('notifications').select('created_by').eq('user_id', cast.sam.id);
    expect(data?.every((n) => n.created_by === cast.jordan.id)).toBe(true);
  });
});

describe('project soundtrack notes', () => {
  it('only the project team can read them', async () => {
    const { error } = await cast.sam.client.from('project_audio_references').insert({ project_id: projectId, added_by: cast.sam.id, uri: 'spotify:track:1', title: 'Temp score' });
    expect(error).toBeNull();
    expect((await cast.jordan.client.from('project_audio_references').select('id').eq('project_id', projectId)).data).toHaveLength(1);
    expect((await cast.riley.client.from('project_audio_references').select('id').eq('project_id', projectId)).data).toEqual([]);
    expect((await anonClient().from('project_audio_references').select('id').eq('project_id', projectId)).data ?? []).toEqual([]);
  });
});

describe('profile privacy', () => {
  it('public profile fields are readable by anyone', async () => {
    const { data, error } = await anonClient().from('profiles').select('id, username, avatar_url').eq('id', cast.sam.id);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it('private fields are not — not even by selecting everything', async () => {
    for (const cols of ['is_admin', 'notification_prefs', 'discord_id', '*']) {
      const r = await cast.riley.client.from('profiles').select(cols).eq('id', cast.sam.id);
      expect(r.error, cols).not.toBeNull();
    }
  });

  it('their owner reads them through get_my_account', async () => {
    await adminClient().from('profiles').update({ notification_prefs: { mentions: false } }).eq('id', cast.sam.id);
    const { data, error } = await cast.sam.client.rpc('get_my_account');
    expect(error).toBeNull();
    expect(data?.[0]).toMatchObject({ is_admin: false, notification_prefs: { mentions: false } });
  });

  it('only admins can list everyone’s admin flag', async () => {
    expect((await cast.riley.client.rpc('admin_list_users')).error).not.toBeNull();
  });
});
