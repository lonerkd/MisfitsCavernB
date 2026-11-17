import { test, expect, stackEnabled, stackSkipReason } from './support/stack';

// Two homes, one rule: Community is the signed-in home, the front page (/) is the public landing for everyone and
// stays reachable when signed in. Opt-in: E2E_LOCAL_STACK=1 (see e2e/support/stack.ts).
test.describe('Home routing (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  test('a signed-in person sees the front page with a way back into the app, and can reach it from the shell', async ({ page, stack }) => {
    const user = await stack.createUser({ label: 'home' });
    await stack.signIn(page, user);

    // Desktop: the taskbar has a Front page entry beside Profile and Settings.
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/community');
    const front = page.getByRole('link', { name: 'Front page' }).first();
    if (!(await front.isVisible())) await page.getByRole('button', { name: /^Open the island/ }).click();
    await front.click();
    await expect(page).toHaveURL(/\/$/);
    // The landing does not redirect, and its signed-in button now says where it goes.
    const open = page.getByRole('link', { name: 'Open Community' }).first();
    await expect(open).toBeVisible();
    await open.click();
    await expect(page).toHaveURL(/\/community$/);
  });

  test('on a phone the menu sheet carries the Front page', async ({ browser, stack }) => {
    const user = await stack.createUser({ label: 'homephone' });
    // The phone layout follows a touch pointer, not only the width.
    const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    try {
      await stack.signIn(page, user);
      await page.goto('/community');
      await page.getByRole('button', { name: /^Menu\./ }).click();
      await page.getByRole('link', { name: 'Front page' }).click();
      await expect(page).toHaveURL(/\/$/);
    } finally {
      await ctx.close();
    }
  });

  test('a signed-out visitor still gets the landing at the domain', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('link', { name: 'Enter The Cavern' }).first()).toBeVisible();
  });
});
