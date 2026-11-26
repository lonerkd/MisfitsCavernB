import { test, expect, stackEnabled, stackSkipReason } from './support/stack';

// One home: "/" is the front page when signed out and your day, what is new, crew and music when signed in, under the same
// 3D mark. The old /community address lands on it. Opt-in: E2E_LOCAL_STACK=1 (see e2e/support/stack.ts).
test.describe('Home routing (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  test('a signed-in person gets their home at "/", and the old addresses land there', async ({ page, stack }) => {
    const user = await stack.createUser({ label: 'home' });
    await stack.signIn(page, user);
    for (const old of ['/community', '/today', '/hub']) {
      await page.goto(old);
      await expect(page).toHaveURL(/\/$/);
    }
    await expect(page.getByRole('heading', { name: "What's new", exact: true })).toBeVisible({ timeout: 30_000 });
    // The sales story is for people who have not signed in.
    await expect(page.getByRole('link', { name: 'Enter The Cavern' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Your projects' }).first()).toBeVisible();
  });

  test('on a phone the same page opens, with no second "front page" entry in the menu', async ({ browser, stack }) => {
    const user = await stack.createUser({ label: 'homephone' });
    // The phone layout follows a touch pointer, not only the width.
    const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    try {
      await stack.signIn(page, user);
      await page.goto('/');
      await expect(page.getByRole('heading', { name: "What's new", exact: true })).toBeVisible({ timeout: 30_000 });
      await page.getByRole('button', { name: /^Menu\./ }).click();
      await expect(page.getByRole('link', { name: 'Front page' })).toHaveCount(0);
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
