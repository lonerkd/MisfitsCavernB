import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Shortcuts are searchable: the command palette finds one by its keys or its name, Enter opens the shortcuts panel on it,
// and the panel has its own filter. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

test.describe('Searching the shortcuts (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const user = { id: '', email: `sk.${TAG}@journey.test` };

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    user.id = (await admin.auth.admin.createUser({ email: user.email, password: PASSWORD, email_confirm: true, user_metadata: { username: `sk${TAG}` } })).data.user!.id;
  });
  test.afterAll(async () => { if (admin && user.id) await admin.auth.admin.deleteUser(user.id); });

  test('the palette finds a shortcut by its keys, and the panel opens on it and filters', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/auth');
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
    await page.goto('/community');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('body').click();

    await page.keyboard.press('Control+k');
    const palette = page.getByRole('dialog', { name: 'Search the suite' });
    await expect(palette).toBeVisible({ timeout: 15_000 });
    await palette.getByRole('textbox').fill('ctrl z');
    // The undo shortcut is offered, with its keys.
    const hit = palette.getByRole('button', { name: /Undo/ });
    await expect(hit).toBeVisible();
    await expect(hit).toContainText(/Ctrl Z|⌘Z/);

    // Enter opens the shortcuts panel, already filtered to what was typed.
    await palette.getByRole('textbox').press('Enter');
    await expect(palette).toHaveCount(0);
    const panel = page.getByRole('textbox', { name: 'Find a shortcut' });
    await expect(panel).toBeVisible();
    await expect(panel).toHaveValue('ctrl z');
    await expect(page.getByText(/Undo: in a text box/)).toBeVisible();

    // The panel's own filter: the island's Create key, by its key and by its name.
    await panel.fill('caps q');
    await expect(page.getByText('Create something new on this page')).toBeVisible();
    await expect(page.getByText(/Undo: in a text box/)).toHaveCount(0);
    await panel.fill('nonsense-qqq');
    await expect(page.getByText(/No shortcut matches/)).toBeVisible();
  });
});
