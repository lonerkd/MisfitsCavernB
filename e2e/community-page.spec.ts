import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Community: one page for your day, what's new, crew open to work, the suite's parts and numbers,
// and the house music; the old Today and Hub index land on it. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

test.describe('Community page (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const user = { id: '', email: `cm.${TAG}@journey.test` };

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    user.id = (await admin.auth.admin.createUser({ email: user.email, password: PASSWORD, email_confirm: true, user_metadata: { username: `cm${TAG}` } })).data.user!.id;
  });
  test.afterAll(async () => { if (admin && user.id) await admin.auth.admin.deleteUser(user.id); });

  test('signed out it asks for sign-in; signed in it holds every section and the old routes land on it', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/community');
    await expect(page).toHaveURL(/\/auth/);

    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });

    for (const old of ['/today', '/hub']) {
      await page.goto(old);
      await expect(page).toHaveURL(/\/community$/);
    }
    await expect(page.getByRole('heading', { level: 1, name: 'Community' })).toBeAttached();
    for (const name of ["What's new", 'Crew open to work', 'The Cavern', 'Music from the Cavern']) {
      await expect(page.getByRole('heading', { name, exact: true })).toBeVisible({ timeout: 30_000 });
    }

    // The previews are a picker: choosing a part shows it and the way in.
    await page.getByRole('tab', { name: 'Studio' }).click();
    await expect(page.getByRole('link', { name: /Open Studio/ })).toHaveAttribute('href', '/studio');
    await page.getByRole('tab', { name: 'Lounge' }).click();
    await expect(page.getByRole('link', { name: /Open Lounge/ })).toHaveAttribute('href', '/lounge');

    // A share keeps its query string through the old Today route.
    await page.goto('/today?text=hello');
    await expect(page).toHaveURL(/\/community\?text=hello/);
  });
});
