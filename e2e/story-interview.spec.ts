import { test, expect, stackEnabled, stackSkipReason, type QaUser } from './support/stack';

// The story interview (BACKLOG 3.25), end to end: answer a question, reload and be
// resumed where the answers stop, finish, and land in the script with a skeleton that
// persists and is not doubled by a second apply. Opt-in: E2E_LOCAL_STACK=1.
const BASE = 'INT. KITCHEN - NIGHT\n\nMAYA\nStill up.\n';
const ANSWERS = ['A keeper loses the sea', 'Keep the light on', 'Let someone in', 'The harbour board', 'Duty hides', 'Bittersweet'];

test.describe('Story interview (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let me: QaUser;
  let projectId = '';
  let scriptId = '';

  test.beforeAll(async ({ stack }) => {
    me = await stack.createUser({ label: 'interview' });
    projectId = (await stack.createProject(me, { title: `Interview ${stack.tag}` })).id;
    scriptId = (await stack.insert('scripts', { title: 'Keeper', content: BASE, project_id: projectId, created_by: me.id, last_edited_by: me.id })).id;
  });

  test('answers resume after a reload, and the skeleton lands once', async ({ page, stack }) => {
    test.setTimeout(180_000);
    await stack.signIn(page, me);
    await page.goto('/studio');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);

    const openInterview = async () => {
      await page.goto(`/editor?script=${scriptId}`);
      await expect(page.getByRole('textbox', { name: 'Script', exact: true })).toHaveValue(BASE, { timeout: 30_000 });
      await page.getByRole('button', { name: 'Outline' }).first().click();
      await page.getByRole('button', { name: 'Interview' }).click();
    };

    await openInterview();
    await expect(page.getByText('Question 1 of 7')).toBeVisible();
    await expect(page.getByText(/Why we ask/)).toBeVisible();

    for (const a of ANSWERS) {
      await page.getByRole('textbox').last().fill(a);
      await page.getByRole('button', { name: 'Next' }).click();
    }
    await expect(page.getByText('Question 7 of 7')).toBeVisible();
    await expect(page.getByText('Saved')).toBeVisible({ timeout: 10_000 });

    // A reload resumes at the question that is still open.
    await openInterview();
    await expect(page.getByText('Question 7 of 7')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('6 of 7 answered')).toBeVisible();

    await page.getByRole('textbox').last().fill('The vote\nThe storm\nThe boat he cannot reach\nThe light goes out\nHe is not alone\nThe dark');
    await expect(page.getByText('Saved')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Review', exact: true }).click();
    await expect(page.getByRole('button', { name: /Add 6 scenes to the script/ })).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /Add 6 scenes to the script/ }).click();

    const script = page.getByRole('textbox', { name: 'Script', exact: true });
    await page.getByRole('button', { name: 'Write', exact: true }).first().click();
    await expect(script).toHaveValue(/INT\. TBD - DAY/);
    const value = await script.inputValue();
    expect(value.startsWith(BASE.trimEnd())).toBe(true);
    expect(value.match(/INT\. TBD - DAY/g)).toHaveLength(6);

    // Reopened, the finished interview opens on its review; applying again adds nothing.
    await page.getByRole('button', { name: 'Outline' }).first().click();
    await page.getByRole('button', { name: 'Interview' }).click();
    await page.getByRole('button', { name: /Add 6 scenes to the script/ }).click();
    await expect(page.getByText('already in the script')).toBeVisible();
    await page.getByRole('button', { name: 'Write', exact: true }).first().click();
    expect((await script.inputValue()).match(/INT. TBD - DAY/g)).toHaveLength(6);
  });
});
