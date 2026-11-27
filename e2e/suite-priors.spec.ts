import { randomUUID } from 'node:crypto';
import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';
import type { SupabaseClient } from '@supabase/supabase-js';

// The deep brain, the suite's context as priors (BACKLOG 3.21): what the rest of the suite knows about a project is evidence
// for the reader. Here the breakdown names a prop and the character bible holds a character a person wrote up; the script
// sets the prop on a line of its own over a line of action, which alone reads as a speaker. The editor's Script tab says what
// the project told the reader and what it did, and a person's "It's a character" there stands over the breakdown. Opt-in:
// E2E_LOCAL_STACK=1.
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const TEXT = ['INT. MOTEL ROOM - NIGHT', '', 'Maya enters, dripping.', '', 'THE BRIEFCASE', 'It sits open on the bed, empty.', '', 'MAYA', 'Where is it?', ''].join('\n');

test.describe('The suite as priors (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);
  let admin: SupabaseClient;
  const me = { id: '', email: `sp.${TAG}@journey.test` };
  let projectId = '';
  let scriptId = '';

  test.beforeAll(async ({ stack }) => {
    admin = stack.admin;
    me.id = (await stack.createUser({ email: me.email, password: PASSWORD, username: `sp${TAG}` })).id;
    projectId = (await admin.from('projects').insert({ title: `Priors ${TAG}`, creator_id: me.id }).select('id').single()).data!.id;
    scriptId = (await admin.from('scripts').insert({ title: 'Motel', content: TEXT, project_id: projectId, created_by: me.id, last_edited_by: me.id }).select('id').single()).data!.id;
    const props = (await admin.from('breakdown_categories').select('id').eq('project_id', projectId).eq('key', 'props').single()).data!.id;
    const el = await admin.from('breakdown_elements').insert({ project_id: projectId, category_id: props, name: 'Briefcase', created_by: me.id });
    if (el.error) throw new Error(el.error.message);
    const bible = await admin.from('script_characters').insert({ script_id: scriptId, name: 'MAYA', description: 'A night nurse.' });
    if (bible.error) throw new Error(bible.error.message);
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('created_by', me.id);
    await admin.from('projects').delete().eq('id', projectId);
  });

  test('the Script tab says what the project told the reader, and a person settles a name there', async ({ page }) => {
    test.setTimeout(150_000);
    await signInAs(page, { email: me.email, password: PASSWORD });
    await page.goto('/studio');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);

    await page.goto(`/editor?script=${scriptId}`);
    await expect(page.getByRole('textbox', { name: 'Script', exact: true })).toHaveValue(TEXT, { timeout: 30_000 });
    await page.getByRole('button', { name: 'Script', exact: true }).click();
    await page.getByText('What the reader knows').click();
    const section = page.getByRole('region', { name: 'From the project' });
    await expect(section).toContainText('BRIEFCASE · Props in the breakdown, so not read as a speaker', { timeout: 30_000 });
    await expect(section).toContainText('MAYA · in the character bible');
    await expect(section).toContainText('Written as Screenplay');

    await section.getByRole('button', { name: /It’s a character/ }).click();
    await expect(page.getByText('BRIEFCASE is read as a character')).toBeVisible({ timeout: 15_000 });
    // The person's word stands over the breakdown: the panel says so, and the verdict is the project's.
    await expect(section).toContainText('BRIEFCASE: the breakdown lists it as a thing, but it is a character, and that stands', { timeout: 15_000 });
    const saved = await admin.from('reading_corrections').select('kind').eq('project_id', projectId).eq('name', 'BRIEFCASE').single();
    expect(saved.data?.kind).toBe('character');
  });
});
