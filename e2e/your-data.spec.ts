import { readFile } from 'node:fs/promises';
import { test, expect, stackEnabled, stackSkipReason, type QaUser } from './support/stack';

// Your own data, end to end: the profile page lists what you made and saves
// your edits, the crew directory finds you, and Settings › Export downloads a
// file with every section in it. Opt-in: E2E_LOCAL_STACK=1 (or the staging
// variables; see e2e/support/stack.ts).

test.describe('Your profile and data (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let me: QaUser;
  let TAG = '';
  let projectId = '';

  test.beforeAll(async ({ stack }) => {
    TAG = stack.tag;
    // Not flagged as sample: this spec checks that the crew directory finds the account.
    me = await stack.createUser({ label: 'owner', sample: false });
    projectId = (await stack.createProject(me, { title: `Lantern ${TAG}` })).id;
    await stack.insert('jobs', { title: `Gaffer ${TAG}`, role: 'Gaffer', project_id: projectId, created_by: me.id, status: 'open' });
  });

  test('profile lists my work and saves; the directory finds me; export has every section', async ({ page, stack }) => {
    const admin = stack.admin;
    test.setTimeout(120_000);
    await stack.signIn(page, me);

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
    await page.getByLabel('Search crew').fill(`(${me.username}).`);
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
