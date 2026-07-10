import { test, expect } from '@playwright/test';

// End-to-end sign-in smoke: proves the full auth loop works — login sets a
// cookie-backed session, middleware accepts it, and a protected page renders
// instead of bouncing back to /auth (the historical redirect-loop bug).
//
// Requires TEST_USER_EMAIL / TEST_USER_PASSWORD env vars (a confirmed
// Supabase user); skips otherwise so unauthenticated CI runs stay green.

const EMAIL = process.env.TEST_USER_EMAIL;
const PASSWORD = process.env.TEST_USER_PASSWORD;

test.describe('Login smoke', () => {
  test.skip(!EMAIL || !PASSWORD, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not set');

  test('sign in survives middleware and reaches a protected page', async ({ page, context }) => {
    await page.goto('/auth');
    await page.locator('input[name="email"]').fill(EMAIL!);
    await page.locator('input[name="password"]').fill(PASSWORD!);
    await page.locator('form').getByRole('button', { name: /^sign in$/i }).click();

    // Leaving /auth is the signal the app accepted the session.
    await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 20_000 });

    // The session must live in cookies now — middleware validates it there.
    const cookies = await context.cookies();
    expect(cookies.some(c => c.name.includes('sb-') && c.name.includes('auth-token'))).toBe(true);

    // Hard-navigate to a protected route: middleware must let it through.
    await page.goto('/projects');
    await expect(page).not.toHaveURL(/\/auth/);
  });
});
