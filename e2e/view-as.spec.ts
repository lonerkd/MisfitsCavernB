import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// "View as": the owner previews their project as crew and as an outsider. The
// interface changes (owner controls go, an outsider sees nothing); the database
// is untouched, and "Back to me" restores the real view. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

test.describe.serial('View as (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const me = { id: '', email: `va.${TAG}@journey.test` };
  let projectId = '';

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    me.id = (await admin.auth.admin.createUser({ email: me.email, password: PASSWORD, email_confirm: true, user_metadata: { username: `va${TAG}` } })).data.user!.id;
    projectId = (await admin.from('projects').insert({ title: `Preview ${TAG}`, creator_id: me.id, description: 'A logline.' }).select('id').single()).data!.id;
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('projects').delete().eq('id', projectId);
    if (me.id) await admin.auth.admin.deleteUser(me.id);
  });

  test('crew see no owner controls, an outsider sees nothing, and Back to me restores the real view', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/auth');
    await page.fill('input[name="email"]', me.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });

    await page.goto(`/projects/${projectId}`);
    const logline = page.getByPlaceholder(/The logline/);
    await expect(logline).toBeVisible({ timeout: 30_000 }); // the owner edits the logline
    const group = page.getByRole('group', { name: 'View this project as' });

    await group.getByRole('button', { name: 'Crew' }).click();
    await expect(page.getByRole('status')).toContainText('Previewing as crew');
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
