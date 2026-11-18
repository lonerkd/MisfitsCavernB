import { randomUUID } from 'node:crypto';
import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';
import type { SupabaseClient } from '@supabase/supabase-js';

// The editor opens the active project's script. When looking that script up
// fails, it says so — it must not take the failure for "no script yet" and
// start a second, empty screenplay for the project (it used to).
// Opt-in: E2E_LOCAL_STACK=1.
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

test.describe('Editor and the project script (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let admin: SupabaseClient;
  const me = { id: '', email: `ed.${TAG}@journey.test` };
  let projectId = '';

  test.beforeAll(async ({ stack }) => {
    admin = stack.admin;
    me.id = (await stack.createUser({ email: me.email, password: PASSWORD, username: `ed${TAG}` })).id;
    projectId = (await admin.from('projects').insert({ title: `Lighthouse ${TAG}`, creator_id: me.id }).select('id').single()).data!.id;
    await admin.from('scripts').insert({ title: `Lighthouse ${TAG}`, content: 'INT. LAMP ROOM - NIGHT\n\n', project_id: projectId, created_by: me.id, last_edited_by: me.id });
    // A newer script of their own, outside the project: the editor has to look the project's up.
    await admin.from('scripts').insert({ title: 'Notebook', content: 'INT. KITCHEN - DAY\n\n', created_by: me.id, last_edited_by: me.id, updated_at: new Date(Date.now() + 60_000).toISOString() });
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('created_by', me.id);
    await admin.from('projects').delete().eq('id', projectId);
  });

  test('a failed lookup says so and starts no second script', async ({ page }) => {
    test.setTimeout(120_000);
    await signInAs(page, { email: me.email, password: PASSWORD });

    // Make the project active.
    await page.goto('/studio');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);

    // The lookup of the project's latest script fails.
    await page.route((u) => u.pathname.endsWith('/rest/v1/scripts') && u.searchParams.get('select') === 'id' && u.searchParams.get('project_id') === `eq.${projectId}`, (r) => r.abort());
    await page.goto('/editor');
    await expect(page.getByText(/Couldn’t open this project’s script/)).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(2000);
    expect((await admin.from('scripts').select('id').eq('project_id', projectId)).data).toHaveLength(1);

    // With the connection back, a reload still finds the one script there is.
    await page.unrouteAll();
    await page.reload();
    await expect(page.getByRole('textbox', { name: 'Script', exact: true })).toHaveCount(1, { timeout: 30_000 });
    await page.waitForTimeout(2000);
    expect((await admin.from('scripts').select('id').eq('project_id', projectId)).data).toHaveLength(1);
  });
});
