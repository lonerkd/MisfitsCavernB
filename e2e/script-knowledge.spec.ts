import { randomUUID } from 'node:crypto';
import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';
import type { SupabaseClient } from '@supabase/supabase-js';

// The deep brain, shown (BACKLOG 3.21): the editor's Script tab says what the reader learned about the script: the languages spoken and by
// whom, the years the headings name, the places. Opt-in: E2E_LOCAL_STACK=1.
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const SCRIPT = ['INT. KITCHEN - DAY - 1987', '', 'ABUELA (Spanish)', 'Ven aquí.', '', 'MAYA', 'Coming.', '', 'EXT. STREET - NIGHT - 2019', '', 'MAYA', 'Hello.', '', 'INT. KITCHEN - DAY - 2019', '', 'Maya waits.', ''].join('\n');

test.describe('What the reader knows (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);
  let admin: SupabaseClient;
  const me = { id: '', email: `sk.${TAG}@journey.test` };
  let projectId = '';
  let scriptId = '';

  test.beforeAll(async ({ stack }) => {
    admin = stack.admin;
    me.id = (await stack.createUser({ email: me.email, password: PASSWORD, username: `sk${TAG}` })).id;
    projectId = (await admin.from('projects').insert({ title: `Knows ${TAG}`, creator_id: me.id }).select('id').single()).data!.id;
    scriptId = (await admin.from('scripts').insert({ title: 'Knows', content: SCRIPT, project_id: projectId, created_by: me.id, last_edited_by: me.id }).select('id').single()).data!.id;
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('created_by', me.id);
    await admin.from('projects').delete().eq('id', projectId);
  });

  test('the Script tab lists the languages, years and places the reader found', async ({ page }) => {
    test.setTimeout(120_000);
    await signInAs(page, { email: me.email, password: PASSWORD });
    await page.goto('/studio');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
    await page.goto(`/editor?script=${scriptId}`);
    await expect(page.getByRole('textbox', { name: 'Script', exact: true })).toHaveValue(SCRIPT, { timeout: 30_000 });
    await page.getByRole('button', { name: 'Script', exact: true }).click();
    await page.getByText('What the reader knows').click();
    await expect(page.getByRole('region', { name: 'Languages' })).toContainText('Spanish');
    await expect(page.getByRole('region', { name: 'Languages' })).toContainText('ABUELA');
    await expect(page.getByRole('region', { name: 'Eras' })).toContainText('1987');
    await expect(page.getByRole('region', { name: 'Eras' })).toContainText('2019');
    await expect(page.getByRole('region', { name: 'Places' })).toContainText(/kitchen/i);
  });
});
