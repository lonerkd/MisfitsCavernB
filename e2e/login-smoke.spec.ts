import { test, expect } from '@playwright/test';

const EMAIL = process.env.TEST_USER_EMAIL;
const PASSWORD = process.env.TEST_USER_PASSWORD;

test.describe('Login smoke', () => {
  test.skip(!EMAIL || !PASSWORD, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not set');

  test('sign in survives middleware and reaches a protected page', async ({ page, context }) => {
    await page.goto('/auth');
    await page.locator('input[name="email"]').fill(EMAIL!);
    await page.locator('input[name="password"]').fill(PASSWORD!);
    await page.locator('form').getByRole('button', { name: /^sign in$/i }).click();

    await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 20_000 });

    const cookies = await context.cookies();
    expect(cookies.some(c => c.name.includes('sb-') && c.name.includes('auth-token'))).toBe(true);

    await page.goto('/projects');
    await expect(page).not.toHaveURL(/\/auth/);
  });
});
