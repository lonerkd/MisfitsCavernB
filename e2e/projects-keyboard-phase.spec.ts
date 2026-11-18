import { randomUUID } from 'node:crypto';
import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';
import type { SupabaseClient } from '@supabase/supabase-js';

// Changing a project's phase without dragging: Alt + →/← on its card on the Projects
// board. Opt-in: E2E_LOCAL_STACK=1.
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

test.describe('Projects board by keyboard (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let admin: SupabaseClient;
  const me = { id: '', email: `phase.${TAG}@journey.test` };
  let projectId = '';

  test.beforeAll(async ({ stack }) => {
    admin = stack.admin;
    me.id = (await stack.createUser({ email: me.email, password: PASSWORD, username: `phase${TAG}` })).id;
    projectId = (await admin.from('projects').insert({ title: `Phase ${TAG}`, creator_id: me.id, status: 'pre-production' }).select('id').single()).data!.id;
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('projects').delete().eq('id', projectId);
  });

  test('Alt + →/← moves a project between phases', async ({ page }) => {
    test.setTimeout(120_000);
    await signInAs(page, { email: me.email, password: PASSWORD });
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
