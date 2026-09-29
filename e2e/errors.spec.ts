import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The suite hears about errors people hit: an uncaught error in the browser
// lands in the log, once, and an admin sees it in Admin › Errors and clears it.
// Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

test.describe('Error log (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const owner = { id: '', email: `errors.${TAG}@journey.test` };

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    owner.id = (await admin.auth.admin.createUser({ email: owner.email, password: PASSWORD, email_confirm: true, user_metadata: { username: `errs${TAG}` } })).data.user!.id;
    await admin.from('profiles').update({ is_admin: true }).eq('id', owner.id);
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('client_errors').delete().like('message', `%${TAG}%`);
    await admin.auth.admin.deleteUser(owner.id);
  });

  test('an uncaught error is logged once and shown to admins', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/auth');
    await page.fill('input[name="email"]', owner.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });

    await page.goto('/today?from=a-link');
    await page.waitForTimeout(1500); // the reporter mounts with the shell
    // The same error twice: logged once per visit.
    await page.evaluate((tag) => {
      setTimeout(() => { throw new Error(`Harbour lights failed ${tag}`); });
      setTimeout(() => { throw new Error(`Harbour lights failed ${tag}`); }, 50);
    }, TAG);

    await expect.poll(async () => (await admin.from('client_errors').select('kind, path, user_id').like('message', `%${TAG}%`)).data, { timeout: 20_000 })
      .toEqual([{ kind: 'window', path: '/today', user_id: owner.id }]);

    await page.goto('/admin/errors');
    const row = page.getByRole('listitem').filter({ hasText: `Harbour lights failed ${TAG}` });
    await expect(row).toBeVisible({ timeout: 30_000 });
    await row.getByRole('button', { name: /^Clear:/ }).click();
    await page.getByRole('button', { name: 'Clear', exact: true }).click();
    await expect(row).toBeHidden({ timeout: 15_000 });
    expect((await admin.from('client_errors').select('id').like('message', `%${TAG}%`)).data).toEqual([]);
  });
});
