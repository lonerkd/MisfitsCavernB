import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Phases v2 against a local stack: the suite suggests the phase the data
// says the project has reached; tools inside the editor arrive with their
// phase (or all at once, by choice); a tool's first visit gets one line.
// Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

test.describe('Phases v2 (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  let userId: string;
  let email: string;
  let shootId: string;
  let draftId: string;
  let scriptId: string;

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    email = `phases.${TAG}@journey.test`;
    const { data } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { username: `ph${TAG}` } });
    userId = data.user!.id;
    // In pre-production, with a shoot day that has already come.
    shootId = (await admin.from('projects').insert({ title: `Shoot ${TAG}`, creator_id: userId, status: 'pre-production' }).select('id').single()).data!.id;
    await admin.from('call_sheets').insert({ project_id: shootId, shoot_day: 1, shoot_date: '2020-01-06' });
    // In development: a script being written.
    draftId = (await admin.from('projects').insert({ title: `Draft ${TAG}`, creator_id: userId, status: 'concept' }).select('id').single()).data!.id;
    scriptId = (await admin.from('scripts').insert({ title: 'Draft', content: 'INT. ROOM - DAY\n\nA page.\n', project_id: draftId, created_by: userId, last_edited_by: userId }).select('id').single()).data!.id;
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().in('project_id', [shootId, draftId]);
    await admin.from('projects').delete().in('id', [shootId, draftId]);
    await admin.auth.admin.deleteUser(userId);
  });

  const signIn = async (page: Page) => {
    await page.goto('/auth');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
  };

  test('suggests the phase the shoot has reached; "not yet" is remembered', async ({ page }) => {
    test.setTimeout(90_000);
    await signIn(page);
    await page.goto(`/projects/${shootId}`);
    const suggestion = page.getByRole('status').filter({ hasText: 'Looks like Production' });
    await expect(suggestion).toContainText('your first shoot day has passed', { timeout: 20_000 });
    await expect(suggestion.getByRole('button', { name: /Move to Production/ })).toBeVisible();
    await suggestion.getByRole('button', { name: 'Not yet' }).click();
    await expect(suggestion).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Pre-Production' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('status').filter({ hasText: 'Looks like Production' })).toHaveCount(0);
  });

  test('a tool’s first visit gets one line, once', async ({ page }) => {
    test.setTimeout(90_000);
    await signIn(page);
    await page.goto('/studio?tab=production&view=schedule');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== shootId) await picker.selectOption(shootId);
    const intro = page.getByRole('complementary', { name: 'New: Schedule & call sheets' });
    await expect(intro).toContainText('It arrived with Pre-Production.', { timeout: 20_000 });
    await intro.getByRole('button', { name: /Got it/ }).click();
    await expect(intro).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('tab', { name: /Schedule/ })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('complementary', { name: 'New: Schedule & call sheets' })).toHaveCount(0);
  });

  test('the editor keeps revisions and the breakdown for later — or shows everything, by choice', async ({ page }) => {
    test.setTimeout(120_000);
    await signIn(page);
    await page.goto(`/editor?script=${scriptId}`);
    await expect(page.getByLabel('Script', { exact: true })).toHaveCount(1, { timeout: 20_000 });
    await expect(page.getByRole('button', { name: 'Character Bible' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lock Revision' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Toggle revision mode' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Breakdown', exact: true })).toHaveCount(0);

    await page.goto('/settings');
    await page.getByRole('switch', { name: 'Show every tool' }).click({ timeout: 20_000 });
    await expect.poll(async () => (await admin.from('profiles').select('ui_prefs').eq('id', userId).single()).data?.ui_prefs?.show_all_tools).toBe(true);

    await page.goto(`/editor?script=${scriptId}`);
    await expect(page.getByRole('button', { name: 'Lock Revision' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: 'Breakdown', exact: true })).toBeVisible();
  });
});
