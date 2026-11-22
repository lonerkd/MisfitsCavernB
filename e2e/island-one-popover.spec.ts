import { randomUUID } from 'node:crypto';
import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';

// One popover at a time over the island, and the Sound button is an island button like the others (same size, same
// radius). Spotify is made to look connected with a stored token and its network blocked; nothing real is called.
// Opt-in: E2E_LOCAL_STACK=1.
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

test.describe('The island: one popover at a time, and a Sound button like the rest (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  const owner = { id: '', email: `islandpop.${TAG}@journey.test` };

  test.beforeAll(async ({ stack }) => {
    owner.id = (await stack.createUser({ email: owner.email, password: PASSWORD, username: `islandpop${TAG}` })).id;
  });

  test('opening Sound closes Notifications; Escape closes and returns focus; the Sound button matches', async ({ browser }) => {
    test.setTimeout(150_000);
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    await ctx.route(/sdk\.scdn\.co|api\.spotify\.com|accounts\.spotify\.com/, (r) => r.abort());
    await ctx.addInitScript((uid) => {
      try {
        localStorage.setItem('spotify_owner', uid);
        localStorage.setItem('spotify_access_token', 'test-token');
        localStorage.setItem('spotify_refresh_token', 'test-refresh');
        localStorage.setItem('spotify_token_expires_at', String(Date.now() + 3_600_000));
      } catch { /* storage unavailable */ }
    }, owner.id);
    const page = await ctx.newPage();
    await signInAs(page, { email: owner.email, password: PASSWORD });
    await page.goto('/projects');
    await page.waitForTimeout(1500);
    await page.locator('[data-taskbar] .mc-taskbar').hover();
    await page.waitForTimeout(700);

    const nav = page.locator('[data-taskbar]');
    const bell = nav.getByRole('button', { name: /^Notifications/ });
    const sound = nav.getByRole('button', { name: /^Sound/ });
    await expect(sound).toBeVisible({ timeout: 30_000 });

    // Same size and shape as the island's other icon buttons.
    const metrics = (el: import('@playwright/test').Locator) => el.evaluate((e) => { const r = e.getBoundingClientRect(); return { w: r.width, h: r.height, radius: getComputedStyle(e).borderRadius }; });
    const mine = await metrics(sound);
    const neighbour = await metrics(nav.getByRole('button', { name: 'Switch project' }));
    expect(Math.abs(mine.w - neighbour.w)).toBeLessThanOrEqual(1);
    expect(Math.abs(mine.h - neighbour.h)).toBeLessThanOrEqual(1);
    expect(mine.radius).toBe(neighbour.radius);

    const notif = page.locator('[data-island-popover="notifications"]');
    const player = page.locator('[data-island-popover="sound"]');
    await bell.click();
    await expect(notif).toBeVisible();
    await sound.click();
    await expect(player).toBeVisible();
    await expect(notif).toHaveCount(0);
    expect(await page.locator('[data-island-popover]').count()).toBe(1);

    // And back the other way.
    await bell.click();
    await expect(notif).toBeVisible();
    await expect(player).toHaveCount(0);

    // Escape closes it and focus is on its button again.
    await sound.click();
    await expect(player).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(player).toHaveCount(0);
    await expect(sound).toBeFocused();
  });
});
