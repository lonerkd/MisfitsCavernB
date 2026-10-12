import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Two things the editor page did itself, now in hooks (editor-page-apart):
// find & replace over the script, and casting a character from the Character
// Bible. Guards the move. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const BASE = 'INT. KITCHEN - NIGHT\n\nMAYA\nStill up.\n\nMAYA\nStill here.\n';

test.describe.serial('Editor find & replace and casting (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const me = { id: '', email: `fc.${TAG}@journey.test` };
  const actor = { id: '', username: `actor${TAG}` };
  let projectId = '';
  let scriptId = '';

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    me.id = (await admin.auth.admin.createUser({ email: me.email, password: PASSWORD, email_confirm: true, user_metadata: { username: `fc${TAG}` } })).data.user!.id;
    actor.id = (await admin.auth.admin.createUser({ email: `act.${TAG}@journey.test`, password: PASSWORD, email_confirm: true, user_metadata: { username: actor.username } })).data.user!.id;
    projectId = (await admin.from('projects').insert({ title: `FindCast ${TAG}`, creator_id: me.id }).select('id').single()).data!.id;
    await admin.from('project_crew').insert({ project_id: projectId, user_id: actor.id, craft: 'Actor', status: 'confirmed' });
    scriptId = (await admin.from('scripts').insert({ title: 'Kitchen', content: BASE, project_id: projectId, created_by: me.id, last_edited_by: me.id }).select('id').single()).data!.id;
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('created_by', me.id);
    await admin.from('projects').delete().eq('id', projectId);
    for (const id of [me.id, actor.id]) if (id) await admin.auth.admin.deleteUser(id);
  });

  async function openEditor(page: import('@playwright/test').Page) {
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
    await expect(script).toBeVisible({ timeout: 30_000 });
    return script;
  }

  test('find & replace: counts the matches, replaces one, then all, and saves', async ({ page }) => {
    test.setTimeout(120_000);
    const script = await openEditor(page);
    await expect(script).toHaveValue(BASE, { timeout: 30_000 });

    await script.click();
    await page.keyboard.press('Control+f');
    await page.getByPlaceholder('Find...').fill('Still');
    await page.getByPlaceholder('Replace...').fill('Awake');
    await expect(page.getByText(/^2\b/).first()).toBeVisible(); // two matches counted

    await page.getByRole('button', { name: 'Replace', exact: true }).click();
    await expect(script).toHaveValue(BASE.replace('Still', 'Awake'));
    await page.getByRole('button', { name: 'All', exact: true }).click();
    await expect(script).toHaveValue(BASE.replace(/Still/g, 'Awake'));
    await expect.poll(async () => (await admin.from('scripts').select('content').eq('id', scriptId).single()).data!.content, { timeout: 20_000 }).toBe(BASE.replace(/Still/g, 'Awake'));
  });

  test('casting: choose who plays a character in the Character Bible, and clear it', async ({ page }) => {
    test.setTimeout(120_000);
    const script = await openEditor(page);
    await expect(script).toBeVisible();

    await page.getByTitle('Character Bible').click();
    await page.getByRole('button', { name: /^MAYA/ }).click();
    await page.getByRole('combobox').selectOption({ label: actor.username });
    await expect(page.getByText(`Playing: ${actor.username}`)).toBeVisible({ timeout: 15_000 });
    await expect.poll(async () => (await admin.from('character_castings').select('crew_user_id').eq('project_id', projectId).eq('character_name', 'MAYA')).data?.[0]?.crew_user_id ?? null).toBe(actor.id);

    await page.getByRole('combobox').selectOption({ label: '— Not cast —' });
    await expect(page.getByText(`Playing: ${actor.username}`)).toHaveCount(0);
    await expect.poll(async () => (await admin.from('character_castings').select('id').eq('project_id', projectId).eq('character_name', 'MAYA')).data?.length ?? 0).toBe(0);
  });
});
