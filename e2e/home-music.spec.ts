import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The Cavern's own playlists on Today: all four are offered, the page opens on Solitude with Spotify's player in it (the
// frame's address is the playlist's embed), and picking another swaps the player. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

test.describe('Music from the Cavern (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const user = { id: '', email: `hm.${TAG}@journey.test` };

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    user.id = (await admin.auth.admin.createUser({ email: user.email, password: PASSWORD, email_confirm: true, user_metadata: { username: `hm${TAG}` } })).data.user!.id;
  });
  test.afterAll(async () => { if (admin && user.id) await admin.auth.admin.deleteUser(user.id); });

  test('the playlists are offered, the page opens on Solitude, and picking another swaps the player', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/auth');
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
    await page.goto('/today');

    const section = page.getByRole('region', { name: 'Music from the Cavern' });
    await expect(section).toBeVisible({ timeout: 30_000 });
    for (const name of ['The Trophy', 'Misfits Cavern', 'Misfits Too', 'Solitude']) await expect(section.getByRole('button', { name })).toBeVisible();
    // It opens on Solitude, with Spotify's player already in the page.
    const frame = page.locator('iframe[title="Spotify player: Solitude"]');
    await expect(frame).toHaveCount(1);
    await expect(frame).toHaveAttribute('src', /open\.spotify\.com\/embed\/playlist\/3iFM46jnAkoQmsucygQMas/);
    await expect(section.getByRole('button', { name: 'Solitude' })).toHaveAttribute('aria-pressed', 'true');
    await expect(section.getByRole('link', { name: /Open “Solitude” in Spotify/ })).toHaveAttribute('href', 'https://open.spotify.com/playlist/3iFM46jnAkoQmsucygQMas');

    // Picking another swaps the player (one frame at a time).
    await section.getByRole('button', { name: 'The Trophy' }).click();
    await expect(page.locator('iframe[src*="open.spotify.com"]')).toHaveCount(1);
    await expect(page.locator('iframe[title="Spotify player: The Trophy"]')).toHaveCount(1);
    await expect(section.getByRole('button', { name: 'The Trophy' })).toHaveAttribute('aria-pressed', 'true');
    await expect(section.getByRole('button', { name: 'Solitude' })).toHaveAttribute('aria-pressed', 'false');
  });
});
