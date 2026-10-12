import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The deep brain, B8: a person tells the reader a name is not a character; it is
// remembered for the project, the reader obeys it (the Bible, the scene's cast),
// and it can be taken back. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
// The Fountain rule: an ALL-CAPS line over prose is a cue. DARKNESS is not a person.
const SCRIPT = 'INT. ROOM - DAY\n\nDARKNESS\nMaya waits.\n\nMAYA\nHello.\n';

test.describe.serial('Telling the reader what a name is (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const me = { id: '', email: `rc.${TAG}@journey.test` };
  let projectId = '';
  let scriptId = '';

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    me.id = (await admin.auth.admin.createUser({ email: me.email, password: PASSWORD, email_confirm: true, user_metadata: { username: `rc${TAG}` } })).data.user!.id;
    projectId = (await admin.from('projects').insert({ title: `Corrections ${TAG}`, creator_id: me.id }).select('id').single()).data!.id;
    scriptId = (await admin.from('scripts').insert({ title: 'Dark', content: SCRIPT, project_id: projectId, created_by: me.id, last_edited_by: me.id }).select('id').single()).data!.id;
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('created_by', me.id);
    await admin.from('projects').delete().eq('id', projectId);
    if (me.id) await admin.auth.admin.deleteUser(me.id);
  });

  const castList = async () => (await admin.from('scenes').select('cast_list').eq('script_id', scriptId).order('ordinal').limit(1).single()).data?.cast_list ?? null;

  test('not a character: it leaves the Bible and the scene’s cast, is remembered, and can be taken back', async ({ page }) => {
    test.setTimeout(150_000);
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

    // As written, the reader takes DARKNESS for a speaker, and the scene says so.
    await expect.poll(castList, { timeout: 30_000 }).toContain('DARKNESS');
    await page.getByTitle('Character Bible').click();
    await page.getByRole('button', { name: /^DARKNESS/ }).click();
    await page.getByRole('button', { name: 'Not a character' }).click();

    // Obeyed at once: gone from the Bible's list, listed as not read as a character, scene cast corrected.
    await expect(page.getByRole('button', { name: /^DARKNESS/ })).toHaveCount(0);
    const rejected = page.getByLabel('Names not read as characters');
    await expect(rejected).toContainText('DARKNESS');
    await expect.poll(castList, { timeout: 30_000 }).toBe('MAYA');
    expect((await admin.from('reading_corrections').select('kind, name').eq('project_id', projectId)).data).toEqual([{ kind: 'not_character', name: 'DARKNESS' }]);
    await expect(script).toHaveValue(SCRIPT); // the script itself is never touched

    // Remembered: a fresh load of the editor reads it the same way.
    await page.reload();
    await expect(script).toHaveValue(SCRIPT, { timeout: 30_000 });
    await page.getByTitle('Character Bible').click();
    await expect(page.getByLabel('Names not read as characters')).toContainText('DARKNESS');
    await expect(page.getByRole('button', { name: /^DARKNESS/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^MAYA/ })).toBeVisible();

    // Taken back: read as before.
    await page.getByRole('button', { name: 'Read DARKNESS as a character again' }).click();
    await expect(page.getByRole('button', { name: /^DARKNESS/ })).toBeVisible();
    await expect.poll(castList, { timeout: 30_000 }).toContain('DARKNESS');
    expect((await admin.from('reading_corrections').select('id').eq('project_id', projectId)).data).toEqual([]);
  });
});
