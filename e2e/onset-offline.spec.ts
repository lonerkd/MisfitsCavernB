import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// On set without signal, against a local stack: the connection drops mid-day;
// a shot got, the scene wrapped and a day note still show at once and wait on
// the device — through a reload with no signal — and are sent when the
// connection comes back. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const SCRIPT = 'INT. MINE SHAFT - NIGHT\n\nLamps flicker.\n\nEXT. PIT HEAD - DAWN\n\nSteam rises.\n';
const d = new Date();
const TODAY = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

test.describe('On set offline (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  let userId: string;
  let email: string;
  let projectId: string;

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    email = `osoff.${Date.now()}@journey.test`;
    const { data } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { username: `osoff${Date.now().toString(36)}` } });
    userId = data.user!.id;
    projectId = (await admin.from('projects').insert({ title: 'Underground', creator_id: userId, status: 'production' }).select('id').single()).data!.id;
    await admin.from('scripts').insert({ title: 'Underground', content: SCRIPT, project_id: projectId, created_by: userId, last_edited_by: userId });
    await admin.from('call_sheets').insert({ project_id: projectId, shoot_day: 1, shoot_date: TODAY, general_call: '07:00', estimated_wrap: '19:00' });
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('project_id', projectId);
    await admin.from('projects').delete().eq('id', projectId);
    await admin.auth.admin.deleteUser(userId);
  });

  test('changes made with no signal wait on the device and are sent when it’s back', async ({ page, context }) => {
    test.setTimeout(150_000);
    await page.goto('/auth');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });

    await page.goto('/studio?tab=production&view=onset');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
    await expect.poll(async () => (await admin.from('scenes').select('id').eq('project_id', projectId).is('removed_at', null)).data?.length, { timeout: 20_000 }).toBe(2);
    const scene = (await admin.from('scenes').select('id').eq('project_id', projectId).order('scene_number').limit(1).single()).data!.id;
    await admin.from('scenes').update({ shoot_day: 1 }).eq('id', scene);
    const shot = (await admin.from('shots').insert({ project_id: projectId, scene_id: scene, shot_number: '1.1', shot_size: 'WS', created_by: userId }).select('id').single()).data!.id;
    await page.reload();
    const card = page.getByRole('article', { name: /^Scene 1:/ });
    await expect(card.getByRole('button', { name: 'Shot 1.1: mark got' })).toBeVisible({ timeout: 30_000 });
    // Let the day's copy settle on the device.
    await page.waitForTimeout(1000);

    // The signal drops.
    await context.setOffline(true);
    const banner = page.getByRole('status').filter({ hasText: 'No signal' });
    await expect(banner).toBeVisible();

    await card.getByRole('button', { name: 'Shot 1.1: mark got' }).click();
    await expect(card.getByRole('button', { name: 'Shot 1.1: got it — undo' })).toBeVisible();
    await card.getByRole('button', { name: 'Wrap scene' }).click();
    await expect(card.getByRole('button', { name: 'Reopen' })).toBeVisible();
    await page.getByLabel('Note for the day').fill('Generator out — shot on battery');
    await page.getByRole('button', { name: 'Note', exact: true }).click();
    await expect(page.getByText('Generator out — shot on battery')).toBeVisible();
    // Shot + scene (only its last status) + note.
    await expect(banner).toContainText('3 changes waiting');
    expect((await admin.from('shots').select('status').eq('id', shot).single()).data?.status).toBe('planned');

    // Still no signal after a reload: the day opens from this device's copy, changes still waiting.
    await page.reload();
    await expect(banner).toContainText('3 changes waiting', { timeout: 30_000 });
    await expect(banner).toContainText('Showing the day as of');
    await expect(card.getByRole('button', { name: 'Shot 1.1: got it — undo' })).toBeVisible();
    await expect(card.getByRole('button', { name: 'Reopen' })).toBeVisible();

    // Back online: sent, in order.
    await context.setOffline(false);
    await expect(page.getByRole('status').filter({ hasText: 'Back online' })).toBeVisible({ timeout: 30_000 });
    await expect.poll(async () => (await admin.from('shots').select('status').eq('id', shot).single()).data?.status, { timeout: 20_000 }).toBe('shot');
    await expect.poll(async () => (await admin.from('scenes').select('status').eq('id', scene).single()).data?.status).toBe('wrapped');
    await expect.poll(async () => (await admin.from('set_log').select('body').eq('project_id', projectId).eq('kind', 'note')).data).toEqual([{ body: 'Generator out — shot on battery' }]);
    await expect(page.getByRole('status').filter({ hasText: 'waiting' })).toHaveCount(0);
  });
});
