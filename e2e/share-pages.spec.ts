import { randomUUID } from 'node:crypto';
import { test, expect, stackEnabled, stackSkipReason } from './support/stack';
import type { SupabaseClient } from '@supabase/supabase-js';

// The public share surfaces, signed out:
// - /p/<token>: a published portfolio's link unfurls (title, description,
//   picture in the HTML the server sends) and the page opens.
// - /m/<id>: a published upload's permalink redirects to the file while the
//   item is published and the project is link-shared, and stops at once when
//   either is undone.
// Opt-in: E2E_LOCAL_STACK=1.
const TAG = Date.now().toString(36);
// A 1×1 PNG.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

test.describe('Share pages, signed out (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let admin: SupabaseClient;
  const owner = { id: '', username: `share${TAG}` };
  let projectId = '';
  let portfolioId = '';
  let shareToken = '';
  const mediaId = randomUUID();
  let storagePath = '';

  test.beforeAll(async ({ stack }) => {
    admin = stack.admin;
    owner.id = (await stack.createUser({ email: `share.${TAG}@journey.test`, password: randomUUID(), username: owner.username })).id;

    projectId = (await admin.from('projects').insert({ title: `Breakwater ${TAG}`, creator_id: owner.id, visibility: 'link' }).select('id').single()).data!.id;
    storagePath = `${projectId}/${mediaId}/still.png`;
    const up = await admin.storage.from('project-media').upload(storagePath, PNG, { contentType: 'image/png' });
    expect(up.error).toBeNull();
    const media = await admin.from('media').insert({ id: mediaId, project_id: projectId, kind: 'image', title: 'Still', storage_path: storagePath, mime_type: 'image/png', shared: true, created_by: owner.id });
    expect(media.error).toBeNull();

    const pf = (await admin.from('portfolio_projects').insert({ user_id: owner.id, title: `Breakwater ${TAG}`, visibility: 'public', role: 'Director', year: 2026, description: 'A harbour at night, a ferry that never comes.' }).select('id, share_token').single()).data!;
    portfolioId = pf.id;
    shareToken = pf.share_token;
    await admin.from('portfolio_media').insert({ project_id: portfolioId, title: 'Still', media_type: 'image', url: `https://example.com/still-${TAG}.png` });
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('portfolio_projects').delete().eq('id', portfolioId);
    await admin.from('media').delete().eq('id', mediaId);
    await admin.storage.from('project-media').remove([storagePath]);
    await admin.from('projects').delete().eq('id', projectId);
  });

  test('/p/<token> unfurls: title, description and picture in the server HTML', async ({ request, page }) => {
    expect(shareToken).toBeTruthy();
    const res = await request.get(`/p/${shareToken}`);
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toContain(`<meta property="og:title" content="Breakwater ${TAG}"`);
    expect(html).toContain('<meta property="og:description" content="A harbour at night, a ferry that never comes."');
    expect(html).toContain(`<meta property="og:image" content="https://example.com/still-${TAG}.png"`);
    expect(html).toContain('<meta name="robots" content="noindex, nofollow"');

    await page.goto(`/p/${shareToken}`);
    await expect(page.getByText(`Breakwater ${TAG}`).first()).toBeVisible({ timeout: 20_000 });

    // A link that leads nowhere previews as nothing in particular.
    const none = await (await request.get('/p/not-a-real-token')).text();
    expect(none).not.toContain('og:title');
  });

  test('/m/<id> serves a published upload, and stops when it is unpublished or unshared', async ({ request }) => {
    const first = await request.get(`/m/${mediaId}`, { maxRedirects: 0 });
    expect(first.status()).toBe(302);
    expect(first.headers()['cache-control']).toBe('no-store');
    const file = await request.get(`/m/${mediaId}`);
    expect(file.status()).toBe(200);
    expect(file.headers()['content-type']).toContain('image/png');

    await admin.from('media').update({ shared: false }).eq('id', mediaId);
    expect((await request.get(`/m/${mediaId}`, { maxRedirects: 0 })).status()).toBe(404);

    await admin.from('media').update({ shared: true }).eq('id', mediaId);
    await admin.from('projects').update({ visibility: 'private' }).eq('id', projectId);
    expect((await request.get(`/m/${mediaId}`, { maxRedirects: 0 })).status()).toBe(404);

    expect((await request.get('/m/not-a-uuid', { maxRedirects: 0 })).status()).toBe(404);
  });
});
