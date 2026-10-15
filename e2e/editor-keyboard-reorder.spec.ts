import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Reordering scenes without a mouse: Alt + arrow on a scene in the editor's list.
// Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const SCRIPT = 'INT. ALPHA - DAY\n\nMAYA\nOne.\n\nINT. BRAVO - DAY\n\nELI\nTwo.\n\nINT. CHARLIE - DAY\n\nMAYA\nThree.\n';

test.describe('Editor keyboard reorder (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const me = { id: '', email: `reorder.${TAG}@journey.test` };
  let projectId = '';
  let scriptId = '';

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    me.id = (await admin.auth.admin.createUser({ email: me.email, password: PASSWORD, email_confirm: true, user_metadata: { username: `reorder${TAG}` } })).data.user!.id;
    projectId = (await admin.from('projects').insert({ title: `Reorder ${TAG}`, creator_id: me.id }).select('id').single()).data!.id;
    scriptId = (await admin.from('scripts').insert({ title: 'Three', content: SCRIPT, project_id: projectId, created_by: me.id, last_edited_by: me.id }).select('id').single()).data!.id;
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('created_by', me.id);
    await admin.from('projects').delete().eq('id', projectId);
    if (me.id) await admin.auth.admin.deleteUser(me.id);
  });

  test('Alt + ↓ moves a scene one place and keeps focus on it', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/auth');
    await page.fill('input[name="email"]', me.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
    await page.goto('/studio');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
    await page.goto(`/editor?script=${scriptId}`);
    const script = page.getByLabel('Script', { exact: true });
    await expect(script).toHaveValue(SCRIPT, { timeout: 30_000 });

    await expect(page.locator('[data-reorder="nav"]')).toHaveCount(3);
    const first = page.locator('[data-reorder="nav"][data-index="0"]');
    await first.focus();
    await page.keyboard.press('Alt+ArrowDown');
    await expect(script).toHaveValue(/^INT\. BRAVO - DAY[\s\S]*INT\. ALPHA - DAY[\s\S]*INT\. CHARLIE - DAY/);
    await expect(page.locator('[data-reorder="nav"][data-index="1"]')).toBeFocused();

    await expect(page.locator('[data-reorder="nav"][data-index="0"]')).toContainText('BRAVO');
    await expect(page.locator('[data-reorder="nav"][data-index="1"]')).toBeFocused();
    await page.keyboard.press('Alt+ArrowUp');
    await expect(script).toHaveValue(/^INT\. ALPHA - DAY[\s\S]*INT\. BRAVO - DAY[\s\S]*INT\. CHARLIE - DAY/);
  });
});
