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

describe('script access follows the project', () => {
  it('a crew member removed from the project loses the scripts they wrote there', async () => {
    const { projectId: pid } = await createCrewedProject(cast, 'Removal');
    const { data: s, error } = await cast.jordan.client.from('scripts')
      .insert({ title: 'Jordan draft', content: 'x', project_id: pid, created_by: cast.jordan.id, last_edited_by: cast.jordan.id })
      .select('id').single();
    expect(error).toBeNull();
    await cast.sam.client.from('project_crew').delete().eq('project_id', pid).eq('user_id', cast.jordan.id);

    expect((await cast.jordan.client.from('scripts').select('id').eq('id', s!.id)).data).toEqual([]);
    const upd = await cast.jordan.client.from('scripts').update({ content: 'vandalised' }).eq('id', s!.id).select('id');
    expect(upd.data ?? []).toEqual([]);
    expect((await cast.sam.client.from('scripts').select('content').eq('id', s!.id).single()).data?.content).toBe('x');
  });

  it('nobody can add a script to a project they are not on', async () => {
    const { error } = await cast.riley.client.from('scripts')
      .insert({ title: 'Spam', content: '', project_id: projectId, created_by: cast.riley.id });
    expect(error).not.toBeNull();
  });

  it('characters of a shared script are not editable by its readers', async () => {
    const { data: s } = await cast.sam.client.from('scripts')
      .insert({ title: 'Public read', content: 'x', created_by: cast.sam.id, shared: true }).select('id').single();
    expect((await cast.riley.client.from('scripts').select('id').eq('id', s!.id)).data).toHaveLength(1);
    const { error } = await cast.riley.client.from('script_characters').insert({ script_id: s!.id, name: 'INTRUDER' });
    expect(error).not.toBeNull();
    expect((await cast.sam.client.from('script_characters').insert({ script_id: s!.id, name: 'MARA' })).error).toBeNull();
  });
});

describe('audit log', () => {
  it('entries can only be written in your own name, and only admins read them', async () => {
    const forged = await cast.riley.client.from('audit_logs').insert({ user_id: cast.sam.id, action: 'user_login', resource_type: 'auth' });
    expect(forged.error).not.toBeNull();
    expect((await cast.riley.client.from('audit_logs').insert({ user_id: cast.riley.id, action: 'user_login', resource_type: 'auth' })).error).toBeNull();
    expect((await cast.riley.client.from('audit_logs').select('id')).data).toEqual([]);

    await adminClient().from('profiles').update({ is_admin: true }).eq('id', cast.sam.id);
    const { data, error } = await cast.sam.client.from('audit_logs').select('user_id').eq('user_id', cast.riley.id);
    await adminClient().from('profiles').update({ is_admin: false }).eq('id', cast.sam.id);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });
});

describe('messages', () => {
  it('go to a person or to a channel you can post in — nowhere else', async () => {
    const legacy = await cast.riley.client.from('messages').insert({ sender_id: cast.riley.id, content: 'hi', channel_id: 'general' });
    expect(legacy.error).not.toBeNull();
    const dm = await cast.riley.client.from('messages').insert({ sender_id: cast.riley.id, receiver_id: cast.sam.id, content: 'hi' });
    expect(dm.error).toBeNull();
  });

  it('crew can react to each other’s channel messages; outsiders cannot', async () => {
    const { error: cErr } = await cast.sam.client.from('channels').insert({ project_id: projectId, name: 'set-talk', created_by: cast.sam.id });
    expect(cErr).toBeNull();
    const { data: ch } = await cast.sam.client.from('channels').select('id').eq('project_id', projectId).eq('name', 'set-talk').single();
    const { data: msg, error } = await cast.sam.client.from('messages')
      .insert({ sender_id: cast.sam.id, content: 'Call time 6am', channel_uuid: ch!.id }).select('id').single();
    expect(error).toBeNull();

    const r = await cast.jordan.client.rpc('toggle_message_reaction', { p_message: msg!.id, p_emoji: '👍' });
    expect(r.error).toBeNull();
    expect(r.data).toEqual({ '👍': [cast.jordan.id] });
    expect((await cast.riley.client.rpc('toggle_message_reaction', { p_message: msg!.id, p_emoji: '👍' })).error).not.toBeNull();
  });
});

describe('SFX uploads', () => {
  const audio = () => new Blob([new Uint8Array([0x49, 0x44, 0x33, 0x04])], { type: 'audio/mpeg' });

  it('go into your own folder, audio only', async () => {
    const bucket = cast.riley.client.storage.from('sfx_library');
    expect((await bucket.upload(`${cast.riley.id}/door.mp3`, audio())).error).toBeNull();
    expect((await bucket.upload(`${cast.sam.id}/door.mp3`, audio())).error).not.toBeNull();
    expect((await bucket.upload(`door.mp3`, audio())).error).not.toBeNull();
    expect((await bucket.upload(`${cast.riley.id}/page.html`, new Blob(['<script>'], { type: 'text/html' }))).error).not.toBeNull();
    expect((await bucket.remove([`${cast.riley.id}/door.mp3`])).data).toHaveLength(1);
  });

  it('the unused public buckets take no uploads', async () => {
    for (const b of ['assets', 'studio-assets', 'sfx-library']) {
      expect((await cast.riley.client.storage.from(b).upload(`${cast.riley.id}/x.mp3`, audio())).error, b).not.toBeNull();
    }
  });
});
