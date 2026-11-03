import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, type Browser } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The island at a narrow width (island_v2, local runs have it on): a window under 760 px with a
// mouse keeps the dock and has no tab bar; a touch phone keeps the tab bar and has no dock.
// Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const NARROW_DESK = { viewport: { width: 700, height: 800 } };
const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };

test.describe('Compact dock (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const user = { id: '', email: `cd.${TAG}@journey.test` };

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    user.id = (await admin.auth.admin.createUser({ email: user.email, password: PASSWORD, email_confirm: true, user_metadata: { username: `cd${TAG}` } })).data.user!.id;
  });
  test.afterAll(async () => { if (admin && user.id) await admin.auth.admin.deleteUser(user.id); });

  const open = async (browser: Browser, opts: object) => {
    const page = await (await browser.newContext(opts)).newPage();
    await page.goto('/auth');
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
    await page.goto('/community');
    return page;
  };

  test('a narrow window with a mouse has the dock and no tab bar', async ({ browser }) => {
    test.setTimeout(90_000);
    const page = await open(browser, NARROW_DESK);
    const nav = page.locator('nav[aria-label="Suite"][data-taskbar]');
    const dock = page.locator('[data-taskbar] .mc-taskbar');
    await expect(dock).toBeVisible({ timeout: 30_000 });
    await expect(nav).toHaveAttribute('data-compact', 'true');
    await expect(page.locator('[data-mobile-tabbar]')).toHaveCount(0);
    // It fits the window, and the page makes room for it.
    const box = await dock.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(700);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(700);
    expect(await page.evaluate(() => parseInt(getComputedStyle(document.documentElement).getPropertyValue('--taskbar-height'), 10))).toBeGreaterThan(0);
  });

  test('a touch phone keeps the tab bar and has no dock', async ({ browser }) => {
    test.setTimeout(90_000);
    const page = await open(browser, PHONE);
    await expect(page.locator('[data-mobile-tabbar]')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('[data-taskbar] .mc-taskbar')).toBeHidden();
  });
});
