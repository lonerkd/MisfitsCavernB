import { chromium } from '@playwright/test';
import { test, expect, stackEnabled, stackSkipReason, type QaUser } from './support/stack';

// Start a budget from a template (Studio › Production › Money): an empty budget offers Micro, Low, Indie and Studio; choosing Indie
// writes its lines (budget_items), the budget groups under Above the line and Below the line with subtotals, and a line can be moved
// across the line (persisted). Opt-in: E2E_LOCAL_STACK=1 (see e2e/support/stack.ts).
test.describe('Budget templates in Studio › Money (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let me: QaUser;
  let projectId = '';

  test.beforeAll(async ({ stack }) => {
    me = await stack.createUser({ label: 'budgettpl' });
    projectId = (await stack.createProject(me, { title: `Template ${stack.tag}`, status: 'pre-production' })).id;
  });

  test('start from Indie, see the grouped lines and totals, move a line across the line', async ({ stack }) => {
    const admin = stack.admin;
    test.setTimeout(120_000);
    const browser = await chromium.launch({ executablePath: process.env.MC_LOCAL_CHROMIUM });
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const page = await ctx.newPage();
    try {
      await stack.signIn(page, me);
      await page.goto(`/studio?project=${projectId}&tab=production&view=money`);
      const group = page.getByRole('group', { name: 'Start from a template' });
      await group.waitFor({ timeout: 30_000 });
      for (const n of ['Micro', 'Low', 'Indie', 'Studio']) await expect(group.getByRole('button', { name: new RegExp(`^Start from ${n},`) })).toBeVisible();

      await group.getByRole('button', { name: /^Start from Indie,/ }).click();
      await expect(page.getByText(/Started the budget from Indie/)).toBeVisible({ timeout: 15_000 });

      const rows = (await admin.from('budget_items').select('id, category, amount, above_the_line').eq('project_id', projectId)).data!;
      expect(rows.length).toBeGreaterThanOrEqual(12);
      const above = rows.filter((r) => r.above_the_line);
      const below = rows.filter((r) => !r.above_the_line);
      expect(above.length).toBeGreaterThan(0);
      expect(below.length).toBeGreaterThan(0);
      const sum = (rs: typeof rows) => rs.reduce((n, r) => n + Number(r.amount), 0);
      const usd = (n: number) => '$' + n.toLocaleString('en-US');

      // The budget is grouped, with a subtotal per group, and the templates are gone (there are lines now).
      await expect(page.getByRole('rowgroup', { name: 'Above the line' })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole('rowgroup', { name: 'Below the line' })).toBeVisible();
      await expect(page.getByRole('row', { name: new RegExp(`Above the line subtotal ${usd(sum(above)).replace('$', '\\$')}`) })).toBeVisible();
      await expect(page.getByRole('row', { name: new RegExp(`Below the line subtotal ${usd(sum(below)).replace('$', '\\$')}`) })).toBeVisible();
      await expect(group).toHaveCount(0);

      // Move one below-the-line line above it: the toggle persists and the subtotals follow.
      const moved = below[0];
      await page.getByRole('checkbox', { name: `${moved.category} is above the line` }).click();
      await expect.poll(async () => (await admin.from('budget_items').select('above_the_line').eq('id', moved.id).single()).data?.above_the_line).toBe(true);
      await expect(page.getByRole('row', { name: new RegExp(`Above the line subtotal ${usd(sum(above) + Number(moved.amount)).replace('$', '\\$')}`) })).toBeVisible({ timeout: 15_000 });

      await page.reload();
      await expect(page.getByRole('checkbox', { name: `${moved.category} is above the line` })).toBeChecked({ timeout: 30_000 });
    } finally { await ctx.close(); await browser.close(); }
  });
});
