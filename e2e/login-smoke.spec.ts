import { test, expect, stackEnabled } from './support/stack';

// Sign in with a real account and reach a protected page. Against a deployed
// site, give it an account (TEST_USER_EMAIL / TEST_USER_PASSWORD); on the local
// stack (E2E_LOCAL_STACK=1) it makes a throwaway one.
let EMAIL = process.env.TEST_USER_EMAIL;
let PASSWORD = process.env.TEST_USER_PASSWORD;

test.describe('Login smoke', () => {
  test.skip(!stackEnabled && (!EMAIL || !PASSWORD), 'TEST_USER_EMAIL / TEST_USER_PASSWORD not set (or E2E_LOCAL_STACK=1)');

  // No account given: the helper makes a throwaway one and deletes it at teardown.
  test.beforeAll(async ({ stack }) => {
    if (EMAIL && PASSWORD) return;
    const user = await stack.createUser({ label: 'smoke' });
    EMAIL = user.email;
    PASSWORD = user.password;
  });

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
