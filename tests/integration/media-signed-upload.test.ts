import { randomUUID } from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, adminClient, type Cast } from './support/personas';
import { createCrewedProject, tinyPng } from './support/project';

// The library uploads through a signed upload URL sent over XMLHttpRequest so the island can show progress
// (lib/supabase/uploadProgress.ts). The URL must be issued only to someone who could have uploaded the plain way:
// owner ✅, crew ✅, outsider ❌. The file is then sent as a raw body with the same headers the browser code uses.
const BUCKET = 'project-media';
let cast: Cast;
let projectId: string;
const uploaded: string[] = [];

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Signed Upload'));
});
afterAll(async () => {
  if (uploaded.length) await adminClient().storage.from(BUCKET).remove(uploaded);
  await destroyCast(cast);
});

const newPath = () => `${projectId}/${randomUUID()}/frame.png`;

async function sendLikeTheBrowser(signedUrl: string): Promise<Response> {
  const png = tinyPng();
  return fetch(signedUrl, { method: 'PUT', headers: { 'x-upsert': 'false', 'cache-control': 'max-age=31536000', 'content-type': 'image/png' }, body: png });
}

describe('signed upload URLs for the project library', () => {
  it.each([['the owner', () => cast.sam], ['a crew member', () => cast.jordan]])('%s gets a URL, and the file lands at that path', async (_who, pick) => {
    const path = newPath();
    const { data, error } = await pick().client.storage.from(BUCKET).createSignedUploadUrl(path);
    expect(error).toBeNull();
    const res = await sendLikeTheBrowser(data!.signedUrl);
    expect(res.status).toBeLessThan(300);
    uploaded.push(path);
    const { data: file } = await adminClient().storage.from(BUCKET).download(path);
    expect(file?.size).toBe(tinyPng().size);
  });

  it('an outsider is never issued a URL for a project’s library path', async () => {
    const path = newPath();
    const { data, error } = await cast.riley.client.storage.from(BUCKET).createSignedUploadUrl(path);
    expect(error).not.toBeNull();
    expect(data).toBeNull();
    const { data: file } = await adminClient().storage.from(BUCKET).download(path);
    expect(file).toBeNull();
  });

  it('a URL for one path cannot write another', async () => {
    const mine = newPath();
    const other = newPath();
    const { data } = await cast.sam.client.storage.from(BUCKET).createSignedUploadUrl(mine);
    const swapped = data!.signedUrl.replace(encodeURI(mine), encodeURI(other));
    const res = await sendLikeTheBrowser(swapped);
    expect(res.status).toBeGreaterThanOrEqual(400);
    const { data: file } = await adminClient().storage.from(BUCKET).download(other);
    expect(file).toBeNull();
  });
});
