import { test, expect } from '@playwright/test';

// Regression tests for Bug #4: Password Validation Message
// Signup form should show a clear validation message when the
// submitted password is shorter than the minimum required length.
// See QA Session Log entry dated 7/6/2026.

test.describe('Auth Validation', () => {
    test('signup form shows password length validation message for weak password', async ({ page }) => {
          await page.goto('/auth/signup');

             await page.getByLabel(/email/i).fill('qa-validation-test@example.com');
          await page.getByLabel(/^password/i).fill('123');
          await page.getByRole('button', { name: /sign up/i }).click();

             await expect(page.getByText('Password must be at least 6 characters.')).toBeVisible();
    });

                test('signup form accepts a password meeting the minimum length', async ({ page }) => {
                      await page.goto('/auth/signup');

                         await page.getByLabel(/email/i).fill('qa-validation-test-2@example.com');
                      await page.getByLabel(/^password/i).fill('123456');
                      await page.getByRole('button', { name: /sign up/i }).click();

                         await expect(page.getByText('Password must be at least 6 characters.')).not.toBeVisible();
                });
});
