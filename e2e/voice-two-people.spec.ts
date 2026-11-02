import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Two real people in one voice room (BACKLOG 3.24 d, 4.1): two browsers, two accounts, a fake microphone each.
// Each one's island counts the other, hears the other speak, and notices when the other leaves. Real WebRTC
// between two Chromium instances over the local stack's Realtime signalling. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

test.describe('Two people in a voice room (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const people = [
    { id: '', email: `v1.${TAG}@journey.test`, name: `vsam${TAG}` },
    { id: '', email: `v2.${TAG}@journey.test`, name: `vjor${TAG}` },
  ];
  let projectId = '';
  const room = `Pair ${TAG}`;

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    for (const p of people) {
      p.id = (await admin.auth.admin.createUser({ email: p.email, password: PASSWORD, email_confirm: true, user_metadata: { username: p.name } })).data.user!.id;
    }
    projectId = (await admin.from('projects').insert({ title: `Pair ${TAG}`, creator_id: people[0].id, status: 'production' }).select('id').single()).data!.id;
    await admin.from('project_crew').insert({ project_id: projectId, user_id: people[1].id, craft: 'Writer', status: 'confirmed' });
    const { error } = await admin.from('channels').insert({ project_id: projectId, name: room, type: 'voice', created_by: people[0].id });
    if (error) throw new Error(`voice channel: ${error.message}`);
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('projects').delete().eq('id', projectId);
    for (const p of people) if (p.id) await admin.auth.admin.deleteUser(p.id);
  });

  const island = (page: Page) => page.getByRole('navigation', { name: 'Suite' });

  async function enter(browser: Browser, who: number): Promise<{ ctx: BrowserContext; page: Page }> {
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, permissions: ['microphone'] });
    const page = await ctx.newPage();
    await page.goto('/auth');
    await page.fill('input[name="email"]', people[who].email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
    await page.goto('/lounge');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
    await page.getByRole('button', { name: new RegExp(`^${room}`) }).first().click();
    return { ctx, page };
  }

  test('each hears the other join, speak and leave on the island', async () => {
    test.setTimeout(180_000);
    const browser = await chromium.launch({ executablePath: process.env.MC_LOCAL_CHROMIUM, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
    const a = await enter(browser, 0);
    const b = await enter(browser, 1);
    try {
      await a.page.getByRole('button', { name: /JOIN VOICE/ }).click();
      await expect(island(a.page).getByText(`In voice · ${room}`)).toBeVisible({ timeout: 30_000 });
      await expect(island(a.page).getByText('1 person')).toBeVisible();

      await b.page.getByRole('button', { name: /JOIN VOICE/ }).click();
      await expect(island(b.page).getByText(`In voice · ${room}`)).toBeVisible({ timeout: 30_000 });

      // Real peer connection both ways: each island counts two.
      await expect(island(a.page).getByText(/2 people/)).toBeVisible({ timeout: 45_000 });
      await expect(island(b.page).getByText(/2 people/)).toBeVisible({ timeout: 45_000 });

      // The fake microphones beep, so each hears the other by name.
      await expect(island(a.page).getByText(new RegExp(`${people[1].name}.*speaking`, 'i'))).toBeVisible({ timeout: 45_000 });
      await expect(island(b.page).getByText(new RegExp(`${people[0].name}.*speaking`, 'i'))).toBeVisible({ timeout: 45_000 });

      // B leaves from the island; A is alone again.
      await expect(async () => {
        const leave = island(b.page).getByRole('button', { name: 'Leave', exact: true });
        if (!(await leave.isVisible())) await island(b.page).getByRole('button', { name: /^Open the island/ }).click();
        await leave.click({ timeout: 4000 });
      }).toPass({ timeout: 30_000 });
      await expect(island(b.page).getByText(/In voice/)).toHaveCount(0);
      await expect(island(a.page).getByText('1 person')).toBeVisible({ timeout: 30_000 });
      await expect(island(a.page).getByText(/2 people/)).toHaveCount(0);
    } finally { await a.ctx.close(); await b.ctx.close(); await browser.close(); }
  });
});
