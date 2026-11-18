import { randomUUID } from 'node:crypto';
import { test, expect, stackEnabled, stackSkipReason } from './support/stack';
import type { SupabaseClient } from '@supabase/supabase-js';

// The outside roles' review link, in a real browser against a local stack: each audience sees what it may do, and the page for
// the press has no way to comment or decide. Opt-in: E2E_LOCAL_STACK=1.
const TAG = Date.now().toString(36);

test.describe('Review links by audience (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let admin: SupabaseClient;
  let ownerId = '';
  let projectId = '';
  const tokens: Record<string, string> = {};

  test.beforeAll(async ({ stack }) => {
    admin = stack.admin;
    ownerId = (await admin.auth.admin.createUser({ email: `ra-owner.${TAG}@journey.test`, password: randomUUID(), email_confirm: true, user_metadata: { username: `raowner${TAG}` } })).data.user!.id;
    projectId = (await admin.from('projects').insert({ title: `Pitch ${TAG}`, creator_id: ownerId }).select('id').single()).data!.id;
    const scriptId = (await admin.from('scripts').insert({ title: 'The pitch', content: 'INT. ROOM - DAY\n\nThe pitch.', project_id: projectId, created_by: ownerId, last_edited_by: ownerId }).select('id').single()).data!.id;
    const v = (await admin.from('item_versions').insert({ project_id: projectId, script_id: scriptId, label: 'Cut 1', created_by: ownerId }).select('id').single()).data!.id;
    await admin.from('item_versions').update({ status: 'sent' }).eq('id', v);
    for (const layer of ['guest', 'investor', 'distributor', 'press']) {
      tokens[layer] = (await admin.from('review_links').insert({ project_id: projectId, version_ids: [v], layer, label: `For ${layer}`, created_by: ownerId }).select('token').single()).data!.token;
    }
  });
  test.afterAll(async () => {
    await admin.from('projects').delete().eq('id', projectId);
    await admin.auth.admin.deleteUser(ownerId);
  });

  test('the client can approve, comment and name themselves', async ({ page }) => {
    await page.goto(`/review/${tokens.guest}`);
    await expect(page.getByRole('button', { name: 'Approve this version' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send comment' })).toBeVisible();
    await expect(page.getByLabel('Your name')).toBeVisible();
  });

  for (const layer of ['investor', 'distributor']) {
    test(`${layer}: can comment, cannot approve`, async ({ page }) => {
      await page.goto(`/review/${tokens[layer]}`);
      await expect(page.getByRole('button', { name: 'Send comment' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Approve this version' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Ask for changes' })).toHaveCount(0);
      await expect(page.getByText(/approval is the client/i)).toBeVisible();
    });
  }

  test('the press reads only: no name box, no comment, no decision', async ({ page }) => {
    await page.goto(`/review/${tokens.press}`);
    await expect(page.getByText('The pitch.')).toBeVisible();
    await expect(page.getByText(/reading only/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /approve|ask for changes|send comment/i })).toHaveCount(0);
    await expect(page.getByLabel('Your name')).toHaveCount(0);
  });
});
