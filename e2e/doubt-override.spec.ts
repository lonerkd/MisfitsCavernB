import { randomUUID } from 'node:crypto';
import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';
import type { SupabaseClient } from '@supabase/supabase-js';

// The deep brain, B9: a doubtful line is settled in one tap, in this script ("Read as action" is the same line override as Force type),
// remembered across a reload, and the script's own text is never touched. Opt-in: E2E_LOCAL_STACK=1.
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
// BEN is a cue with a line under it that reads like action ("She smiles"): the reader is not sure what BEN's block is.
const SCRIPT = 'INT. ROOM - DAY\n\nMaya waits.\n\nMAYA\nHello.\nShe smiles\nand leaves\n\nBEN\nOK.\n';

test.describe.serial('Settling a doubtful line (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);
  let admin: SupabaseClient;
  const me = { id: '', email: `do.${TAG}@journey.test` };
  let projectId = '';
  let scriptId = '';

  test.beforeAll(async ({ stack }) => {
    admin = stack.admin;
    me.id = (await stack.createUser({ email: me.email, password: PASSWORD, username: `do${TAG}` })).id;
    projectId = (await admin.from('projects').insert({ title: `Doubts ${TAG}`, creator_id: me.id }).select('id').single()).data!.id;
    scriptId = (await admin.from('scripts').insert({ title: 'Doubts', content: SCRIPT, project_id: projectId, created_by: me.id, last_edited_by: me.id }).select('id').single()).data!.id;
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('created_by', me.id);
    await admin.from('projects').delete().eq('id', projectId);
  });

  test('Read as action saves a line override, hides the doubt, survives a reload, and leaves the text alone', async ({ page }) => {
    test.setTimeout(150_000);
    await signInAs(page, { email: me.email, password: PASSWORD });
    await page.goto('/studio');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
    await page.goto(`/editor?script=${scriptId}`);
    const script = page.getByRole('textbox', { name: 'Script', exact: true });
    await expect(script).toHaveValue(SCRIPT, { timeout: 30_000 });

    await page.getByRole('button', { name: 'Script', exact: true }).click();
    const doubts = page.getByRole('region', { name: 'Doubtful reads' });
    await expect(doubts).toBeVisible({ timeout: 30_000 });
    const read = doubts.getByRole('button', { name: /Read as action/ });
    await expect(read).toHaveCount(1);
    await read.click();

    await expect(page.getByText(/is read as action/)).toBeVisible();
    const rows = (await admin.from('reading_line_overrides').select('line_index, forced_type').eq('script_id', scriptId)).data;
    expect(rows).toEqual([{ line_index: 9, forced_type: 'action' }]);
    await expect(script).toHaveValue(SCRIPT);

    await page.reload();
    await expect(script).toHaveValue(SCRIPT, { timeout: 30_000 });
    await page.getByRole('button', { name: 'Script', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Doubtful reads' }).getByRole('button', { name: /Read as action/ })).toHaveCount(0, { timeout: 30_000 });

    // The override remembers its line's text, so it follows the line when lines are added above (it used to be by number alone).
    expect((await admin.from('reading_line_overrides').select('line_text').eq('script_id', scriptId)).data).toEqual([{ line_text: 'BEN' }]);
    await admin.from('scripts').update({ content: `A new opening line\n\n${SCRIPT}` }).eq('id', scriptId);
    await page.reload();
    await expect(script).toHaveValue(`A new opening line\n\n${SCRIPT}`, { timeout: 30_000 });
    await page.getByRole('button', { name: 'Script', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Doubtful reads' }).getByRole('button', { name: /Read as action/ })).toHaveCount(0, { timeout: 30_000 });
  });
});
