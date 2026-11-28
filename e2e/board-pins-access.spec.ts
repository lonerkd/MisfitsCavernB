import { chromium } from '@playwright/test';
import { test, expect, stackEnabled, stackSkipReason, type QaUser } from './support/stack';

// Mood boards, the slice of 2026-11-27, end to end with a real browser and the local stack: pin a note to a card,
// choose who may edit a board, share the board with an expiry, read it as a stranger (pins included), and watch an
// expired link show nothing. Real data, no mocks. Opt-in: E2E_LOCAL_STACK=1 (see e2e/support/stack.ts).
test.describe('Mood board pins, access and expiry (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let me: QaUser;
  let projectId = '';
  let boardId = '';

  test.beforeAll(async ({ stack }) => {
    me = await stack.createUser({ label: 'boardpins' });
    projectId = (await stack.createProject(me, { title: `Board pins ${stack.tag}`, status: 'pre-production' })).id;
    boardId = ((await stack.insert('mood_boards', { project_id: projectId, name: 'Harbour: look', template: 'free', created_by: me.id })) as { id: string }).id;
    await stack.insert('mood_board_items', { board_id: boardId, project_id: projectId, note: 'Salt on the glass', x: 10, y: 10, w: 40, z: 0, created_by: me.id });
  });

  test('pin a note, set access, share with an expiry, a stranger reads it, then it expires', async ({ stack }) => {
    test.setTimeout(180_000);
    const browser = await chromium.launch({ executablePath: process.env.MC_LOCAL_CHROMIUM });
    const owner = await browser.newContext({ viewport: { width: 1400, height: 1100 } });
    const page = await owner.newPage();
    try {
      await stack.signIn(page, me);
      await page.goto('/studio?tab=library&view=boards');
      const picker = page.getByLabel('Active project');
      await picker.waitFor();
      if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
      await page.goto('/studio?tab=library&view=boards');

      // Pin a note to the card.
      await page.getByRole('button', { name: 'Pin a note' }).click();
      await page.getByRole('option', { name: /Salt on the glass/ }).click({ position: { x: 40, y: 20 } });
      await page.getByLabel('Pin text').fill('Keep this grain');
      await page.getByRole('button', { name: 'Pin', exact: true }).click();
      await expect(page.getByRole('button', { name: /Pin 1: Keep this grain/ })).toBeVisible({ timeout: 15_000 });
      await page.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/board-pin.png` : undefined });

      // Keys pressed on a pin belong to the pin: Backspace on it must not delete the card it sits on (or the pin).
      await page.getByRole('button', { name: /Pin 1: Keep this grain/ }).focus();
      await page.keyboard.press('Backspace');
      await page.waitForTimeout(800);
      expect((await stack.admin.from('mood_board_items').select('id').eq('board_id', boardId)).data?.length).toBe(1);
      await expect(page.getByRole('button', { name: /Pin 1: Keep this grain/ })).toBeVisible();

      // Who may edit: "Everyone sees, leads edit" is saved on the board.
      await page.getByLabel('Who can edit this board').selectOption('view');
      await expect.poll(async () => (await stack.admin.from('mood_boards').select('access').eq('id', boardId).single()).data?.access, { timeout: 15_000 }).toBe('view');

      // Share for one day.
      await page.getByRole('button', { name: 'Share link' }).click();
      await page.getByLabel('When the new link expires').selectOption({ label: 'Expires in 1 day' });
      await page.getByRole('button', { name: 'Make a link' }).click();
      const link = page.getByLabel('Board link');
      await expect(link).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(/This link stops working on/)).toBeVisible();
      // A new address keeps the old link's expiry: rotating must not make a link that never ends.
      const oldLink = await link.inputValue();
      const before = (await stack.admin.from('mood_board_shares').select('expires_at').eq('board_id', boardId).single()).data?.expires_at;
      expect(before).toBeTruthy();
      await page.getByRole('button', { name: 'New link' }).click();
      await page.getByRole('button', { name: 'CONFIRM' }).click();
      await expect.poll(async () => (await stack.admin.from('mood_board_shares').select('expires_at').eq('board_id', boardId).single()).data?.expires_at, { timeout: 15_000 }).toBe(before);
      await expect(link).not.toHaveValue(oldLink);
      const path = new URL(await link.inputValue()).pathname;
      await page.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/board-share-expiry.png` : undefined });

      const stranger = await browser.newContext({ viewport: { width: 1200, height: 1000 } });
      const visitor = await stranger.newPage();
      await visitor.goto(path);
      await expect(visitor.getByRole('heading', { name: 'Harbour: look' })).toBeVisible({ timeout: 30_000 });
      await expect(visitor.getByText('Keep this grain')).toBeVisible();
      await visitor.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/board-shared-pins.png` : undefined });

      // The owner lets the link end now: the same address then shows nothing.
      await stack.admin.from('mood_board_shares').update({ expires_at: new Date(Date.now() - 60_000).toISOString() }).eq('board_id', boardId);
      await visitor.goto(path);
      await expect(visitor.getByText(/the link has expired/)).toBeVisible({ timeout: 30_000 });
      await expect(visitor.getByText('Keep this grain')).toHaveCount(0);

      // Clearing the expiry from the Studio revives it.
      await page.reload();
      await page.getByRole('button', { name: 'Share link' }).click();
      await expect(page.getByText(/This link has expired/)).toBeVisible({ timeout: 15_000 });
      await page.getByLabel('Change when the link expires').selectOption('never');
      await expect(page.getByText('This link does not expire.')).toBeVisible({ timeout: 15_000 });
      await visitor.goto(path);
      await expect(visitor.getByRole('heading', { name: 'Harbour: look' })).toBeVisible({ timeout: 30_000 });
      await stranger.close();
    } finally { await owner.close(); await browser.close(); }
  });
});
