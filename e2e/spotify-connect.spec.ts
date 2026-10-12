import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// "Connect Spotify" on a site Spotify can't send anyone back to (a local or
// preview address) must say why, here — not fail silently, and not walk the
// person to Spotify's own red "Invalid redirect URI" page. The redirect rules
// themselves are unit-tested (lib/spotify/redirect.test.ts). Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

test.describe('Spotify connect (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const me = { id: '', email: `sp.${TAG}@journey.test` };

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    me.id = (await admin.auth.admin.createUser({ email: me.email, password: PASSWORD, email_confirm: true, user_metadata: { username: `sp${TAG}` } })).data.user!.id;
  });
  test.afterAll(async () => {
    if (admin && me.id) await admin.auth.admin.deleteUser(me.id);
  });

  test('says why it can’t connect, and stays on the site', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/auth');
    await page.fill('input[name="email"]', me.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });

    await page.goto('/soundtrack');
    await page.getByRole('button', { name: /Connect Spotify/ }).first().click();

    // Either Spotify isn't configured in this build, or this address isn't one Spotify accepts:
    // both say so in a message here.
    await expect(page.getByText(/isn’t set up for this site|Spotify no longer accepts|Spotify can only send you back/)).toBeVisible({ timeout: 10_000 });
    expect(new URL(page.url()).hostname).not.toContain('spotify.com');
  });
});
