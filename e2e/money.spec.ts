import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Money in a real browser against a local stack: a purchase order against a
// budget line with a new vendor, paid (the line's actual follows), and a crew
// member's hours approved at a rate. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

async function axeViolations(page: Page): Promise<string[]> {
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
    .map((a) => a.finished.catch(() => undefined))));
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async () => {
    const r = await (window as any).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] });
    return r.violations.map((v: any) => `${v.id}: ${v.nodes.slice(0, 3).map((n: any) => `${n.target.join(' ')} ${n.html.slice(0, 140)} ${n.any?.[0]?.message ?? ''}`).join(' | ')}`);
  });
}

test.describe('Money (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const owner = { id: '', email: `money-owner.${TAG}@journey.test` };
  const crew = { id: '', email: `money-crew.${TAG}@journey.test` };
  let projectId: string;
  let lineId: string;

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    for (const [who, name] of [[owner, `mowner${TAG}`], [crew, `mcrew${TAG}`]] as const) {
      who.id = (await admin.auth.admin.createUser({ email: who.email, password: PASSWORD, email_confirm: true, user_metadata: { username: name } })).data.user!.id;
    }
    projectId = (await admin.from('projects').insert({ title: `Ledger ${TAG}`, creator_id: owner.id, status: 'pre-production' }).select('id').single()).data!.id;
    await admin.from('project_crew').insert({ project_id: projectId, user_id: crew.id, craft: 'Gaffer', status: 'confirmed' });
    lineId = (await admin.from('budget_items').insert({ project_id: projectId, category: 'Camera', amount: 1000, created_by: owner.id }).select('id').single()).data!.id;
    await admin.from('timesheets').insert({ project_id: projectId, user_id: crew.id, work_date: '2026-11-03', hours: 10 });
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('projects').delete().eq('id', projectId);
    for (const who of [owner, crew]) await admin.auth.admin.deleteUser(who.id);
  });

  test('a purchase order → paid → the budget line follows; hours approved at a rate', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/auth');
    await page.fill('input[name="email"]', owner.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });

    await page.goto('/studio?tab=production&view=money');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);

    const spend = page.getByRole('region', { name: /Spend/ });
    await expect(page.getByRole('cell', { name: 'Camera' })).toBeVisible({ timeout: 20_000 });
    await spend.getByLabel('What for').fill('Lens package');
    await spend.getByLabel('Amount ($)').fill('400');
    await spend.getByLabel('Budget line').selectOption({ label: 'Camera' });
    await spend.getByLabel('Vendor').selectOption('__new');
    await spend.getByLabel('New vendor name').fill('Lens House');
    await spend.getByLabel('PO number').fill('PO-001');
    await spend.getByRole('button', { name: 'Add spend' }).click();
    await expect(spend.getByText('Lens package')).toBeVisible();
    expect((await admin.from('vendors').select('name').eq('project_id', projectId)).data).toEqual([{ name: 'Lens House' }]);

    await spend.getByRole('button', { name: 'Mark paid' }).click();
    await expect.poll(async () => Number((await admin.from('budget_items').select('actual_cost').eq('id', lineId).single()).data?.actual_cost)).toBe(400);
    await expect(page.getByRole('row', { name: /Camera/ })).toContainText('$600');

    // The crew member's hours: approve at $25/h.
    const hours = page.getByRole('region', { name: /Timesheets/ });
    await hours.getByLabel(/Hourly rate for/).fill('25');
    await hours.getByRole('button', { name: 'Approve' }).click();
    await expect(hours.getByText('Approved · $25/h = $250')).toBeVisible();
    expect((await admin.from('timesheets').select('status, rate, decided_by').eq('project_id', projectId).single()).data)
      .toEqual({ status: 'approved', rate: 25, decided_by: owner.id });
    expect(await axeViolations(page)).toEqual([]);
    await page.screenshot({ path: 'test-results/money.png', fullPage: true });
  });
});
