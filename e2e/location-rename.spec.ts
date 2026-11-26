import { chromium } from '@playwright/test';
import { test, expect, stackEnabled, stackSkipReason, type QaUser } from './support/stack';

// The film graph, step 3 (BACKLOG 3.18): the Studio reads a scene's place through its link, so renaming a
// location renames it for the scenes that point at it, and the old name does not come back as a second row.
// Real data, no mocks. Opt-in: E2E_LOCAL_STACK=1 (or the staging variables; see e2e/support/stack.ts).
const SCRIPT = 'INT. KITCHEN - DAY\n\nMAYA stirs a pot.\n\nINT. GARAGE - NIGHT\n\nBEN sorts tools.\n';

test.describe('Renaming a location (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let me: QaUser;
  let projectId = '';

  test.beforeAll(async ({ stack }) => {
    me = await stack.createUser({ label: 'place' });
    projectId = (await stack.createProject(me, { title: `Place ${stack.tag}`, status: 'pre-production' })).id;
    await stack.insert('scripts', { title: 'Kitchen', content: SCRIPT, project_id: projectId, created_by: me.id, last_edited_by: me.id });
  });

  test('a renamed place keeps its scenes and shows once, after a reload too', async ({ stack }) => {
    const admin = stack.admin;
    test.setTimeout(120_000);
    const browser = await chromium.launch({ executablePath: process.env.MC_LOCAL_CHROMIUM });
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const page = await ctx.newPage();
    try {
      await stack.signIn(page, me);
      await page.goto('/studio?tab=production&view=locations');
      const picker = page.getByLabel('Active project');
      await picker.waitFor();
      if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);

      await page.getByRole('button', { name: /KITCHEN/ }).click();
      const name = page.getByLabel(/Name \(every scene at this place follows\)/);
      await name.fill('Diner');
      await name.blur();

      await expect(page.getByRole('button', { name: /^DINER/ })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole('button', { name: /KITCHEN/ })).toHaveCount(0);
      const rows = (await admin.from('project_locations').select('name').eq('project_id', projectId)).data!.map((r) => r.name).sort();
      expect(rows).toEqual(['DINER', 'GARAGE']);
      // The scene still points at the same place, whatever its heading says.
      const scene = (await admin.from('scenes').select('location, project_locations(name)').eq('project_id', projectId).eq('location', 'KITCHEN').single()).data as unknown as { project_locations: { name: string } };
      expect(scene.project_locations.name).toBe('DINER');

      await page.reload();
      await expect(page.getByRole('button', { name: /^DINER/ })).toBeVisible({ timeout: 30_000 });
      await expect(page.getByRole('button', { name: /KITCHEN/ })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /^DINER/ })).toContainText('1 scene');
    } finally { await ctx.close(); await browser.close(); }
  });
});
