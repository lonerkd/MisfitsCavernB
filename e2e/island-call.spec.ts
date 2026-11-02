import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, chromium, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The island holds a voice call. The call belongs to the suite, not to the Lounge page: join a room, leave the
// Lounge for another page, and the call is still there with Mute and Leave under your thumb. Real browser, real
// local stack, a fake microphone (Chromium's own, so no hardware). Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const SHOTS = process.env.ISLAND_SHOTS; // a folder: screenshots of the island while it holds the call

test.describe('The island holds a voice call (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  let userId = '';
  let projectId = '';
  const email = `call.${TAG}@journey.test`;
  const room = `Writers ${TAG}`;

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    userId = (await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { username: `call${TAG}` } })).data.user!.id;
    projectId = (await admin.from('projects').insert({ title: `Call ${TAG}`, creator_id: userId, status: 'production' }).select('id').single()).data!.id;
    const { error } = await admin.from('channels').insert({ project_id: projectId, name: room, type: 'voice', created_by: userId });
    if (error) throw new Error(`voice channel: ${error.message}`);
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('projects').delete().eq('id', projectId);
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  const island = (page: Page) => page.getByRole('navigation', { name: 'Suite' });
  const shot = async (page: Page, name: string) => {
    if (!SHOTS) return;
    await page.mouse.move(10, 10); // off the island, so what is shown is the island at rest
    await page.waitForTimeout(900); // let it finish moving
    await page.screenshot({ path: `${SHOTS}/${name}.png`, clip: { x: 500, y: 790, width: 600, height: 110 }, scale: 'device' });
  };
  /**
   * Navigate the way a person does, through the island's own links: a client-side move, never a page reload (a
   * reload would end any call). The deck slides open, so a click can land while it is still moving; a person
   * clicks again, and so does this: the whole step (open it if it is shut, click the app) retries until the page moves.
   */
  const goTo = async (page: Page, app: string, path: RegExp) => {
    await expect(async () => {
      const link = island(page).getByRole('link', { name: app, exact: true });
      if (!(await link.isVisible())) await island(page).getByRole('button', { name: /^Open the island/ }).click();
      await link.click({ timeout: 5000 });
      await page.waitForURL(path, { timeout: 4000 });
    }).toPass({ timeout: 40_000 });
    await page.mouse.move(10, 10);
  };

  test('join in the Lounge, work elsewhere with the call held on the island, mute and leave from it', async () => {
    test.setTimeout(120_000);
    // Chromium's fake microphone, granted without a prompt.
    const browser = await chromium.launch({ executablePath: process.env.MC_LOCAL_CHROMIUM, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, permissions: ['microphone'] });
    const page = await ctx.newPage();
    try {
      await page.goto('/auth');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', PASSWORD);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });

      await page.goto('/lounge');
      const picker = page.getByLabel('Active project');
      await picker.waitFor();
      if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
      await page.getByRole('button', { name: new RegExp(`^${room}`) }).first().click();
      await expect(island(page).getByText(/In voice/)).toHaveCount(0); // nothing running, nothing held

      await page.getByRole('button', { name: /JOIN VOICE/ }).click();
      await expect(island(page).getByText(`In voice · ${room}`)).toBeVisible({ timeout: 30_000 });
      await expect(island(page).getByText('1 person')).toBeVisible();

      // Leave the Lounge entirely: the page that started the call is gone, the call is not.
      await goTo(page, 'Today', /\/today/);
      await expect(island(page).getByText(`In voice · ${room}`)).toBeVisible({ timeout: 30_000 });

      await shot(page, 'call-live');
      await island(page).getByRole('button', { name: 'Mute', exact: true }).click();
      await expect(island(page).getByText(/muted/)).toBeVisible();
      await shot(page, 'call-muted');
      await island(page).getByRole('button', { name: 'Unmute', exact: true }).click();
      await expect(island(page).getByText(/muted/)).toHaveCount(0);

      // Back in the Lounge, the room knows it is the same call.
      await goTo(page, 'Lounge', /\/lounge/);
      await page.getByRole('button', { name: new RegExp(`^${room}`) }).first().click();
      await expect(page.getByRole('button', { name: /LEAVE VOICE/ })).toBeVisible({ timeout: 15_000 });

      // Leave from the island itself, from another page.
      await goTo(page, 'Today', /\/today/);
      await island(page).getByRole('button', { name: 'Leave', exact: true }).click();
      await expect(island(page).getByText(/In voice/)).toHaveCount(0);
    } finally { await ctx.close(); await browser.close(); }
  });
});
