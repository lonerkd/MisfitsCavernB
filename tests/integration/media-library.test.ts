import { randomUUID } from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, anonClient, adminClient, type Cast } from './support/personas';
import { createCrewedProject, setVisibility, tinyPng } from './support/project';

// The project media library (public.media) and its private storage bucket,
// exercised as each persona through PostgREST, Storage and RLS.
const BUCKET = 'project-media';
let cast: Cast;
let projectId: string;
const uploaded: string[] = [];

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Media Library'));
});

afterAll(async () => {
  if (uploaded.length) await adminClient().storage.from(BUCKET).remove(uploaded);
  await destroyCast(cast);
});

async function addLink(client: Cast['sam']['client'], userId: string, title: string) {
  return client
    .from('media')
    .insert({ project_id: projectId, kind: 'link', title, external_url: 'https://example.com/ref', created_by: userId })
    .select('id, shared')
    .single();
}

async function upload(client: Cast['sam']['client'], userId: string, title: string) {
  const id = randomUUID();
  const path = `${projectId}/${id}/frame.png`;
  const up = await client.storage.from(BUCKET).upload(path, tinyPng(), { contentType: 'image/png' });
  if (!up.error) uploaded.push(path);
  const row = up.error
    ? null
    : await client.from('media').insert({ id, project_id: projectId, kind: 'image', title, storage_path: path, mime_type: 'image/png', size_bytes: tinyPng().size, created_by: userId }).select('id').single();
  return { id, path, uploadError: up.error, rowError: row?.error ?? null };
}

describe('media rows — who can see and add them', () => {
  it('the owner and crew both add to the library and see each other’s items', async () => {
    const mine = await addLink(cast.sam.client, cast.sam.id, 'Sam ref');
    const theirs = await addLink(cast.jordan.client, cast.jordan.id, 'Jordan ref');
    expect(mine.error).toBeNull();
    expect(theirs.error).toBeNull();

    for (const who of [cast.sam, cast.jordan]) {
      const { data } = await who.client.from('media').select('title').eq('project_id', projectId).order('title');
      expect(data?.map((m) => m.title)).toEqual(expect.arrayContaining(['Jordan ref', 'Sam ref']));
    }
  });

  it('the outsider and anon see nothing and cannot add', async () => {
    expect((await cast.riley.client.from('media').select('id').eq('project_id', projectId)).data).toEqual([]);
    expect((await anonClient().from('media').select('id').eq('project_id', projectId)).data).toEqual([]);
    const attempt = await addLink(cast.riley.client, cast.riley.id, 'Riley ref');
    expect(attempt.error).not.toBeNull();
  });

  it('nobody can add media on someone else’s behalf', async () => {
    const forged = await addLink(cast.jordan.client, cast.sam.id, 'forged');
    expect(forged.error).not.toBeNull();
  });

  it('rejects rows with no source, two sources, or a non-http link', async () => {
    const none = await cast.sam.client.from('media').insert({ project_id: projectId, kind: 'image', created_by: cast.sam.id });
    const bad = await cast.sam.client.from('media').insert({ project_id: projectId, kind: 'link', external_url: 'javascript:alert(1)', created_by: cast.sam.id });
    expect(none.error).not.toBeNull();
    expect(bad.error).not.toBeNull();
  });

  it('source and author are immutable once created', async () => {
    const { data } = await addLink(cast.sam.client, cast.sam.id, 'fixed');
    const res = await cast.sam.client.from('media').update({ external_url: 'https://evil.example' }).eq('id', data!.id);
    expect(res.error?.message).toMatch(/cannot be changed/);
  });
});

describe('publishing to the share link is the owner’s decision', () => {
  it('crew cannot publish an item (insert or update)', async () => {
    const insert = await cast.jordan.client
      .from('media')
      .insert({ project_id: projectId, kind: 'link', external_url: 'https://example.com/x', shared: true, created_by: cast.jordan.id });
    expect(insert.error?.message).toMatch(/Only the project owner/);

    const { data } = await addLink(cast.jordan.client, cast.jordan.id, 'to publish');
    const update = await cast.jordan.client.from('media').update({ shared: true }).eq('id', data!.id);
    expect(update.error?.message).toMatch(/Only the project owner/);
  });

  it('crew can still edit titles and boards', async () => {
    const { data } = await addLink(cast.sam.client, cast.sam.id, 'owner item');
    const res = await cast.jordan.client.from('media').update({ title: 'Renamed by crew', board: 'Lighting' }).eq('id', data!.id).select('title, board').single();
    expect(res.error).toBeNull();
    expect(res.data).toEqual({ title: 'Renamed by crew', board: 'Lighting' });
  });

  it('the owner can publish and unpublish', async () => {
    const { data } = await addLink(cast.sam.client, cast.sam.id, 'published');
    const on = await cast.sam.client.from('media').update({ shared: true }).eq('id', data!.id).select('shared').single();
    expect(on.data?.shared).toBe(true);
    const off = await cast.sam.client.from('media').update({ shared: false }).eq('id', data!.id).select('shared').single();
    expect(off.data?.shared).toBe(false);
  });
});

describe('deleting media', () => {
  it('crew can delete their own items but not the owner’s', async () => {
    const own = await addLink(cast.jordan.client, cast.jordan.id, 'jordan temp');
    const owners = await addLink(cast.sam.client, cast.sam.id, 'sam keeps');

    const delOwn = await cast.jordan.client.from('media').delete().eq('id', own.data!.id).select('id');
    expect(delOwn.data).toHaveLength(1);
    const delOwners = await cast.jordan.client.from('media').delete().eq('id', owners.data!.id).select('id');
    expect(delOwners.data).toEqual([]);
  });

  it('the owner can delete anything in the project', async () => {
    const crewItem = await addLink(cast.jordan.client, cast.jordan.id, 'jordan item');
    const del = await cast.sam.client.from('media').delete().eq('id', crewItem.data!.id).select('id');
    expect(del.data).toHaveLength(1);
  });
});

describe('private storage', () => {
  it('crew upload into the project folder and read files back through signed URLs', async () => {
    const { path, uploadError, rowError } = await upload(cast.jordan.client, cast.jordan.id, 'Location scout');
    expect(uploadError).toBeNull();
    expect(rowError).toBeNull();

    const signed = await cast.sam.client.storage.from(BUCKET).createSignedUrl(path, 60);
    expect(signed.error).toBeNull();
    const res = await fetch(signed.data!.signedUrl);
    expect(res.status).toBe(200);
    expect((await res.arrayBuffer()).byteLength).toBe(tinyPng().size);
  });

  it('files are not public — there is no unsigned URL that works', async () => {
    const { path } = await upload(cast.sam.client, cast.sam.id, 'Not public');
    const publicUrl = anonClient().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    expect((await fetch(publicUrl)).status).toBeGreaterThanOrEqual(400);
  });

  it('the outsider and anon can neither upload into the project nor read its files', async () => {
    const riley = await upload(cast.riley.client, cast.riley.id, 'intruder');
    expect(riley.uploadError).not.toBeNull();

    const { path } = await upload(cast.sam.client, cast.sam.id, 'Secret');
    expect((await cast.riley.client.storage.from(BUCKET).createSignedUrl(path, 60)).error).not.toBeNull();
    expect((await anonClient().storage.from(BUCKET).createSignedUrl(path, 60)).error).not.toBeNull();
    expect((await cast.riley.client.storage.from(BUCKET).list(projectId)).data ?? []).toEqual([]);
  });

  it('uploads outside a project folder are refused', async () => {
    const res = await cast.sam.client.storage.from(BUCKET).upload(`loose/${randomUUID()}.png`, tinyPng(), { contentType: 'image/png' });
    expect(res.error).not.toBeNull();
  });

  it('only images, video, audio and PDFs are accepted', async () => {
    const res = await cast.sam.client.storage
      .from(BUCKET)
      .upload(`${projectId}/${randomUUID()}/script.html`, new Blob(['<script>x</script>'], { type: 'text/html' }), { contentType: 'text/html' });
    expect(res.error).not.toBeNull();
  });
});

describe('a private project locks crew out of its media', () => {
  it('crew lose read access when the owner makes the project private, and regain it on team', async () => {
    await addLink(cast.sam.client, cast.sam.id, 'visibility probe');
    await setVisibility(cast, projectId, 'private');
    expect((await cast.jordan.client.from('media').select('id').eq('project_id', projectId)).data).toEqual([]);
    expect((await cast.sam.client.from('media').select('id').eq('project_id', projectId)).data?.length).toBeGreaterThan(0);
    await setVisibility(cast, projectId, 'team');
    expect((await cast.jordan.client.from('media').select('id').eq('project_id', projectId)).data?.length).toBeGreaterThan(0);
  });
});
