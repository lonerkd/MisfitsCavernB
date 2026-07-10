import { test, expect } from '@playwright/test';

// Regression tests for Bug #4: Password Validation Message
// Signup form should show a clear validation message when the
// submitted password is shorter than the minimum required length.
// See QA Session Log entry dated 7/6/2026.
//
// Signup lives on /auth behind a Sign In / Sign Up mode toggle (there is no
// /auth/signup route), and the Input component renders no <label> element,
// so fields are addressed by name attribute.

async function openSignupForm(page: import('@playwright/test').Page) {
  await page.goto('/auth');
  // The mode toggle is the first "Sign Up" button; the footer switch link is another.
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
