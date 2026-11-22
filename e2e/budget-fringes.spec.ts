import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { test, expect, stackEnabled, stackSkipReason, type QaUser } from './support/stack';

// Budget fringes and per diems (Studio › Production › Money): a line, two typed fringes (one capped) applied to it, and a per diem.
// The screen shows the fringed total, the database holds the same figure, and the Excel file's grand total is it too.
// Opt-in: E2E_LOCAL_STACK=1 (or the staging variables; see e2e/support/stack.ts).
test.describe('Budget fringes and per diems (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let me: QaUser;
  let projectId = '';
  let title = '';

  test.beforeAll(async ({ stack }) => {
    me = await stack.createUser({ label: 'fringes' });
    title = `Fringes ${stack.tag}`;
    projectId = (await stack.createProject(me, { title, status: 'pre-production' })).id;
  });

  test('a line, its fringes and a per diem: the screen, the database and the Excel file agree', async ({ stack }) => {
    test.setTimeout(150_000);
    const browser = await chromium.launch({ executablePath: process.env.MC_LOCAL_CHROMIUM });
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 1200 }, acceptDownloads: true });
    const page = await ctx.newPage();
    try {
      await stack.signIn(page, me);
      await page.goto(`/studio?project=${projectId}&tab=production&view=money`);
      await page.getByLabel('Category').waitFor({ timeout: 30_000 });

      // A project with no fringes shows the plain total.
      await page.getByLabel('Category').fill('Gaffer');
      await page.getByLabel('Planned amount').fill('1000');
      await page.getByRole('button', { name: /Add line/ }).click();
      await expect(page.getByRole('cell', { name: 'Gaffer' })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText('$1,000', { exact: true }).first()).toBeVisible();

      // Two fringes the producer types: 20% (no cap) and 10% capped at $50 a line.
      for (const [name, percent, cap] of [['Payroll tax', '20', ''], ['Pension', '10', '50']]) {
        await page.getByLabel('Fringe name').fill(name);
        await page.getByLabel('Fringe percent').fill(percent);
        if (cap) await page.getByLabel('Cap per line').fill(cap);
        await page.getByRole('button', { name: /Add fringe/ }).click();
        await expect(page.getByText(new RegExp(`${name} ${percent}%`)).first()).toBeVisible({ timeout: 15_000 });
      }
      await page.getByLabel('Apply Payroll tax to Gaffer').click();
      await expect(page.getByText('$1,200', { exact: true }).first()).toBeVisible({ timeout: 15_000 });
      await page.getByLabel('Apply Pension to Gaffer').click();
      // 20% of 1000 = 200, 10% = 100 capped at 50: the line is 1000 + 250 = 1,250.
      await expect(page.getByText('$1,250', { exact: true }).first()).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText('$1,000 + $250 fringe').first()).toBeVisible();

      // A per diem: 3 days x $50 x 2 people = $300 (its own amount, no fringe applied).
      await page.getByLabel('Per diem name').fill('Crew per diem');
      await page.getByLabel('Days').fill('3');
      await page.getByLabel('Daily rate').fill('50');
      await page.getByLabel('People').fill('2');
      await page.getByRole('button', { name: /Add per diem/ }).click();
      await expect(page.getByRole('cell', { name: 'Crew per diem' })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText('$1,550', { exact: true }).first()).toBeVisible({ timeout: 15_000 });

      const rows = (await stack.admin.from('budget_items').select('category, amount, fringe_amount, kind').eq('project_id', projectId).order('created_at')).data;
      expect(rows).toEqual([
        { category: 'Gaffer', amount: 1000, fringe_amount: 250, kind: 'line' },
        { category: 'Crew per diem', amount: 300, fringe_amount: 0, kind: 'per_diem' },
      ]);

      const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Excel: the budget' }).click()]);
      const xml = readFileSync((await download.path())!, 'utf8');
      const parsed = await page.evaluate((x) => {
        const doc = new DOMParser().parseFromString(x, 'application/xml');
        const all = [...doc.getElementsByTagName('Row')].map((r) => [...r.getElementsByTagName('Data')].map((d) => d.textContent));
        return { errors: doc.getElementsByTagName('parsererror').length, rows: all };
      }, xml);
      expect(parsed.errors).toBe(0);
      expect(parsed.rows.find((r) => r[0] === 'Account')).toContain('Fringe');
      const grand = parsed.rows.find((r) => r[0] === 'GRAND TOTAL');
      // GRAND TOTAL, base, fringe, planned.
      expect(Number(grand?.[1])).toBe(1300);
      expect(Number(grand?.[2])).toBe(250);
      expect(Number(grand?.[3])).toBe(1550);
    } finally { await ctx.close(); await browser.close(); }
  });
});
