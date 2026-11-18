import { randomUUID } from 'node:crypto';
import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';
import type { SupabaseClient } from '@supabase/supabase-js';

// The suite hears about errors people hit: an uncaught error in the browser
// lands in the log, once, and an admin sees it in Admin › Errors and clears it.
// Opt-in: E2E_LOCAL_STACK=1.
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

test.describe('Error log (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let admin: SupabaseClient;
  const owner = { id: '', email: `errors.${TAG}@journey.test` };

  test.beforeAll(async ({ stack }) => {
    admin = stack.admin;
    owner.id = (await stack.createUser({ email: owner.email, password: PASSWORD, username: `errs${TAG}` })).id;
    await admin.from('profiles').update({ is_admin: true }).eq('id', owner.id);
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('client_errors').delete().like('message', `%${TAG}%`);
  });

  test('an uncaught error is logged once and shown to admins', async ({ page }) => {
    test.setTimeout(120_000);
    await signInAs(page, { email: owner.email, password: PASSWORD });

    await page.goto('/community?from=a-link');
    await page.waitForTimeout(1500); // the reporter mounts with the shell
    // The same error twice: logged once per visit.
    await page.evaluate((tag) => {
      setTimeout(() => { throw new Error(`Harbour lights failed ${tag}`); });
      setTimeout(() => { throw new Error(`Harbour lights failed ${tag}`); }, 50);
    }, TAG);

    await expect.poll(async () => (await admin.from('client_errors').select('kind, path, user_id').like('message', `%${TAG}%`)).data, { timeout: 20_000 })
      .toEqual([{ kind: 'window', path: '/community', user_id: owner.id }]);

    await page.goto('/admin/errors');
    const row = page.getByRole('listitem').filter({ hasText: `Harbour lights failed ${TAG}` });
    await expect(row).toBeVisible({ timeout: 30_000 });
    await row.getByRole('button', { name: /^Clear:/ }).click();
    await page.getByRole('button', { name: 'Clear', exact: true }).click();
    await expect(row).toBeHidden({ timeout: 15_000 });
    expect((await admin.from('client_errors').select('id').like('message', `%${TAG}%`)).data).toEqual([]);
  });
});
