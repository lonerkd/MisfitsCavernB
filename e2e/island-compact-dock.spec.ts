import { randomUUID } from 'node:crypto';
import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';
import type { Browser } from '@playwright/test';

// The island at a narrow width (island_v2, local runs have it on): a window under 760 px with a
// mouse keeps the dock and has no tab bar; a touch phone keeps the tab bar and has no dock.
// Opt-in: E2E_LOCAL_STACK=1.
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const NARROW_DESK = { viewport: { width: 700, height: 800 } };
const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };

test.describe('Compact dock (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  const user = { id: '', email: `cd.${TAG}@journey.test` };

  test.beforeAll(async ({ stack }) => {
    user.id = (await stack.createUser({ email: user.email, password: PASSWORD, username: `cd${TAG}` })).id;
  });

  const open = async (browser: Browser, opts: object) => {
    const page = await (await browser.newContext(opts)).newPage();
    await signInAs(page, { email: user.email, password: PASSWORD });
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
