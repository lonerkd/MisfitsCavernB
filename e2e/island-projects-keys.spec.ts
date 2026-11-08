import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Caps Lock + P opens the project list, and the keys choose from it: arrows move, Enter picks, 1–9 pick by number (they used to
// jump to apps, and the arrows moved through the island's own controls). Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

const capsKey = (page: Page, key: string) =>
  page.evaluate((k) => { window.dispatchEvent(new KeyboardEvent('keydown', { key: k, modifierCapsLock: true, bubbles: true, cancelable: true })); }, key);
const capsOff = (page: Page) =>
  page.evaluate(() => { window.dispatchEvent(new KeyboardEvent('keyup', { key: 'CapsLock', modifierCapsLock: false, bubbles: true })); });

test.describe('Choosing a project with the keys (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');
  let admin: SupabaseClient;
  const owner = { id: '', email: `projkeys.${TAG}@journey.test` };
  const titles = [`Alpha ${TAG}`, `Bravo ${TAG}`, `Charlie ${TAG}`];

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    owner.id = (await admin.auth.admin.createUser({ email: owner.email, password: PASSWORD, email_confirm: true, user_metadata: { username: `pk${TAG}` } })).data.user!.id;
    for (const title of titles) await admin.from('projects').insert({ title, creator_id: owner.id, status: 'production' });
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('projects').delete().eq('creator_id', owner.id);
    await admin.auth.admin.deleteUser(owner.id);
  });

  test('arrows and Enter, and a number, choose a project; Escape closes the list', async ({ browser }) => {
    test.setTimeout(90_000);
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto('/auth');
    await page.fill('input[name="email"]', owner.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
    await page.goto('/community');
    const list = page.getByRole('listbox', { name: 'Projects' });
    const options = list.getByRole('option');

    await capsKey(page, 'CapsLock');
    await expect(page.locator('[data-taskbar]')).toHaveAttribute('data-island', 'caps', { timeout: 10_000 });
    await capsKey(page, 'P');
    await expect(list).toBeVisible({ timeout: 15_000 });
    await expect(options).toHaveCount(3);
    const focusedTitle = async () => { const text = await list.locator('[data-key-focus="true"]').innerText(); return titles.find((t) => text.includes(t)) ?? ''; };
    const first = await focusedTitle();

    // Arrow down moves the highlight (and does not move through the island's own controls); Enter picks it and closes the list.
    await capsKey(page, 'ArrowDown');
    const second = await focusedTitle();
    expect(second).not.toBe(first);
    await capsKey(page, 'Enter');
    await expect(list).toBeHidden();
    await expect(page.locator(`[data-tip="${second}"]`)).toBeAttached({ timeout: 10_000 }); // the island's project button now names it

    // A number picks that row, on the same page (it did not navigate to an app).
    const url = page.url();
    await capsKey(page, 'P');
    await expect(list).toBeVisible();
    await capsKey(page, '1');
    await expect(list).toBeHidden();
    expect(page.url()).toBe(url);
    await expect(page.locator(`[data-tip="${first}"]`)).toBeAttached({ timeout: 10_000 });

    // Escape closes the list without choosing.
    await capsKey(page, 'P');
    await expect(list).toBeVisible();
    await capsKey(page, 'Escape');
    await expect(list).toBeHidden();
    await capsOff(page);
    await ctx.close();
  });
});
