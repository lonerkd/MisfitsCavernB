import { randomUUID } from 'node:crypto';
import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';
import type { SupabaseClient } from '@supabase/supabase-js';

// "View as": the owner previews their project as crew and as an outsider. The
// interface changes (owner controls go, an outsider sees nothing); the database
// is untouched, and "Back to me" restores the real view. Opt-in: E2E_LOCAL_STACK=1.
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

test.describe.serial('View as (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let admin: SupabaseClient;
  const me = { id: '', email: `va.${TAG}@journey.test` };
  let projectId = '';

  test.beforeAll(async ({ stack }) => {
    admin = stack.admin;
    me.id = (await stack.createUser({ email: me.email, password: PASSWORD, username: `va${TAG}` })).id;
    projectId = (await admin.from('projects').insert({ title: `Preview ${TAG}`, creator_id: me.id, description: 'A logline.' }).select('id').single()).data!.id;
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('projects').delete().eq('id', projectId);
  });

  test('crew see no owner controls, an outsider sees nothing, and Back to me restores the real view', async ({ page }) => {
    test.setTimeout(120_000);
    await signInAs(page, { email: me.email, password: PASSWORD });

    await page.goto(`/projects/${projectId}`);
    const logline = page.getByPlaceholder(/The logline/);
    await expect(logline).toBeVisible({ timeout: 30_000 }); // the owner edits the logline
    const group = page.getByRole('group', { name: 'View this project as' });

    await group.getByRole('button', { name: 'Crew' }).click();
    await expect(page.getByRole('status')).toContainText('Previewing as a crew member');
    await expect(logline).toHaveCount(0); // crew read it, they do not edit it
    await expect(page.getByText('A logline.')).toBeVisible();

    await group.getByRole('button', { name: 'Outsider' }).click();
    await expect(page.getByRole('heading', { name: 'This page doesn’t exist.' })).toBeVisible();
    await expect(page.getByText(`Preview ${TAG}`)).toHaveCount(0); // not even the title

    // The preview survives a reload (this tab), and the Studio follows it.
    await page.reload();
    await expect(page.getByRole('heading', { name: 'This page doesn’t exist.' })).toBeVisible();

    await page.getByRole('button', { name: 'Back to me' }).click();
    await expect(page.getByPlaceholder(/The logline/)).toBeVisible();

    // Nothing was written: the project is as it was.
    const row = (await admin.from('projects').select('title, description').eq('id', projectId).single()).data!;
    expect(row).toEqual({ title: `Preview ${TAG}`, description: 'A logline.' });
  });
});
