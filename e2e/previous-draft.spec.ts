import { randomUUID } from 'node:crypto';
import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';
import type { SupabaseClient } from '@supabase/supabase-js';

// The deep brain, rung B7(b) (BACKLOG 3.22): a script's latest locked revision is its previous draft, and a line the earlier draft read with
// confidence is read the same way again. Here the script is pasted with no blank lines (where a plain sentence under a speech is ambiguous)
// and its locked revision kept its blank lines; the editor's Script tab says how many lines it read as the previous draft did. Opt-in:
// E2E_LOCAL_STACK=1.
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const ROWS = [
  'INT. KITCHEN - DAY', 'MAYA', 'We should go.', 'She waits by the door.', 'LEO', 'Not yet.', 'He pours more coffee.', 'MAYA', 'Now.', 'She checks the window.',
  'LEO', 'Fine.', 'The kettle clicks off.', 'MAYA', 'Come on.', 'He follows her out.', 'INT. HALL - NIGHT', 'LEO', 'Quiet.', 'Their steps echo.',
];
const PASTED = ROWS.join('\n');
const KEPT = ['INT. KITCHEN - DAY', '', 'MAYA', 'We should go.', '', 'She waits by the door.', '', 'LEO', 'Not yet.', '', 'He pours more coffee.', '', 'MAYA', 'Now.', '', 'She checks the window.', '', 'LEO', 'Fine.', '', 'The kettle clicks off.', '', 'MAYA', 'Come on.', '', 'He follows her out.', '', 'INT. HALL - NIGHT', '', 'LEO', 'Quiet.', '', 'Their steps echo.', ''].join('\n');

test.describe('The previous draft as evidence (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);
  let admin: SupabaseClient;
  const me = { id: '', email: `pd.${TAG}@journey.test` };
  let projectId = '';
  let withDraft = '';
  let withoutDraft = '';

  test.beforeAll(async ({ stack }) => {
    admin = stack.admin;
    me.id = (await stack.createUser({ email: me.email, password: PASSWORD, username: `pd${TAG}` })).id;
    projectId = (await admin.from('projects').insert({ title: `Drafts ${TAG}`, creator_id: me.id }).select('id').single()).data!.id;
    const script = async (title: string) => (await admin.from('scripts').insert({ title, content: PASTED, project_id: projectId, created_by: me.id, last_edited_by: me.id }).select('id').single()).data!.id as string;
    withDraft = await script('With a previous draft');
    withoutDraft = await script('Without one');
    const { error } = await admin.from('script_revisions').insert({ script_id: withDraft, color_index: 0, label: 'Blue Revision', snapshot: KEPT, created_by: me.id });
    if (error) throw new Error(error.message);
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('created_by', me.id);
    await admin.from('projects').delete().eq('id', projectId);
  });

  test('the Script tab says how many lines were read as the previous draft read them, and says nothing without one', async ({ page }) => {
    test.setTimeout(150_000);
    await signInAs(page, { email: me.email, password: PASSWORD });
    await page.goto('/studio');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);

    await page.goto(`/editor?script=${withDraft}`);
    await expect(page.getByRole('textbox', { name: 'Script', exact: true })).toHaveValue(PASTED, { timeout: 30_000 });
    await page.getByRole('button', { name: 'Script', exact: true }).click();
    await page.getByText('What the reader knows').click();
    const section = page.getByRole('region', { name: 'Previous draft' });
    await expect(section).toContainText('Lines read the same way as in the previous draft', { timeout: 30_000 });
    // Every line of the earlier draft was read with confidence and is still here, so most of the 20 lines carry over.
    const same = Number((await section.getByText(/^\d+$/).first().textContent()) ?? 0);
    expect(same).toBeGreaterThanOrEqual(15);

    await page.goto(`/editor?script=${withoutDraft}`);
    await expect(page.getByRole('textbox', { name: 'Script', exact: true })).toHaveValue(PASTED, { timeout: 30_000 });
    await page.getByRole('button', { name: 'Script', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Previous draft' })).toHaveCount(0);
  });
});
