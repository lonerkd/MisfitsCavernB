import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { test, expect, stackEnabled, stackSkipReason, type QaUser } from './support/stack';

// The budget as an Excel-openable file (Studio › Production › Money › Excel): the file's grand total is the planned total on screen.
// Opt-in: E2E_LOCAL_STACK=1 (or the staging variables; see e2e/support/stack.ts).
test.describe('Budget Excel export (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let me: QaUser;
  let projectId = '';
  let title = '';

  test.beforeAll(async ({ stack }) => {
    me = await stack.createUser({ label: 'budgetxl' });
    title = `Budget XL ${stack.tag}`;
    projectId = (await stack.createProject(me, { title, status: 'pre-production' })).id;
  });

  test('the Excel file holds the lines and the same total as the screen', async ({ stack }) => {
    test.setTimeout(120_000);
    const browser = await chromium.launch({ executablePath: process.env.MC_LOCAL_CHROMIUM });
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, acceptDownloads: true });
    const page = await ctx.newPage();
    try {
      await stack.signIn(page, me);
      await page.goto(`/studio?project=${projectId}&tab=production&view=money`);
      await page.getByLabel('Category').waitFor({ timeout: 30_000 });

      const awkward = 'Camera <rental> & "lenses"';
      for (const [cat, amount] of [['Catering', '450'], [awkward, '300.50']]) {
        await page.getByLabel('Category').fill(cat);
        await page.getByLabel('Planned amount').fill(amount);
        await page.getByRole('button', { name: /Add line/ }).click();
        await expect(page.getByRole('cell', { name: cat })).toBeVisible({ timeout: 15_000 });
      }
      await expect(page.getByText('$750.50', { exact: true }).first()).toBeVisible();

      const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Excel: the budget' }).click()]);
      expect(download.suggestedFilename()).toBe(`budget-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}.xml`);
      const xml = readFileSync((await download.path())!, 'utf8');
      expect(xml).toContain('<Workbook');
      expect(xml).toContain('Camera &lt;rental&gt; &amp; &quot;lenses&quot;');

      // It parses (in the browser, which has an XML parser), and the grand total row carries the planned total the screen shows.
      const parsed = await page.evaluate((x) => {
        const doc = new DOMParser().parseFromString(x, 'application/xml');
        const rows = [...doc.getElementsByTagName('Row')].map((r) => [...r.getElementsByTagName('Data')].map((d) => d.textContent));
        return { errors: doc.getElementsByTagName('parsererror').length, rows };
      }, xml);
      expect(parsed.errors).toBe(0);
      const grand = parsed.rows.find((r) => r[0] === 'GRAND TOTAL');
      expect(Number(grand?.[1])).toBe(750.5);
      expect(parsed.rows.flat()).toContain(awkward);
    } finally { await ctx.close(); await browser.close(); }
  });
});
