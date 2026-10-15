import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Changing a project's phase without dragging: Alt + →/← on its card on the Projects
// board. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

test.describe('Projects board by keyboard (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const me = { id: '', email: `phase.${TAG}@journey.test` };
  let projectId = '';

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    me.id = (await admin.auth.admin.createUser({ email: me.email, password: PASSWORD, email_confirm: true, user_metadata: { username: `phase${TAG}` } })).data.user!.id;
    projectId = (await admin.from('projects').insert({ title: `Phase ${TAG}`, creator_id: me.id, status: 'pre-production' }).select('id').single()).data!.id;
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('projects').delete().eq('id', projectId);
    if (me.id) await admin.auth.admin.deleteUser(me.id);
  });

  test('Alt + →/← moves a project between phases', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/auth');
    await page.fill('input[name="email"]', me.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
    await page.goto('/projects');

    const card = `[data-project-card="${projectId}"] a`;
    const link = page.locator(card).first();
    await link.waitFor({ timeout: 30_000 });
    const status = async () => (await admin.from('projects').select('status').eq('id', projectId).single()).data?.status;
    await link.focus();

    // Two quick presses go two phases, even though the board redraws a moment after each.
    await page.keyboard.press('Alt+ArrowRight');
    await page.keyboard.press('Alt+ArrowRight');
    await expect.poll(status, { timeout: 15_000 }).toBe('post-production');
    await expect(page.locator(card).first()).toBeFocused();

    await page.keyboard.press('Alt+ArrowLeft');
    await page.keyboard.press('Alt+ArrowLeft');
    await expect.poll(status, { timeout: 15_000 }).toBe('pre-production');
  });
});
