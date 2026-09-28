import { randomUUID } from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, anonClient, adminClient, type Cast } from './support/personas';
import { createCrewedProject, createScript, setVisibility, tinyPng } from './support/project';
import { createStudioApi, MEDIA_BUCKET, type Media } from '@/lib/studio/api';
import { parseScript } from '@/lib/scriptos/parser';

// What a share link exposes: get_shared_lookbook(token) and the storage policy
// that lets a viewer open published files. Only media the owner published, only
// while the project is link- or public-shared, only with the exact token.
let cast: Cast;
let projectId: string;
let shareToken: string;
let published: Media;
let unpublished: Media;
let publishedFile: Media;
let caveId: string;
const uploaded: string[] = [];

beforeAll(async () => {
  cast = await createCast();
  ({ projectId, shareToken } = await createCrewedProject(cast, 'Lookbook'));
  const scriptId = await createScript(cast, projectId, '');
  const sam = createStudioApi(cast.sam.client);
  const scenes = await sam.syncScriptScenes(scriptId, parseScript('INT. CAVE - NIGHT\n\nFire.\n\nEXT. ROAD - DAY\n\nDust.\n').scenes);
  caveId = scenes[0].id;

  published = await sam.addLink(projectId, cast.sam.id, { url: 'https://example.com/firelight.jpg', title: 'Firelight' });
  unpublished = await sam.addLink(projectId, cast.sam.id, { url: 'https://example.com/internal.jpg', title: 'Internal only' });
  await sam.updateMedia(published.id, { shared: true, notes: 'Budget: cheap version' });

  const file = Object.assign(tinyPng(), { name: 'frame.png' });
  publishedFile = await sam.uploadFile(projectId, cast.sam.id, file, { title: 'Frame grab' });
  uploaded.push(publishedFile.storage_path!);
  await sam.updateMedia(publishedFile.id, { shared: true });

  await sam.linkMedia(projectId, cast.sam.id, caveId, published.id);
  await sam.linkMedia(projectId, cast.sam.id, caveId, unpublished.id);
  await sam.linkMedia(projectId, cast.sam.id, caveId, publishedFile.id);
});

afterAll(async () => {
  if (uploaded.length) await adminClient().storage.from(MEDIA_BUCKET).remove(uploaded);
  await destroyCast(cast);
});

const lookbook = (token: string) => createStudioApi(anonClient()).getLookbook(token);
const anonSign = (path: string) => anonClient().storage.from(MEDIA_BUCKET).createSignedUrl(path, 60);

describe('get_shared_lookbook', () => {
  it('resolves nothing while the project is team-only or private', async () => {
    await setVisibility(cast, projectId, 'team');
    expect(await lookbook(shareToken)).toBeNull();
    await setVisibility(cast, projectId, 'private');
    expect(await lookbook(shareToken)).toBeNull();
  });

  it('with a link: only published media, and only the scenes they’re linked to', async () => {
    await setVisibility(cast, projectId, 'link');
    const book = await lookbook(shareToken);
    expect(book?.media.map((m) => m.title).sort()).toEqual(['Firelight', 'Frame grab']);
    expect(book?.scenes).toEqual([
      { id: caveId, scene_number: 1, heading: 'INT. CAVE - NIGHT', media_ids: [published.id, publishedFile.id] },
    ]);
  });

  it('never includes notes, authorship or unpublished items', async () => {
    await setVisibility(cast, projectId, 'link');
    const book = await lookbook(shareToken);
    const raw = JSON.stringify(book);
    expect(raw).not.toContain('Budget');
    expect(raw).not.toContain(unpublished.id);
    expect(raw).not.toContain(cast.sam.id);
    expect(Object.keys(book!.media[0]).sort()).toEqual(['board', 'external_url', 'height', 'id', 'kind', 'mime_type', 'storage_path', 'title', 'width']);
  });

  it('a wrong or empty token resolves nothing', async () => {
    await setVisibility(cast, projectId, 'public');
    expect(await lookbook('0'.repeat(32))).toBeNull();
    expect(await lookbook('')).toBeNull();
  });
});

describe('opening published files', () => {
  it('a viewer can open a published file only while the link is live', async () => {
    await setVisibility(cast, projectId, 'link');
    const signed = await anonSign(publishedFile.storage_path!);
    expect(signed.error).toBeNull();
    expect((await fetch(signed.data!.signedUrl)).status).toBe(200);

    await setVisibility(cast, projectId, 'team');
    expect((await anonSign(publishedFile.storage_path!)).error).not.toBeNull();
  });

  it('unpublishing a file closes it immediately', async () => {
    await setVisibility(cast, projectId, 'link');
    const sam = createStudioApi(cast.sam.client);
    await sam.updateMedia(publishedFile.id, { shared: false });
    expect((await anonSign(publishedFile.storage_path!)).error).not.toBeNull();
    await sam.updateMedia(publishedFile.id, { shared: true });
    expect((await anonSign(publishedFile.storage_path!)).error).toBeNull();
  });

  it('unpublished files in a shared project stay closed, and so does listing', async () => {
    await setVisibility(cast, projectId, 'link');
    const sam = createStudioApi(cast.sam.client);
    const privateFile = await sam.uploadFile(projectId, cast.sam.id, Object.assign(tinyPng(), { name: 'private.png' }));
    uploaded.push(privateFile.storage_path!);
    expect((await anonSign(privateFile.storage_path!)).error).not.toBeNull();
    const listing = await anonClient().storage.from(MEDIA_BUCKET).list(`${projectId}/${privateFile.id}`);
    expect(listing.data ?? []).toEqual([]);
  });

  it('a guessed path to a file that does not exist gets nothing', async () => {
    await setVisibility(cast, projectId, 'link');
    expect((await anonSign(`${projectId}/${randomUUID()}/frame.png`)).error).not.toBeNull();
  });
});

describe('published media permalink — get_published_media', () => {
  const lookup = (id: string) => anonClient().rpc('get_published_media', { p_media_id: id });

  it('resolves a published file only while the project is shared', async () => {
    await setVisibility(cast, projectId, 'link');
    expect((await lookup(publishedFile.id)).data).toEqual([{ storage_path: publishedFile.storage_path, kind: 'image', mime_type: 'image/png' }]);
    await setVisibility(cast, projectId, 'team');
    expect((await lookup(publishedFile.id)).data).toEqual([]);
  });

  it('never resolves unpublished items or links', async () => {
    await setVisibility(cast, projectId, 'link');
    expect((await lookup(unpublished.id)).data).toEqual([]);
    expect((await lookup(published.id)).data).toEqual([]); // an external link: no file to serve
  });
});

describe('Showcase — get_public_showcase', () => {
  const showcase = async () => (await anonClient().rpc('get_public_showcase', { p_limit: 100 })).data ?? [];

  it('lists published media of Public projects only — never link-shared ones', async () => {
    await setVisibility(cast, projectId, 'link');
    expect((await showcase()).some((r) => r.media_id === published.id)).toBe(false);

    await setVisibility(cast, projectId, 'public');
    const rows = await showcase();
    const ids = rows.map((r) => r.media_id);
    expect(ids).toEqual(expect.arrayContaining([published.id, publishedFile.id]));
    expect(ids).not.toContain(unpublished.id);
    expect(rows.find((r) => r.media_id === published.id)).toMatchObject({ project_title: 'Lookbook', share_token: shareToken });
  });
});

describe('platform stats', () => {
  it('are real totals, the same for everyone, and counts only', async () => {
    const asAnon = (await anonClient().rpc('get_platform_stats')).data?.[0];
    const asRiley = (await cast.riley.client.rpc('get_platform_stats')).data?.[0];
    expect(asAnon).toEqual(asRiley);
    expect(Object.keys(asAnon!).sort()).toEqual(['creators', 'jobs', 'media', 'projects', 'scripts']);
    expect(Number(asAnon!.projects)).toBeGreaterThanOrEqual(1);
    expect(Number(asAnon!.media)).toBeGreaterThanOrEqual(3);
  });
});

