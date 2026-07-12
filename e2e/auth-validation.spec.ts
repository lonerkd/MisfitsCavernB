import { test, expect } from '@playwright/test';

async function openSignupForm(page: import('@playwright/test').Page) {
  await page.goto('/auth');

  await page.getByRole('button', { name: /sign up/i }).first().click();
  await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
}

test.describe('Auth Validation', () => {
  test('signup form shows password length validation message for weak password', async ({ page }) => {
    await openSignupForm(page);

    await page.locator('input[name="email"]').fill('qa-validation-test@example.com');
    await page.locator('input[name="username"]').fill('qa_validation_test');
    await page.locator('input[name="password"]').fill('123');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page.getByText('Password must be at least 6 characters.')).toBeVisible();
  });

  test('signup form does not show the length message for a password meeting the minimum', async ({ page }) => {
    await openSignupForm(page);

    await page.locator('input[name="email"]').fill('qa-validation-test-2@example.com');
    await page.locator('input[name="username"]').fill('qa_validation_test_2');
    await page.locator('input[name="password"]').fill('123456');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page.getByText('Password must be at least 6 characters.')).not.toBeVisible();
  });
});
