import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Role model, step 3a, in a real browser against a local stack: the budget follows a person's craft. A crew member whose
// craft holds no budget is told so; one who can see it sees it without the spend and vendor controls; one who runs it
// has them. The owner is covered by the money spec. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

test.describe('The budget follows the role (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const owner = { id: '' };
  const crew = { id: '', email: `rolem.${TAG}@journey.test` };
  let projectId = '';

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    owner.id = (await admin.auth.admin.createUser({ email: `rolemo.${TAG}@journey.test`, password: PASSWORD, email_confirm: true, user_metadata: { username: `rolemo${TAG}` } })).data.user!.id;
    crew.id = (await admin.auth.admin.createUser({ email: crew.email, password: PASSWORD, email_confirm: true, user_metadata: { username: `rolemc${TAG}` } })).data.user!.id;
    projectId = (await admin.from('projects').insert({ title: `Budget ${TAG}`, creator_id: owner.id, status: 'pre-production' }).select('id').single()).data!.id;
    await admin.from('budget_items').insert({ project_id: projectId, category: `Camera ${TAG}`, amount: 1000 });
    await admin.from('project_crew').insert({ project_id: projectId, user_id: crew.id, role: 'contributor', craft: 'Casting director', status: 'confirmed' });
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('budget_items').delete().eq('project_id', projectId);
    await admin.from('project_crew').delete().eq('project_id', projectId);
    await admin.from('projects').delete().eq('id', projectId);
    for (const id of [owner.id, crew.id]) if (id) await admin.auth.admin.deleteUser(id);
  });

  const setCraft = (craft: string) => admin.from('project_crew').update({ craft }).eq('project_id', projectId).eq('user_id', crew.id);

  test('no budget, then the budget to read, then the budget to run', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/auth');
    await page.fill('input[name="email"]', crew.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });

    const open = async () => {
      await page.goto('/studio?tab=production&view=money');
      const picker = page.getByLabel('Active project');
      await picker.waitFor();
      if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
    };

    // A casting director's craft holds no budget: the screen says so (it does not pretend there is none).
    await open();
    await expect(page.getByText('The budget is held by the people who run the money')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(`Camera ${TAG}`)).toHaveCount(0);

    // A production designer sees the budget (their own spend) but does not run it.
    await setCraft('Production designer');
    await open();
    await expect(page.getByRole('region', { name: 'Budget vs spend' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(`Camera ${TAG}`).first()).toBeVisible();
    await expect(page.getByText('Spend and vendors are kept by the people who run it')).toBeVisible();
    await expect(page.locator('#money-spend')).toHaveCount(0);

    // An accountant runs it.
    await setCraft('Production accountant');
    await open();
    await expect(page.locator('#money-spend')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Spend and vendors are kept by the people who run it')).toHaveCount(0);
  });
});
