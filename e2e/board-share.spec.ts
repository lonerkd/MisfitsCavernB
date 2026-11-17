import { chromium } from '@playwright/test';
import { test, expect, stackEnabled, stackSkipReason, type QaUser } from './support/stack';

// A mood board's share link, end to end: the owner makes the link in the Studio, a stranger (no account, a fresh
// browser) opens the board from it and sees the cards, and when the owner stops sharing the same address shows
// "isn't shared". Real data, no mocks. Opt-in: E2E_LOCAL_STACK=1 (or the staging variables; see e2e/support/stack.ts).
test.describe('Sharing a mood board (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let me: QaUser;
  let projectId = '';
  let boardId = '';

  test.beforeAll(async ({ stack }) => {
    me = await stack.createUser({ label: 'boardshare' });
    projectId = (await stack.createProject(me, { title: `Board share ${stack.tag}`, status: 'pre-production' })).id;
    boardId = ((await stack.insert('mood_boards', { project_id: projectId, name: 'Maya: look', template: 'free', created_by: me.id })) as { id: string }).id;
    await stack.insert('mood_board_items', { board_id: boardId, project_id: projectId, note: 'Wet hair, always', x: 10, y: 10, w: 30, z: 0, created_by: me.id });
  });

  test('make a link, a stranger reads the board, stopping closes it', async ({ stack }) => {
    test.setTimeout(150_000);
    const browser = await chromium.launch({ executablePath: process.env.MC_LOCAL_CHROMIUM });
    const owner = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const page = await owner.newPage();
    try {
      await stack.signIn(page, me);
      await page.goto('/studio?tab=library&view=boards');
      const picker = page.getByLabel('Active project');
      await picker.waitFor();
      if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
      await page.goto('/studio?tab=library&view=boards');

      await page.getByRole('button', { name: 'Share link' }).click();
      await page.getByRole('button', { name: 'Make a link' }).click();
      const link = page.getByLabel('Board link');
      await expect(link).toBeVisible({ timeout: 15_000 });
      const url = await link.inputValue();
      expect(url).toMatch(/\/b\/[0-9a-f]{64}$/);
      const path = new URL(url).pathname;

      // A stranger: a fresh browser with no session.
      const stranger = await browser.newContext({ viewport: { width: 1200, height: 900 } });
      const visitor = await stranger.newPage();
      await visitor.goto(path);
      await expect(visitor.getByRole('heading', { name: 'Maya: look' })).toBeVisible({ timeout: 30_000 });
      await expect(visitor.getByText('Wet hair, always')).toBeVisible();

      // Stop sharing: the same address no longer shows the board.
      await page.getByRole('button', { name: 'Stop sharing' }).click();
      await page.getByRole('button', { name: /stop sharing|confirm|yes/i }).last().click();
      await expect(page.getByRole('button', { name: 'Make a link' })).toBeVisible({ timeout: 15_000 });
      await visitor.goto(path);
      await expect(visitor.getByText(/isn.t shared, or the link is wrong/)).toBeVisible({ timeout: 30_000 });
      await expect(visitor.getByText('Wet hair, always')).toHaveCount(0);
      await stranger.close();
    } finally { await owner.close(); await browser.close(); }
  });
});
