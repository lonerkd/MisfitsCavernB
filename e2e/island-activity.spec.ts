import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The island holds what is running (lib/island/activities): a writing sprint on the clock with working
// pause / resume / reset on the island itself, and the editor's offline queue — "saved on this device" while
// the connection is down, gone once it has synced. Opt-in: E2E_LOCAL_STACK=1. Set ISLAND_SHOTS=<dir> to also
// save pictures of the island in each state.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const SHOTS = process.env.ISLAND_SHOTS;
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const BASE = 'INT. KITCHEN - NIGHT\n\nMAYA\nStill up.\n';

test.describe.serial('The island holds activities (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  let userId = '';
  let projectId = '';
  let scriptId = '';
  const email = `island.${TAG}@journey.test`;

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    userId = (await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { username: `isl${TAG}` } })).data.user!.id;
    projectId = (await admin.from('projects').insert({ title: `Island ${TAG}`, creator_id: userId }).select('id').single()).data!.id;
    scriptId = (await admin.from('scripts').insert({ title: 'Kitchen', content: BASE, project_id: projectId, created_by: userId, last_edited_by: userId }).select('id').single()).data!.id;
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('project_id', projectId);
    await admin.from('projects').delete().eq('id', projectId);
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  async function openEditor(page: Page) {
    await page.goto('/auth');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
    await page.goto('/studio');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
    await page.goto(`/editor?script=${scriptId}`);
    await expect(page.getByLabel('Script', { exact: true })).toBeVisible({ timeout: 30_000 });
  }
  const island = (page: Page) => page.getByRole('navigation', { name: 'Suite' });
  const shot = async (page: Page, name: string) => {
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, clip: { x: 0, y: 760, width: 1600, height: 140 } });
  };

  test('a running sprint is held on the island, ticks, and pauses, resumes and resets from it', async ({ browser }) => {
    test.setTimeout(120_000);
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
    const page = await ctx.newPage();
    try {
      await openEditor(page);
      await expect(island(page).getByText(/Sprint \d\d:\d\d/)).toHaveCount(0); // nothing running, nothing held

      await page.getByRole('button', { name: 'Start sprint' }).click();
      const clock = island(page).getByText(/Sprint \d\d:\d\d/);
      await expect(clock).toBeVisible({ timeout: 10_000 });
      await expect(page.locator('nav[aria-label="Suite"]')).toHaveAttribute('data-island', 'activity');
      await shot(page, '1-sprint-running');

      const first = await clock.textContent();
      await expect.poll(async () => clock.textContent(), { timeout: 10_000 }).not.toBe(first); // it ticks

      await island(page).getByRole('button', { name: 'Pause', exact: true }).click();
      await expect(island(page).getByText(/paused/)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Start sprint' })).toBeVisible(); // the panel followed
      await shot(page, '2-sprint-paused');
      const frozen = await clock.textContent();
      await page.waitForTimeout(2500);
      expect(await clock.textContent()).toBe(frozen); // paused means stopped

      await island(page).getByRole('button', { name: 'Resume', exact: true }).click();
      await expect(island(page).getByRole('button', { name: 'Pause', exact: true })).toBeVisible();

      await island(page).getByRole('button', { name: 'Reset', exact: true }).click();
      await expect(island(page).getByText(/Sprint \d\d:\d\d/)).toHaveCount(0); // let go
    } finally { await ctx.close(); }
  });

  test('offline in the editor: the queue is held on the island, and let go once it has synced', async ({ browser }) => {
    test.setTimeout(150_000);
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
    const page = await ctx.newPage();
    try {
      await openEditor(page);
      const script = page.getByLabel('Script', { exact: true });
      await expect(script).toHaveValue(BASE, { timeout: 30_000 });
      await page.waitForTimeout(3000); // the first load's own save settles
      await expect(island(page).getByText(/saved on this device|waiting to sync/)).toHaveCount(0);

      await ctx.setOffline(true);
      await script.click();
      await page.keyboard.press('Control+End');
      await page.keyboard.type('\nWritten offline.');
      await page.mouse.move(5, 5);

      const held = island(page).getByText('1 script saved on this device');
      await expect(held).toBeVisible({ timeout: 15_000 });
      await expect(island(page).getByText('Will sync when you reconnect')).toBeVisible();
      await expect(island(page).getByText('Offline', { exact: true })).toBeVisible(); // the island's own chip says so too
      await shot(page, '3-offline-waiting');

      await ctx.setOffline(false);
      await expect.poll(async () => (await admin.from('scripts').select('content').eq('id', scriptId).single()).data!.content, { timeout: 45_000 }).toContain('Written offline.');
      await expect(island(page).getByText(/saved on this device|waiting to sync|Syncing/)).toHaveCount(0, { timeout: 30_000 });
    } finally { await ctx.close(); }
  });
});
