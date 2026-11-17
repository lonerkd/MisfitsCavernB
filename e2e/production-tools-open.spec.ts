import { test, expect, stackEnabled, stackSkipReason, type QaUser } from './support/stack';
import { PRODUCTION_VIEWS } from '../lib/os/progress';

// Every Production tool opens on a real project without an error, a crash screen or a console error: the floor under the
// practitioner runs (BACKLOG 3.51), which can only be done by people. Opt-in: E2E_LOCAL_STACK=1.
const SCRIPT = ['INT. KITCHEN - DAY', '', 'MAYA sets a cup down.', '', 'EXT. HARBOUR - NIGHT', '', 'MAYA fires the gun.', ''].join('\n');

test.describe('Every Production tool opens (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let me: QaUser;
  let projectId = '';
  let scriptId = '';

  test.beforeAll(async ({ stack }) => {
    me = await stack.createUser({ label: 'toolsopen' });
    projectId = (await stack.createProject(me, { title: `ToolsOpen ${stack.tag}` })).id;
    scriptId = (await stack.insert('scripts', { title: 'Harbour', content: SCRIPT, project_id: projectId, created_by: me.id, last_edited_by: me.id })).id;
  });

  test('all tools render for the owner', async ({ page, stack }) => {
    test.setTimeout(600_000);
    await stack.signIn(page, me);
    await page.goto('/studio');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
    await page.goto(`/editor?script=${scriptId}`);
    await expect(page.getByRole('textbox', { name: 'Script', exact: true })).toHaveValue(SCRIPT, { timeout: 30_000 });

    const problems: string[] = [];
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
    for (const view of PRODUCTION_VIEWS) {
      const before = problems.length;
      await page.goto(`/studio?tab=production&view=${view}`);
      await expect(page.getByRole('heading', { level: 2 }).first().or(page.getByRole('heading', { level: 1 }).first())).toBeVisible({ timeout: 30_000 });
      // A tool may be locked until its phase, but never broken: no crash screen, no uncaught error.
      const crashed = await page.getByText(/something went wrong|application error/i).count();
      if (crashed) problems.push(`${view}: a crash screen`);
      await page.waitForTimeout(400);
      if (problems.length > before) problems.push(`(in ${view})`);
    }
    expect(problems, problems.join('\n')).toEqual([]);
  });
});
