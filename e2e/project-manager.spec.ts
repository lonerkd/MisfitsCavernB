import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, type Browser } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The project page's Production Management, as the owner and as crew: tasks,
// budget, milestones and crew are saved and survive a reload; festivals and
// settings are the owner's; adding an unknown username says so.
// Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

test.describe('Production Management (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const owner = { id: '', email: `pm-owner.${TAG}@journey.test`, username: `pmowner${TAG}` };
  const crew = { id: '', email: `pm-crew.${TAG}@journey.test`, username: `pmcrew${TAG}` };
  const newcomer = { id: '', email: `pm-new.${TAG}@journey.test`, username: `pmnew${TAG}` };
  let projectId = '';

  const signIn = async (browser: Browser, who: { email: string }) => {
    const page = await (await browser.newContext()).newPage();
    await page.goto('/auth');
    await page.fill('input[name="email"]', who.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
    return page;
  };

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    for (const p of [owner, crew, newcomer]) {
      p.id = (await admin.auth.admin.createUser({ email: p.email, password: PASSWORD, email_confirm: true, user_metadata: { username: p.username } })).data.user!.id;
    }
    projectId = (await admin.from('projects').insert({ title: `Ferry ${TAG}`, creator_id: owner.id }).select('id').single()).data!.id;
    await admin.from('project_crew').insert({ project_id: projectId, user_id: crew.id, craft: 'Editor', status: 'confirmed' });
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('projects').delete().eq('id', projectId);
    for (const p of [owner, crew, newcomer]) if (p.id) await admin.auth.admin.deleteUser(p.id);
  });

  test('owner and crew manage the production; it saves', async ({ browser }) => {
    test.setTimeout(150_000);
    const sam = await signIn(browser, owner);
    await sam.goto(`/projects/${projectId}`);
    await expect(sam.getByText('Production Management')).toBeVisible({ timeout: 30_000 });
    await expect(sam.getByText('⚠')).toHaveCount(0);

    // A task, ticked off.
    await sam.getByPlaceholder('Add a task…').fill(`Lock picture ${TAG}`);
    await sam.getByPlaceholder('Add a task…').press('Enter');
    await expect(sam.getByText(`Lock picture ${TAG}`)).toBeVisible();
    await expect.poll(async () => (await admin.from('project_tasks').select('title').eq('project_id', projectId)).data?.length).toBe(1);
    await sam.getByRole('button', { name: 'toggle', exact: true }).click();
    await expect.poll(async () => (await admin.from('project_tasks').select('completed').eq('project_id', projectId).single()).data?.completed).toBe(true);

    // A budget line and a milestone.
    await sam.getByPlaceholder('Category').fill('Catering');
    await sam.getByPlaceholder('Amount').fill('450');
    await sam.getByPlaceholder('Amount').press('Enter');
    await expect.poll(async () => (await admin.from('budget_items').select('category, amount').eq('project_id', projectId)).data).toEqual([{ category: 'Catering', amount: 450 }]);
    await sam.getByPlaceholder('Milestone').fill(`Picture lock ${TAG}`);
    await sam.getByPlaceholder('Milestone').press('Enter');
    await expect.poll(async () => (await admin.from('timeline_items').select('title').eq('project_id', projectId)).data?.map((r) => r.title)).toEqual([`Picture lock ${TAG}`]);

    // A festival, then its status.
    await sam.getByPlaceholder('Festival name').fill(`Tidewater Fest ${TAG}`);
    await sam.getByPlaceholder('Festival name').press('Enter');
    await sam.getByLabel(`Tidewater Fest ${TAG} submission status`).selectOption('submitted');
    await expect.poll(async () => (await admin.from('projects').select('festival_submissions').eq('id', projectId).single()).data?.festival_submissions)
      .toMatchObject([{ name: `Tidewater Fest ${TAG}`, status: 'submitted' }]);

    // Crew: an unknown name is refused; a real one joins.
    await sam.locator('#add-crew-username').fill(`nobody${TAG}`);
    await sam.getByRole('button', { name: 'ADD TO CREW' }).click();
    await expect(sam.getByText(`No user "nobody${TAG}"`)).toBeVisible();
    await sam.locator('#add-crew-username').fill(newcomer.username);
    await sam.getByRole('button', { name: 'ADD TO CREW' }).click();
    await expect.poll(async () => (await admin.from('project_crew').select('user_id').eq('project_id', projectId).eq('user_id', newcomer.id)).data?.length).toBe(1);

    // A module switched off.
    await sam.getByRole('switch', { name: 'toggle Lounge' }).click();
    await expect.poll(async () => ((await admin.from('projects').select('settings').eq('id', projectId).single()).data?.settings as { modules?: { lounge?: boolean } })?.modules?.lounge).toBe(false);

    // All of it is still there after a reload.
    await sam.reload();
    await expect(sam.getByText(`Lock picture ${TAG}`)).toBeVisible({ timeout: 30_000 });
    // The milestone shows in the overview's timeline as well as the manager.
    await expect(sam.getByText(`Picture lock ${TAG}`)).toHaveCount(2);
    await expect(sam.getByText(`Tidewater Fest ${TAG}`)).toBeVisible();
    await expect(sam.getByText(newcomer.username).filter({ visible: true }).first()).toBeVisible();

    // The pitch board: opening it makes one; opening it again reuses it.
    await sam.goto(`/projects/${projectId}/pitch`);
    await expect(sam.getByText(`Ferry ${TAG}`).first()).toBeVisible({ timeout: 30_000 });
    await expect.poll(async () => (await admin.from('portfolio_projects').select('id').eq('source_project_id', projectId)).data?.length).toBe(1);
    await sam.reload();
    await expect(sam.getByText(`Ferry ${TAG}`).first()).toBeVisible({ timeout: 30_000 });
    expect((await admin.from('portfolio_projects').select('id').eq('source_project_id', projectId)).data?.length).toBe(1);

    // Crew work the tasks, but festivals and settings are the owner's.
    const jo = await signIn(browser, crew);
    await jo.goto(`/projects/${projectId}`);
    await expect(jo.getByText('Production Management')).toBeVisible({ timeout: 30_000 });
    await expect(jo.getByText(`Lock picture ${TAG}`)).toBeVisible();
    await jo.getByPlaceholder('Add a task…').fill(`Conform ${TAG}`);
    await jo.getByPlaceholder('Add a task…').press('Enter');
    await expect.poll(async () => (await admin.from('project_tasks').select('title').eq('project_id', projectId)).data?.length).toBe(2);
    await expect(jo.getByPlaceholder('Festival name')).toHaveCount(0);
    await expect(jo.getByRole('switch', { name: 'toggle Lounge' })).toHaveCount(0);
    await expect(jo.getByText('⚠')).toHaveCount(0);
  });
});
