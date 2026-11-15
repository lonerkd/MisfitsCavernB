import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// A role's written workflow, in a real browser against a local stack: a gaffer and an accountant each see their own steps in order, with the
// tools they can open as buttons and no tool they cannot (the gaffer is not offered Money). Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

async function axeViolations(page: Page): Promise<string[]> {
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => undefined))));
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async () => {
    const r = await (window as any).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] });
    return r.violations.map((v: any) => `${v.id}: ${v.nodes.slice(0, 3).map((n: any) => `${n.target.join(' ')} ${n.html.slice(0, 140)}`).join(' | ')}`);
  });
}


test.describe('Your workflow (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const people = { owner: { id: '', email: `yw-owner.${TAG}@journey.test` }, gaffer: { id: '', email: `yw-gaf.${TAG}@journey.test` }, acct: { id: '', email: `yw-acc.${TAG}@journey.test` } };
  let projectId = '';

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    for (const [k, who] of Object.entries(people)) {
      who.id = (await admin.auth.admin.createUser({ email: who.email, password: PASSWORD, email_confirm: true, user_metadata: { username: `yw${k}${TAG}` } })).data.user!.id;
    }
    projectId = (await admin.from('projects').insert({ title: `Workflow ${TAG}`, creator_id: people.owner.id, status: 'production' }).select('id').single()).data!.id;
    await admin.from('project_crew').insert([
      { project_id: projectId, user_id: people.gaffer.id, role: 'contributor', craft: 'Gaffer', status: 'confirmed' },
      { project_id: projectId, user_id: people.acct.id, role: 'contributor', craft: 'Production accountant', status: 'confirmed' },
    ]);
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('projects').delete().eq('id', projectId);
    for (const who of Object.values(people)) if (who.id) await admin.auth.admin.deleteUser(who.id);
  });

  const signIn = async (page: Page, who: { email: string }) => {
    await page.goto('/auth');
    await page.fill('input[name="email"]', who.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
  };
  const open = async (page: Page) => {
    await page.goto('/studio?tab=production');
    const picker = page.getByLabel('Active project');
    await picker.waitFor({ timeout: 30_000 });
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
  };

  test('a gaffer sees their steps in order with their own tools, and is not offered Money', async ({ page }) => {
    test.setTimeout(150_000);
    await signIn(page, people.gaffer);
    await open(page);
    const summary = page.getByText('Your workflow as Gaffer');
    await expect(summary).toBeVisible({ timeout: 30_000 });
    await summary.click();
    for (const stage of ['Prep', 'The day before', 'On the day', 'After the shoot']) await expect(page.getByRole('region', { name: stage })).toBeVisible();
    await expect(page.getByText('Plan the safe way to do each setup.')).toBeVisible();
    await expect(page.locator('p', { hasText: 'You receive:' })).toContainText('shot list and the plan');
    await expect(page.getByRole('button', { name: /Open Safety$/ }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Open Money$/ })).toHaveCount(0);
    await page.getByRole('button', { name: /Return the gear and report damage\. Open Gear/ }).click();
    await expect(page.getByRole('tab', { name: /Gear/ }).first()).toHaveAttribute('aria-selected', 'true');
    expect(await axeViolations(page)).toEqual([]);
  });

  test('an accountant sees their own workflow, and Money as a tool they can open', async ({ page }) => {
    test.setTimeout(150_000);
    await signIn(page, people.acct);
    await open(page);
    const summary = page.getByText('Your workflow as Production accountant');
    await expect(summary).toBeVisible({ timeout: 30_000 });
    await summary.click();
    await expect(page.getByText('Pay, reconcile and report: actuals against budget.')).toBeVisible();
    await expect(page.getByRole('button', { name: /Open Money$/ }).first()).toBeVisible();
  });
});
