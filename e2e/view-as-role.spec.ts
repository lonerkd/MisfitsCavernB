import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Role model, step 6 in a real browser against a local stack: the owner previews the project as a specific role (a craft at an
// access level) and every screen that follows a person's capabilities shows what that role sees: its own suite of tools first,
// the screens it may and may not open, and what its job still lacks. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

test.describe('View as a role (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const owner = { id: '', email: `viewasr.${TAG}@journey.test` };
  let projectId = '';

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    owner.id = (await admin.auth.admin.createUser({ email: owner.email, password: PASSWORD, email_confirm: true, user_metadata: { username: `viewasr${TAG}` } })).data.user!.id;
    projectId = (await admin.from('projects').insert({ title: `Preview ${TAG}`, creator_id: owner.id, status: 'pre-production' }).select('id').single()).data!.id;
    await admin.from('budget_items').insert({ project_id: projectId, category: `Camera ${TAG}`, amount: 1000 });
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('budget_items').delete().eq('project_id', projectId);
    await admin.from('projects').delete().eq('id', projectId);
    if (owner.id) await admin.auth.admin.deleteUser(owner.id);
  });

  test('preview as an accountant, a casting director and a gaffer', async ({ page }) => {
    test.setTimeout(150_000);
    await page.goto('/auth');
    await page.fill('input[name="email"]', owner.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });

    // Choose the role on the project page, where the switch lives.
    await page.goto(`/projects/${projectId}`);
    const group = page.getByRole('group', { name: 'View this project as' });
    await group.waitFor({ timeout: 30_000 });
    await group.getByRole('button', { name: 'Crew' }).click();
    const pickRole = async (search: string, name: string) => {
      await group.getByRole('button', { name: /^Preview as craft/ }).click();
      await page.getByPlaceholder(/Search — e\.g\./).fill(search);
      await page.getByRole('button', { name, exact: true }).click();
    };
    const openMoney = async () => {
      await page.goto('/studio?tab=production&view=money');
      const picker = page.getByLabel('Active project');
      await picker.waitFor();
      if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
    };

    // An accountant: runs the budget, so the whole budget screen, and a suite of money tools first.
    await pickRole('production accountant', 'Production accountant');
    await expect(page.getByRole('status').filter({ hasText: 'Previewing as Production accountant' })).toContainText('run the budget');
    await openMoney();
    await expect(page.locator('#money-spend')).toBeVisible({ timeout: 30_000 });
    const mine = page.getByRole('group', { name: 'Your tools' });
    await expect(mine.getByRole('button')).toHaveText(['Money', 'Purchase orders', 'Paperwork', 'Insurance claims']);
    await expect(page.getByRole('note', { name: /still lacks/ })).toContainText('No invoices, cash-flow or Excel');

    // The suite is a lens, not a wall: every other tool is still there.
    await expect(page.getByRole('tab', { name: /Schedule/ })).toBeVisible();

    // A casting director: no budget, so the screen says so and offers the ask; their own suite has casting, not money.
    await page.goto(`/projects/${projectId}`);
    await group.getByRole('button', { name: /^Preview as craft/ }).waitFor();
    await pickRole('casting director', 'Casting director');
    await openMoney();
    await expect(page.getByText('The budget is held by the people who run the money')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(`Camera ${TAG}`)).toHaveCount(0);
    await expect(page.getByRole('group', { name: 'Your tools' }).getByRole('button', { name: 'Money' })).toHaveCount(0);
    await expect(page.getByRole('group', { name: 'Your tools' }).getByRole('button', { name: 'Cast & crew' })).toBeVisible();

    // A gaffer: sees the budget to read (their own spend), runs none of it; their suite is gear, schedule, safety, shots.
    await page.goto(`/projects/${projectId}`);
    await group.getByRole('button', { name: /^Preview as craft/ }).waitFor();
    await pickRole('gaffer', 'Gaffer');
    await openMoney();
    await expect(page.getByText(`Camera ${TAG}`).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('#money-spend')).toHaveCount(0);
    await expect(page.getByRole('group', { name: 'Your tools' }).getByRole('button')).toContainText(['Gear', 'Schedule', 'Safety', 'Shot list', 'Location scouts']);

    // Back to me: the real view has no preview banner and no role row (the owner has no craft on their own project).
    await page.getByRole('button', { name: 'Back to me' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Previewing as' })).toHaveCount(0);
    await expect(page.getByRole('group', { name: 'Your tools' })).toHaveCount(0);
    await expect(page.locator('#money-spend')).toBeVisible();
  });
});
