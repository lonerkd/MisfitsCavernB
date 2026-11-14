import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Role model, step 1, in a real browser against a local stack: the owner recruits someone in
// Studio › Cast & crew by choosing their craft and what they can do (two choices, not one), the
// invitation is stored that way, and the owner can change the craft afterwards.
// Opt-in: E2E_LOCAL_STACK=1.
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

test.describe('Crew craft (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const owner = { id: '', email: `crewo.${TAG}@journey.test` };
  const guest = { id: '', name: `invitee${TAG}` };
  let projectId = '';

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    owner.id = (await admin.auth.admin.createUser({ email: owner.email, password: PASSWORD, email_confirm: true, user_metadata: { username: `crewo${TAG}` } })).data.user!.id;
    guest.id = (await admin.auth.admin.createUser({ email: `crewg.${TAG}@journey.test`, password: PASSWORD, email_confirm: true, user_metadata: { username: guest.name } })).data.user!.id;
    projectId = (await admin.from('projects').insert({ title: `Crew ${TAG}`, creator_id: owner.id, status: 'pre-production' }).select('id').single()).data!.id;
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('project_crew').delete().eq('project_id', projectId);
    await admin.from('projects').delete().eq('id', projectId);
    for (const id of [owner.id, guest.id]) if (id) await admin.auth.admin.deleteUser(id);
  });

  test('recruit with a craft and an access level, then change the craft', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/auth');
    await page.fill('input[name="email"]', owner.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });

    await page.goto('/studio?tab=production&view=crew');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);

    await page.getByRole('button', { name: /Recruit/ }).first().click();
    await page.getByPlaceholder('Search by username...').fill(guest.name);
    await page.getByPlaceholder('Search by username...').press('Enter');
    await page.getByText(guest.name, { exact: true }).click();

    // Two choices: what they do, and what they can do here.
    await page.getByRole('button', { name: /^Their craft/ }).click();
    await page.getByPlaceholder(/Search — e\.g\./).fill('gaffer');
    await page.getByRole('button', { name: 'Gaffer', exact: true }).click();
    await page.getByLabel('What they can do here').selectOption('viewer');
    await page.getByRole('button', { name: 'Send Invitation' }).click();

    // Stored as a tier and a craft, in their own columns (the old form wrote the craft into the tier, which the database refuses).
    await expect.poll(async () => (await admin.from('project_crew').select('role, craft, status').eq('project_id', projectId).eq('user_id', guest.id).maybeSingle()).data, { timeout: 30_000 })
      .toEqual({ role: 'viewer', craft: 'Gaffer', status: 'pending' });
    await expect(page.getByText('Gaffer', { exact: true }).first()).toBeVisible();

    // The owner changes what they do; the tier stays.
    await page.getByRole('button', { name: new RegExp(`^${guest.name}'s craft`) }).click();
    await page.getByPlaceholder(/Search — e\.g\./).fill('key grip');
    await page.getByRole('button', { name: 'Key grip', exact: true }).click();
    await expect.poll(async () => (await admin.from('project_crew').select('role, craft').eq('project_id', projectId).eq('user_id', guest.id).single()).data, { timeout: 30_000 })
      .toEqual({ role: 'viewer', craft: 'Key grip' });

    // A second craft: a person can hold several (a writer-director). The rights follow, and the tier is the ceiling.
    await page.getByRole('button', { name: /^Add another craft for/ }).click();
    await page.getByPlaceholder(/Search — e\.g\./).fill('accountant');
    await page.getByRole('button', { name: 'Production accountant', exact: true }).click();
    await expect.poll(async () => (await admin.from('project_crew_crafts').select('craft').eq('project_id', projectId).eq('user_id', guest.id)).data, { timeout: 30_000 })
      .toEqual([{ craft: 'Production accountant' }]);
    await page.getByText(`What ${guest.name} can do`).click();
    // Key grip and the accountant both let them see the budget; editing it is the accountant's, but they are view-only.
    await expect(page.getByLabel('See the budget')).toBeChecked();
    await expect(page.getByLabel('Edit the budget')).toBeDisabled();
    await expect(page.getByLabel('Edit the budget')).not.toBeChecked();
    await expect(page.getByText('view-only access cannot edit').first()).toBeVisible();

    // The owner takes one away, and giving it back clears the override (it is what the crafts give again).
    await page.getByLabel('See the budget').click(); // it flips when the change is saved, so click and then wait
    await expect.poll(async () => (await admin.from('crew_capability_overrides').select('capability, granted').eq('project_id', projectId).eq('user_id', guest.id)).data, { timeout: 30_000 })
      .toEqual([{ capability: 'budget.read', granted: false }]);
    await expect(page.getByLabel('See the budget')).not.toBeChecked();
    await page.getByLabel('See the budget').click();
    await expect(page.getByLabel('See the budget')).toBeChecked();
    await expect.poll(async () => (await admin.from('crew_capability_overrides').select('capability').eq('project_id', projectId).eq('user_id', guest.id)).data, { timeout: 30_000 }).toEqual([]);
    expect(await axeViolations(page)).toEqual([]);
  });
});
