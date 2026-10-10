import { execSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Your own data, end to end: the profile page lists what you made and saves
// your edits, the crew directory finds you, and Settings › Export downloads a
// file with every section in it. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

test.describe('Your profile and data (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const me = { id: '', email: `owner.${TAG}@journey.test`, username: `owner${TAG}` };
  let projectId = '';

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    me.id = (await admin.auth.admin.createUser({ email: me.email, password: PASSWORD, email_confirm: true, user_metadata: { username: me.username } })).data.user!.id;
    projectId = (await admin.from('projects').insert({ title: `Lantern ${TAG}`, creator_id: me.id }).select('id').single()).data!.id;
    await admin.from('jobs').insert({ title: `Gaffer ${TAG}`, role: 'Gaffer', project_id: projectId, created_by: me.id, status: 'open' });
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('jobs').delete().eq('created_by', me.id);
    await admin.from('projects').delete().eq('id', projectId);
    if (me.id) await admin.auth.admin.deleteUser(me.id);
  });

  test('profile lists my work and saves; the directory finds me; export has every section', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/auth');
    await page.fill('input[name="email"]', me.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });

    // Profile: what I made is counted, and an edit saves.
    await page.goto('/profile');
    await page.getByText('Jobs Posted', { exact: false }).click();
    await expect(page.getByText(`Gaffer ${TAG}`)).toBeVisible({ timeout: 20_000 });
    await page.locator('textarea').fill(`Lights and lenses ${TAG}`);
    await page.getByRole('button', { name: /^SAVE$/ }).click();
    await expect(page.getByText('✓ SAVED')).toBeVisible();
    await expect.poll(async () => (await admin.from('profiles').select('bio').eq('id', me.id).single()).data?.bio).toBe(`Lights and lenses ${TAG}`);

    // The directory finds me; punctuation in the search is ignored, not an error.
    await page.goto('/crew');
    await page.getByLabel('Search crew').fill(`(${TAG}).`);
    await expect(page.getByText(me.username).first()).toBeVisible({ timeout: 20_000 });

    // Export: one file with the profile, the project and the job.
    await page.goto('/settings');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'EXPORT' }).click(),
    ]);
    const file = JSON.parse(await readFile((await download.path())!, 'utf8'));
    expect(file.account.id).toBe(me.id);
    expect(file.profile.username).toBe(me.username);
    expect(file.projects.map((p: { title: string }) => p.title)).toContain(`Lantern ${TAG}`);
    expect(file.jobs.map((j: { title: string }) => j.title)).toContain(`Gaffer ${TAG}`);
    expect(Array.isArray(file.scripts)).toBe(true);
  });
});
