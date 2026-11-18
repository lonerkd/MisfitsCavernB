import { randomUUID } from 'node:crypto';
import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';
import type { SupabaseClient } from '@supabase/supabase-js';

// Leaving the suite from Settings: a project other people work on has to be
// handed over first; then, with the username typed, the account and its own
// projects go, and the handed-over project stays with its new owner.
// Opt-in: E2E_LOCAL_STACK=1.
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

test.describe('Delete account (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let admin: SupabaseClient;
  const leaver = { id: '', email: `leaver.${TAG}@journey.test`, username: `leaver${TAG}` };
  const crew = { id: '', email: `keeper.${TAG}@journey.test`, username: `keeper${TAG}` };
  let sharedId = '';
  let soloId = '';

  test.beforeAll(async ({ stack }) => {
    admin = stack.admin;
    for (const p of [leaver, crew]) {
      p.id = (await stack.createUser({ email: p.email, password: PASSWORD, username: p.username })).id;
    }
    sharedId = (await admin.from('projects').insert({ title: `Harbour ${TAG}`, creator_id: leaver.id }).select('id').single()).data!.id;
    soloId = (await admin.from('projects').insert({ title: `Notebook ${TAG}`, creator_id: leaver.id }).select('id').single()).data!.id;
    await admin.from('project_crew').insert({ project_id: sharedId, user_id: crew.id, craft: 'Editor', status: 'confirmed' });
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('projects').delete().in('id', [sharedId, soloId]);
    for (const p of [leaver, crew]) if (p.id) await admin.auth.admin.deleteUser(p.id);
  });

  test('hand over, then delete for good', async ({ page }) => {
    test.setTimeout(120_000);
    await signInAs(page, { email: leaver.email, password: PASSWORD });

    await page.goto('/settings');
    await page.getByRole('button', { name: 'DELETE ACCOUNT…' }).click();
    await expect(page.getByText('First, hand these over')).toBeVisible({ timeout: 15_000 });
    const remove = page.getByRole('button', { name: 'DELETE MY ACCOUNT' });
    await expect(remove).toBeDisabled();

    await page.getByRole('button', { name: 'HAND OVER' }).click();
    await page.getByRole('button', { name: 'Hand over', exact: true }).click();
    await expect(page.getByText('First, hand these over')).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText(`Notebook ${TAG}`)).toBeVisible();

    await page.getByLabel(/Type your username/).fill(leaver.username);
    await remove.click();
    await page.getByRole('button', { name: 'Delete for good' }).click();
    await page.waitForURL((u) => u.pathname === '/', { timeout: 30_000 });

    expect((await admin.auth.admin.getUserById(leaver.id)).data.user).toBeNull();
    expect((await admin.from('projects').select('id').eq('id', soloId)).data).toEqual([]);
    expect((await admin.from('projects').select('creator_id').eq('id', sharedId).single()).data).toEqual({ creator_id: crew.id });
  });
});
