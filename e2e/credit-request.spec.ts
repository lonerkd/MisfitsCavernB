import { randomUUID } from 'node:crypto';
import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';
import type { SupabaseClient } from '@supabase/supabase-js';

// A person left off a film's credits asks on its public page; the owner approves in the Studio and the person is on the crew with the
// craft they named. Opt-in: E2E_LOCAL_STACK=1.
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

test.describe('Asking to be credited (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);
  let admin: SupabaseClient;
  const owner = { id: '', email: `cr-owner.${TAG}@journey.test` };
  const asker = { id: '', email: `cr-asker.${TAG}@journey.test` };
  let projectId = '';
  const token = `cr${TAG}${randomUUID().replace(/-/g, '').slice(0, 12)}`;

  test.beforeAll(async ({ stack }) => {
    admin = stack.admin;
    owner.id = (await stack.createUser({ email: owner.email, password: PASSWORD, username: `crowner${TAG}` })).id;
    asker.id = (await stack.createUser({ email: asker.email, password: PASSWORD, username: `crasker${TAG}` })).id;
    projectId = (await admin.from('projects').insert({ title: `Credits ${TAG}`, creator_id: owner.id, status: 'production', visibility: 'link', share_token: token }).select('id').single()).data!.id;
  });
  test.afterAll(async () => { if (admin) await admin.from('projects').delete().eq('id', projectId); });

  test('the asker sends a request, the owner approves it, the asker is credited, with no access', async ({ page, browser }) => {
    test.setTimeout(120_000);
    await signInAs(page, { email: asker.email, password: PASSWORD });
    await page.goto(`/shared/${token}`);
    await page.getByRole('button', { name: /Missing from the credits/ }).click();
    await page.getByLabel('What did you do?').fill('Gaffer');
    await page.getByLabel('Note').fill('Rigged the night exteriors');
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.getByText('Asked: Gaffer. The owner has not answered yet.')).toBeVisible();
    expect((await admin.from('credit_requests').select('craft, status').eq('project_id', projectId)).data).toEqual([{ craft: 'Gaffer', status: 'pending' }]);

    const ctx = await browser.newContext();
    const ownerPage = await ctx.newPage();
    await signInAs(ownerPage, { email: owner.email, password: PASSWORD });
    await ownerPage.goto(`/studio?project=${projectId}&tab=production&view=crew`);
    const panel = ownerPage.getByRole('region', { name: 'Credit requests' });
    await expect(panel).toContainText('Gaffer');
    await panel.getByRole('button', { name: 'Approve' }).click();
    await expect(ownerPage.getByText(/Credited .* as Gaffer/)).toBeVisible();
    await expect.poll(async () => (await admin.from('credit_requests').select('status').eq('project_id', projectId)).data).toEqual([{ status: 'approved' }]);
    // A credit is not access: no crew row.
    expect((await admin.from('project_crew').select('user_id').eq('project_id', projectId).eq('user_id', asker.id)).data).toEqual([]);
    // The film's page now credits the asker.
    await page.goto(`/shared/${token}`);
    await expect(page.getByText('Gaffer').first()).toBeVisible();
    await ctx.close();
  });

  test('the owner does not see the ask button on their own page', async ({ page }) => {
    await signInAs(page, { email: owner.email, password: PASSWORD });
    await page.goto(`/shared/${token}`);
    await expect(page.getByRole('heading', { name: 'Cast & crew' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Missing from the credits/ })).toHaveCount(0);
  });
});
