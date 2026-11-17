import { chromium } from '@playwright/test';
import { test, expect, stackEnabled, stackSkipReason, type QaUser } from './support/stack';

// The one budget (Studio › Production › Money): the lines are made and kept there, the project page carries none.
// A line is added with its planned amount, posted once as a Jobs listing, and deleted after a confirm; the rows are
// real (budget_items, jobs). Opt-in: E2E_LOCAL_STACK=1 (or the staging variables; see e2e/support/stack.ts).
test.describe('Budget lines in Studio › Money (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let me: QaUser;
  let projectId = '';

  test.beforeAll(async ({ stack }) => {
    me = await stack.createUser({ label: 'budget' });
    projectId = (await stack.createProject(me, { title: `Budget ${stack.tag}`, status: 'pre-production' })).id;
  });

  test('add a line, post it as a job once, delete it after a confirm', async ({ stack }) => {
    const admin = stack.admin;
    test.setTimeout(120_000);
    const browser = await chromium.launch({ executablePath: process.env.MC_LOCAL_CHROMIUM });
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const page = await ctx.newPage();
    try {
      await stack.signIn(page, me);
      await page.goto(`/studio?project=${projectId}&tab=production&view=money`);
      await page.getByLabel('Category').waitFor({ timeout: 30_000 });

      await page.getByLabel('Category').fill('Catering');
      await page.getByLabel('Planned amount').fill('450');
      await page.getByRole('button', { name: /Add line/ }).click();
      await expect(page.getByRole('cell', { name: 'Catering' })).toBeVisible({ timeout: 15_000 });
      expect((await admin.from('budget_items').select('category, amount').eq('project_id', projectId)).data).toEqual([{ category: 'Catering', amount: 450 }]);

      await page.getByRole('button', { name: 'Post Catering as a job' }).click();
      await expect(page.getByRole('button', { name: 'Catering is already on the Jobs board' })).toBeDisabled({ timeout: 15_000 });
      const jobs = (await admin.from('jobs').select('title, budget_item_id').eq('project_id', projectId)).data!;
      expect(jobs).toHaveLength(1);
      expect(jobs[0].title).toBe('Catering');

      // The project page carries no budget form: it points here.
      await page.goto(`/projects/${projectId}`);
      await expect(page.getByRole('link', { name: 'Open the budget' })).toBeVisible({ timeout: 30_000 });
      await expect(page.getByPlaceholder('Category')).toHaveCount(0);

      await page.goto(`/studio?project=${projectId}&tab=production&view=money`);
      await page.getByRole('button', { name: 'Delete Catering' }).click();
      await page.getByRole('button', { name: 'CONFIRM' }).click();
      await expect.poll(async () => (await admin.from('budget_items').select('id').eq('project_id', projectId)).data?.length).toBe(0);
      await expect(page.getByRole('cell', { name: 'Catering' })).toHaveCount(0);
    } finally { await ctx.close(); await browser.close(); }
  });
});
