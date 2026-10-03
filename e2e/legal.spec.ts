import { test, expect } from '@playwright/test';

// The Privacy Policy and Terms are public, say who runs the suite and how to
// reach them, and are one tap from the landing page and from signing up.
test.describe('Legal pages', () => {
  for (const [path, title] of [['/privacy', 'Privacy Policy'], ['/terms', 'Terms of Service']] as const) {
    test(`${title} is public and names who to contact`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`${path}$`)); // not redirected to sign-in
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
      await expect(page.getByText(/Peter Olowude/).first()).toBeVisible();
      await expect(page.getByRole('link', { name: 'peterolowude@icloud.com' }).first()).toHaveAttribute('href', 'mailto:peterolowude@icloud.com');
      // No sideways scroll on a phone-width screen either.
      await page.setViewportSize({ width: 390, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }

  test('linked from the landing page and the sign-up form', async ({ page }) => {
    await page.goto('/');
    await page.locator('footer').getByRole('link', { name: 'Privacy' }).click();
    await expect(page).toHaveURL(/\/privacy$/);

    await page.goto('/auth');
    await page.getByRole('button', { name: /sign up|create account/i }).first().click();
    await page.getByRole('link', { name: 'Terms' }).click();
    await expect(page).toHaveURL(/\/terms$/);
  });
});
