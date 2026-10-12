import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Undo and redo in the real editor: typing is grouped into steps by pauses,
// Ctrl+Z steps back, Ctrl+Shift+Z / Ctrl+Y steps forward. Guards the move of
// that logic out of the editor page. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const BASE = 'INT. KITCHEN - NIGHT\n\nMAYA\nStill up.\n';

test.describe('Editor undo (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const me = { id: '', email: `undo.${TAG}@journey.test` };
  let projectId = '';
  let scriptId = '';

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    me.id = (await admin.auth.admin.createUser({ email: me.email, password: PASSWORD, email_confirm: true, user_metadata: { username: `undo${TAG}` } })).data.user!.id;
    projectId = (await admin.from('projects').insert({ title: `Undo ${TAG}`, creator_id: me.id }).select('id').single()).data!.id;
    scriptId = (await admin.from('scripts').insert({ title: 'Kitchen', content: BASE, project_id: projectId, created_by: me.id, last_edited_by: me.id }).select('id').single()).data!.id;
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('created_by', me.id);
    await admin.from('projects').delete().eq('id', projectId);
    if (me.id) await admin.auth.admin.deleteUser(me.id);
  });

  test('typing is undone a burst at a time, and redone', async ({ page }) => {
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
    await expect(script).toHaveValue(BASE, { timeout: 30_000 });

    await script.click();
    await page.keyboard.press('Control+End');
    await page.keyboard.type('\nFIRST');
    await page.waitForTimeout(900);          // a pause ends the step
    await page.keyboard.type('\nSECOND');
    await page.waitForTimeout(900);
    await expect(script).toHaveValue(BASE + '\nFIRST\nSECOND');

    await page.keyboard.press('Control+z');
    await expect(script).toHaveValue(BASE + '\nFIRST');
    await page.keyboard.press('Control+z');
    await expect(script).toHaveValue(BASE);
    await page.keyboard.press('Control+z');    // nothing left to undo
    await expect(script).toHaveValue(BASE);

    await page.keyboard.press('Control+Shift+z');
    await expect(script).toHaveValue(BASE + '\nFIRST');
    await page.keyboard.press('Control+y');
    await expect(script).toHaveValue(BASE + '\nFIRST\nSECOND');
  });
});
