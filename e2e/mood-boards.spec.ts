import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, chromium } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Mood boards (Studio > Library > Mood boards): a board is an object of its own, its cards are saved where they sit.
// Real data, no mocks. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

test.describe('Mood boards (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  let userId = '';
  let projectId = '';
  const email = `boards.${TAG}@journey.test`;

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    userId = (await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { username: `boards${TAG}` } })).data.user!.id;
    projectId = (await admin.from('projects').insert({ title: `Boards ${TAG}`, creator_id: userId, status: 'pre-production' }).select('id').single()).data!.id;
    await admin.from('media').insert({ project_id: projectId, kind: 'link', title: 'Rain on glass', external_url: 'https://example.com/rain', created_by: userId });
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('projects').delete().eq('id', projectId);
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  test('make a board, add a reference and a note, arrange them, and it is all still there after a reload', async () => {
    test.setTimeout(150_000);
    const browser = await chromium.launch({ executablePath: process.env.MC_LOCAL_CHROMIUM });
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const page = await ctx.newPage();
    try {
      await page.goto('/auth');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', PASSWORD);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
      await page.goto('/studio?tab=library&view=boards');
      const picker = page.getByLabel('Active project');
      await picker.waitFor();
      if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
      await page.goto('/studio?tab=library&view=boards');

      // A character board starts with its note cards.
      await page.getByLabel('New board name').fill('Maya: look');
      await page.getByLabel('Board type').selectOption('character');
      await page.getByRole('button', { name: 'Create board' }).click();
      const board = page.getByRole('listbox', { name: 'Board: Maya: look' });
      await expect(board.getByRole('option')).toHaveCount(3, { timeout: 15_000 });
      await expect(board.getByText('Silhouette & wardrobe')).toBeVisible();

      // A library reference goes onto it, and so does a note of our own.
      await page.getByRole('button', { name: 'Add from library' }).click();
      await page.getByRole('button', { name: /Rain on glass/ }).click();
      await page.getByRole('button', { name: 'Add to board' }).click();
      await expect(board.getByRole('option', { name: /Rain on glass/ })).toBeVisible({ timeout: 15_000 });
      await page.getByRole('button', { name: 'Add note' }).click();
      await page.getByLabel('Note text').fill('Wet hair, always');
      await page.getByRole('button', { name: 'Add', exact: true }).click();
      await expect(board.getByText('Wet hair, always')).toBeVisible();
      await expect(board.getByRole('option')).toHaveCount(5);

      // Drag a card: the new place is saved.
      const card = board.getByRole('option', { name: /Rain on glass/ });
      const boxBefore = (await card.boundingBox())!;
      const canvas = (await board.boundingBox())!;
      await page.mouse.move(boxBefore.x + boxBefore.width / 2, boxBefore.y + 10);
      await page.mouse.down();
      await page.mouse.move(boxBefore.x + boxBefore.width / 2 + canvas.width * 0.2, boxBefore.y + 10 + canvas.height * 0.2, { steps: 8 });
      await page.mouse.up();
      await expect.poll(async () => (await admin.from('mood_board_items').select('x, y').eq('project_id', projectId).not('media_id', 'is', null).single()).data?.x ?? 0, { timeout: 15_000 }).toBeGreaterThan(20);

      // The keyboard moves a card too.
      await card.focus();
      const xBefore = (await admin.from('mood_board_items').select('x').eq('project_id', projectId).not('media_id', 'is', null).single()).data!.x as number;
      await page.keyboard.press('ArrowRight');
      await expect.poll(async () => (await admin.from('mood_board_items').select('x').eq('project_id', projectId).not('media_id', 'is', null).single()).data!.x, { timeout: 15_000 }).toBeCloseTo(xBefore + 1, 0);

      // Edit a note by keyboard.
      await board.getByRole('option', { name: /Note: Wet hair, always/ }).focus();
      await page.keyboard.press('Enter');
      await page.getByLabel('Edit note').fill('Wet hair, always. Never dry.');
      await page.getByLabel('Edit note').blur();
      await expect.poll(async () => (await admin.from('mood_board_items').select('id').eq('project_id', projectId).eq('note', 'Wet hair, always. Never dry.')).data?.length ?? 0, { timeout: 15_000 }).toBe(1);

      // After a reload it is all still there.
      await page.reload();
      const again = page.getByRole('listbox', { name: 'Board: Maya: look' });
      await expect(again.getByRole('option')).toHaveCount(5, { timeout: 30_000 });
      await expect(again.getByText('Wet hair, always. Never dry.')).toBeVisible();

      // Deleting the board takes its cards with it, and leaves the library alone.
      await page.getByRole('button', { name: 'Delete board' }).click();
      await page.getByRole('button', { name: /delete|confirm|yes/i }).last().click();
      await expect(page.getByText('No boards yet')).toBeVisible({ timeout: 15_000 });
      expect((await admin.from('mood_board_items').select('id').eq('project_id', projectId)).data).toHaveLength(0);
      expect((await admin.from('media').select('id').eq('project_id', projectId)).data).toHaveLength(1);
    } finally { await ctx.close(); await browser.close(); }
  });
});
