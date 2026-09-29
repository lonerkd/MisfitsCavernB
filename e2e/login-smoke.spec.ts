import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Sign in with a real account and reach a protected page. Against a deployed
// site, give it an account (TEST_USER_EMAIL / TEST_USER_PASSWORD); on the local
// stack (E2E_LOCAL_STACK=1) it makes a throwaway one.
const LOCAL = process.env.E2E_LOCAL_STACK === '1';
let EMAIL = process.env.TEST_USER_EMAIL;
let PASSWORD = process.env.TEST_USER_PASSWORD;

test.describe('Login smoke', () => {
  test.skip(!LOCAL && (!EMAIL || !PASSWORD), 'TEST_USER_EMAIL / TEST_USER_PASSWORD not set (or E2E_LOCAL_STACK=1)');

  let cleanup: (() => Promise<unknown>) | null = null;
  test.beforeAll(async () => {
    if (EMAIL && PASSWORD) return;
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    const admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    EMAIL = `smoke.${Date.now().toString(36)}@journey.test`;
    PASSWORD = randomUUID();
    const { data } = await admin.auth.admin.createUser({ email: EMAIL, password: PASSWORD, email_confirm: true, user_metadata: { username: `smoke${Date.now().toString(36)}` } });
    cleanup = () => admin.auth.admin.deleteUser(data.user!.id);
  });
  test.afterAll(async () => { await cleanup?.(); });

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
