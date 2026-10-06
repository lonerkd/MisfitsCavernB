import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Sharing a script by link, against a local stack: the writer turns the link
// on in the editor, a signed-out reader opens it (server-rendered, with its
// title in the page head), a new link closes the old one, and turning it off
// closes the new one. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();

test.describe('Script share links (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  let userId: string;
  let email: string;
  let scriptId: string;

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    email = `share.${Date.now()}@journey.test`;
    const { data } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { username: `sh${Date.now().toString(36)}` } });
    userId = data.user!.id;
    scriptId = (await admin.from('scripts').insert({ title: 'Moonlit Ridge', content: 'EXT. RUNDLE - NIGHT\n\nSAM\nRead every word.\n', created_by: userId, last_edited_by: userId }).select('id').single()).data!.id;
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('id', scriptId);
    await admin.auth.admin.deleteUser(userId);
  });

  test('on, read signed out, new link closes the old, off closes it', async ({ page, browser }) => {
    await page.goto('/auth');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });

    await page.goto(`/editor?script=${scriptId}`);
    await expect(page.getByLabel('Script', { exact: true })).toHaveCount(1, { timeout: 20_000 });

    const share = page.getByRole('button', { name: 'Share' });
    await share.click();
    const dialog = page.getByRole('dialog', { name: 'Share this script' });
    const toggle = dialog.getByRole('switch');
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    const link = await dialog.getByLabel('Share link').inputValue();
    expect(link).toMatch(/\/s\/[0-9a-f]{32}$/);

    // A reader with no account.
    const reader = await browser.newContext();
    const r = await reader.newPage();
    await r.goto(new URL(link).pathname);
    await expect(r).toHaveTitle('Moonlit Ridge — The Cavern');
    await expect(r.locator('#main-content').getByText('Read every word.')).toBeVisible();

    // A new link closes the old one.
    await dialog.getByRole('button', { name: /New link/ }).click();
    await page.getByRole('button', { name: 'NEW LINK', exact: true }).click();
    await expect(dialog.getByLabel('Share link')).not.toHaveValue(link);
    const fresh = await dialog.getByLabel('Share link').inputValue();
    await r.goto(new URL(link).pathname);
    await expect(r.locator('#main-content').getByText('SCRIPT NOT FOUND')).toBeVisible();
    await r.goto(new URL(fresh).pathname);
    await expect(r.locator('#main-content').getByText('Read every word.')).toBeVisible();

    // Off closes it.
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await r.goto(new URL(fresh).pathname);
    await expect(r.locator('#main-content').getByText('SCRIPT NOT FOUND')).toBeVisible();
    await reader.close();
  });
});
