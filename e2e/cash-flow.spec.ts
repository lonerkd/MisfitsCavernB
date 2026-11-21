import { chromium, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { test, expect, stackEnabled, stackSkipReason, type QaUser } from './support/stack';

// Cash flow and the over-budget alert (Studio › Production › Money): money out by week with a running total against the plan, the week it
// first goes over marked; and the in-app notification the owner gets when spend crosses the plan. Opt-in: E2E_LOCAL_STACK=1.
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

async function axeViolations(page: Page): Promise<string[]> {
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async () => {
    const r = await (window as any).axe.run(document.querySelector('[aria-label="Cash flow"]'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] });
    return r.violations.map((v: any) => `${v.id}: ${v.nodes.slice(0, 3).map((n: any) => `${n.target.join(' ')} ${n.html.slice(0, 140)} ${n.any?.[0]?.message ?? ''}`).join(' | ')}`);
  });
}

test.describe('Cash flow and the over-budget alert (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let me: QaUser;
  let projectId = '';

  test.beforeAll(async ({ stack }) => {
    me = await stack.createUser({ label: 'cashflow' });
    projectId = (await stack.createProject(me, { title: `Cash ${stack.tag}`, status: 'pre-production' })).id;
    const admin = stack.admin;
    const line = (await admin.from('budget_items').insert({ project_id: projectId, category: 'Camera', amount: 1000, created_by: me.id }).select('id').single()).data!.id;
    const deposit = (await admin.from('expenses').insert({ project_id: projectId, budget_item_id: line, description: 'Deposit', amount: 300, status: 'paid', spent_on: '2026-11-02' }).select('id').single()).data!.id;
    // The database stamps paid_at with the moment it was paid; back-date it so the table has an earlier week to show.
    await admin.from('expenses').update({ paid_at: '2026-11-02T12:00:00Z' }).eq('id', deposit);
    await admin.from('expenses').insert([
      { project_id: projectId, budget_item_id: line, description: 'Lens PO', amount: 500, status: 'committed', spent_on: '2026-11-09' },
    ]);
  });

  test('the table shows each week and the running total, then crossing the plan marks that week and notifies the owner', async ({ stack }) => {
    test.setTimeout(150_000);
    const admin = stack.admin;
    const browser = await chromium.launch({ executablePath: process.env.MC_LOCAL_CHROMIUM });
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const page = await ctx.newPage();
    try {
      await stack.signIn(page, me);
      await page.goto(`/studio?project=${projectId}&tab=production&view=money`);
      const flow = page.getByRole('region', { name: 'Cash flow' });
      await expect(flow.getByRole('row', { name: /^Nov 2 – Nov 8/ })).toContainText('$300', { timeout: 30_000 });
      await expect(flow.getByRole('row', { name: /^Nov 9 – Nov 15/ })).toContainText('$800');
      await expect(flow.getByRole('row', { name: /Planned, not yet scheduled/ })).toContainText('$200');
      await expect(flow.getByText('Over budget from here')).toHaveCount(0);
      expect((await admin.from('notifications').select('id').eq('user_id', me.id).eq('type', 'budget')).data).toEqual([]);

      // Add a $400 purchase order dated 16 Nov: the running total reaches $1,200 against $1,000.
      const spend = page.getByRole('region', { name: /Spend/ });
      await spend.getByLabel('What for').fill('Grip truck');
      await spend.getByLabel('Amount ($)').fill('400');
      await spend.getByLabel('Date').fill('2026-11-16');
      await spend.getByRole('button', { name: 'Add spend' }).click();
      await expect(spend.getByText('Grip truck')).toBeVisible();

      const crossing = flow.getByRole('row', { name: /^Nov 16 – Nov 22/ });
      await expect(crossing).toContainText('Over budget from here', { timeout: 15_000 });
      await expect(crossing).toContainText('$1,200');
      await expect(flow.getByRole('row', { name: /Planned, not yet scheduled/ })).toHaveCount(0);
      await expect(page.getByText(/Spend is \$200 over the plan, from the week of Nov 16/)).toBeVisible();
      await page.screenshot({ path: '/tmp/pw-out/cash-flow-desktop.png', fullPage: true });
      expect(await axeViolations(page)).toEqual([]);

      // Told once, in app, with a link to this tool.
      const told = (await admin.from('notifications').select('title, body, link').eq('user_id', me.id).eq('type', 'budget')).data!;
      expect(told).toHaveLength(1);
      expect(told[0].link).toBe(`/studio?project=${projectId}&tab=production&view=money`);
      await page.goto(`/studio?project=${projectId}&tab=production&view=money`, { waitUntil: 'domcontentloaded' });
      await page.locator('[data-taskbar]').hover();
      await page.getByRole('button', { name: /^Notifications/ }).first().click({ timeout: 15_000 });
      await expect(page.getByText(/^Over budget: Cash /)).toBeVisible({ timeout: 20_000 });

      // The phone: the table scrolls inside its own box, the page itself does not.
      await page.setViewportSize({ width: 390, height: 844 });
      await page.keyboard.press('Escape');
      await page.goto(`/studio?project=${projectId}&tab=production&view=money`);
      await expect(page.getByRole('region', { name: 'Cash flow' }).getByText('Over budget from here')).toBeVisible({ timeout: 30_000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      await page.getByRole('region', { name: 'Cash flow' }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: '/tmp/pw-out/cash-flow-phone.png' });
    } finally { await ctx.close(); await browser.close(); }
  });
});
