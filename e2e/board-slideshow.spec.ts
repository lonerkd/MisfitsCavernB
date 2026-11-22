import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { chromium, type Page } from '@playwright/test';
import { test, expect, stackEnabled, stackSkipReason, type QaUser } from './support/stack';

// The slides fade in over a quarter of a second; axe measures contrast on what is on screen, so scan only once the slide has finished fading in (other animations on the page, such as a spinner, never end).
const settled = (page: Page) => expect.poll(() => page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && String((a as CSSAnimation).animationName ?? '').includes('slideIn')).length)).toBe(0);

// Mood boards: search within a board, and the slideshow, in the Studio (Sam) and on the shared page (a signed-out
// visitor). Real data, no mocks. Opt-in: E2E_LOCAL_STACK=1 (see e2e/support/stack.ts).
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const SHOTS = process.env.BOARD_SHOTS || '';

// A real picture (a 640 x 400 gradient), so the slideshow and the cards are looked at with something in them.
function gradientPng(r: number, g: number, b: number): Buffer {
  const w = 640, h = 400;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    const row = y * (w * 3 + 1);
    for (let x = 0; x < w; x++) { const k = 0.35 + 0.65 * ((x + y) / (w + h)); raw[row + 1 + x * 3] = r * k; raw[row + 2 + x * 3] = g * k; raw[row + 3 + x * 3] = b * k; }
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf: Buffer) => { let c = 0xffffffff; for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type: string, data: Buffer) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const body = Buffer.concat([Buffer.from(type), data]); const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body)); return Buffer.concat([len, body, sum]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const COLOURS: Array<[number, number, number]> = [[40, 90, 160], [90, 130, 150], [230, 80, 140]];

async function axeViolations(page: Page, selector: string): Promise<string[]> {
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async ({ selector, tags }) => {
    const r = await (window as any).axe.run(document.querySelector(selector), { runOnly: { type: 'tag', values: tags }, resultTypes: ['violations'] });
    return r.violations.map((v: any) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.slice(0, 3).map((n: any) => `${n.target.join(' ')} ${n.html.slice(0, 140)}`).join(' | ')}`);
  }, { selector, tags: TAGS }) as Promise<string[]>;
}

test.describe('Board search and slideshow (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let me: QaUser;
  let projectId = '';
  let boardId = '';
  let token = '';
  const paths: string[] = [];

  test.beforeAll(async ({ stack }) => {
    me = await stack.createUser({ label: 'slides' });
    projectId = (await stack.createProject(me, { title: `Board slides ${stack.tag}`, status: 'pre-production' })).id;
    boardId = ((await stack.insert('mood_boards', { project_id: projectId, name: 'Look book', template: 'free', created_by: me.id })) as { id: string }).id;

    const titles = ['Harbour at dusk', 'Rain on glass', 'Neon sign'];
    for (const [n, title] of titles.entries()) {
      const mediaId = randomUUID();
      const storagePath = `${projectId}/${mediaId}/still.png`;
      const up = await stack.admin.storage.from('project-media').upload(storagePath, gradientPng(...COLOURS[n]), { contentType: 'image/png' });
      expect(up.error).toBeNull();
      paths.push(storagePath);
      await stack.insert('media', { id: mediaId, project_id: projectId, kind: 'image', title, storage_path: storagePath, mime_type: 'image/png', notes: n === 2 ? 'By Ana Pérez · via Openverse' : null, created_by: me.id });
      await stack.insert('mood_board_items', { board_id: boardId, project_id: projectId, media_id: mediaId, x: 5 + n * 30, y: 8, w: 24, z: n, created_by: me.id });
    }
    await stack.insert('mood_board_items', { board_id: boardId, project_id: projectId, note: 'Wet hair, always', x: 5, y: 60, w: 24, z: 3, created_by: me.id });
    await stack.insert('mood_board_items', { board_id: boardId, project_id: projectId, note: 'Rain never stops in act two', x: 35, y: 60, w: 24, z: 4, created_by: me.id });
    token = ((await stack.insert('mood_board_shares', { board_id: boardId, project_id: projectId, created_by: me.id })) as unknown as { token: string }).token;
    stack.onCleanup('board images', async () => { await stack.admin.storage.from('project-media').remove(paths); });
  });

  test('search narrows and highlights; the slideshow opens, moves and closes; a visitor can run it on the shared page', async () => {
    test.setTimeout(180_000);
    const browser = await chromium.launch({ executablePath: process.env.MC_LOCAL_CHROMIUM });
    const owner = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const page = await owner.newPage();
    try {
      const { signInAs } = await import('./support/stack');
      await signInAs(page, me);
      await page.goto('/studio?tab=library&view=boards');
      const picker = page.getByLabel('Active project');
      await picker.waitFor();
      if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
      await page.goto('/studio?tab=library&view=boards');

      const board = page.getByRole('listbox', { name: 'Board: Look book' });
      await expect(board.getByRole('option')).toHaveCount(5, { timeout: 20_000 });
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/board-1400.png` });

      // --- Search -----------------------------------------------------------------------------------------------
      const search = page.getByRole('searchbox', { name: 'Search this board' });
      await board.getByRole('option').first().focus();
      await page.keyboard.press('/');
      await expect(search).toBeFocused();

      await search.fill('rain');
      await expect(page.getByRole('status').filter({ hasText: '2 matches' })).toBeVisible();
      await expect(board.getByRole('option')).toHaveCount(2);
      await expect(board.locator('mark').first()).toHaveText(/rain/i);
      await expect(board.getByText('Harbour at dusk')).toBeHidden();

      await page.keyboard.press('Enter');
      await expect(page.getByRole('status').filter({ hasText: '1 of 2 matches' })).toBeVisible();
      await expect(board.getByRole('option', { name: /Rain on glass/ })).toBeFocused();
      await page.getByRole('button', { name: 'Next match' }).click();
      await expect(page.getByRole('status').filter({ hasText: '2 of 2 matches' })).toBeVisible();
      await expect(board.getByRole('option', { name: /Rain never stops/ })).toBeFocused();
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/board-search-1400.png` });
      expect(await axeViolations(page, '[role=search]')).toEqual([]);

      // A credit kept in the notes is found, and says where it matched.
      await search.fill('perez');
      await expect(board.getByRole('option')).toHaveCount(1);
      await expect(board.getByRole('option', { name: /Neon sign/ })).toBeVisible();
      await expect(board.locator('mark', { hasText: /pérez/i })).toBeVisible();

      await search.fill('zzzz');
      await expect(board.getByText(/Nothing on this board matches/)).toBeVisible();
      await expect(board.getByRole('option')).toHaveCount(0);
      await page.getByRole('button', { name: 'Clear search' }).click();
      await expect(board.getByRole('option')).toHaveCount(5);
      await expect(search).toHaveValue('');

      // --- Slideshow --------------------------------------------------------------------------------------------
      const opener = page.getByRole('button', { name: 'Slideshow' });
      await opener.focus();
      await opener.click();
      const show = page.getByRole('dialog', { name: 'Slideshow: Look book' });
      await expect(show).toBeVisible();
      // It starts at the selected card (the last one the search stepped to)...
      await expect(show.getByText('5 of 5', { exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(show).toHaveCount(0);
      // ...or at the first when nothing is selected.
      const box = (await board.boundingBox())!;
      await board.click({ position: { x: box.width - 12, y: box.height - 12 } });
      await opener.click();
      await expect(show).toBeVisible();
      await expect(show.getByText('1 of 5', { exact: true })).toBeVisible();
      await expect(show.getByRole('img', { name: 'Harbour at dusk' })).toBeVisible();
      if (SHOTS) { await page.waitForTimeout(600); await page.screenshot({ path: `${SHOTS}/slideshow-1400.png` }); }
      await settled(page);
      expect(await axeViolations(page, '[role=dialog]')).toEqual([]);

      await page.keyboard.press('ArrowRight');
      await expect(show.getByText('2 of 5', { exact: true })).toBeVisible();
      await expect(show.getByRole('img', { name: 'Rain on glass' })).toBeVisible();
      await page.keyboard.press('ArrowLeft');
      await expect(show.getByText('1 of 5', { exact: true })).toBeVisible();
      await expect(show.getByRole('button', { name: 'Previous' })).toBeDisabled();
      await expect(show.getByRole('status')).toContainText('1 of 5: Harbour at dusk');

      // Nothing advances by itself until it is turned on; Space turns it on and off.
      await page.waitForTimeout(1200);
      await expect(show.getByText('1 of 5', { exact: true })).toBeVisible();
      await show.getByRole('button', { name: 'Next' }).focus();
      await page.keyboard.press('Tab'); // wraps inside the presenter, never out of it
      expect(await page.evaluate(() => !!document.activeElement?.closest('[role=dialog]'))).toBe(true);
      await show.getByLabel('Seconds per item').selectOption('3');
      await show.getByRole('button', { name: 'Play' }).click();
      await expect(show.getByRole('button', { name: 'Pause' })).toBeVisible();
      await expect(show.getByText('2 of 5', { exact: true })).toBeVisible({ timeout: 6_000 });
      await show.getByRole('button', { name: 'Pause' }).click();
      await expect(show.getByRole('button', { name: 'Play' })).toBeVisible();

      // Notes are slides too.
      for (let i = 0; i < 2; i++) await page.keyboard.press('ArrowRight');
      await expect(show.getByTestId('slide').getByText('Wet hair, always')).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(show).toHaveCount(0);
      await expect(opener).toBeFocused();

      // A phone: the controls fit and nothing scrolls sideways.
      await page.setViewportSize({ width: 390, height: 780 });
      await opener.click();
      await expect(show).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      if (SHOTS) { await page.waitForTimeout(600); await page.screenshot({ path: `${SHOTS}/slideshow-390.png` }); }
      await page.keyboard.press('Escape');

      // --- The shared page: a stranger, no session ---------------------------------------------------------------
      const stranger = await browser.newContext({ viewport: { width: 1200, height: 900 } });
      const visitor = await stranger.newPage();
      await visitor.goto(`/b/${token}`);
      await expect(visitor.getByRole('heading', { name: 'Look book' })).toBeVisible({ timeout: 30_000 });
      const vOpener = visitor.getByRole('button', { name: 'Slideshow' });
      await vOpener.focus();
      await vOpener.click();
      const vShow = visitor.getByRole('dialog', { name: 'Slideshow: Look book' });
      await expect(vShow.getByText('1 of 5', { exact: true })).toBeVisible();
      await visitor.keyboard.press('ArrowRight');
      await expect(vShow.getByText('2 of 5', { exact: true })).toBeVisible();
      await expect(vShow.getByRole('img', { name: 'Rain on glass' })).toBeVisible();
      if (SHOTS) { await visitor.waitForTimeout(600); await visitor.screenshot({ path: `${SHOTS}/shared-slideshow-1200.png` }); }
      await settled(visitor);
      expect(await axeViolations(visitor, '[role=dialog]')).toEqual([]);
      await visitor.keyboard.press('Escape');
      await expect(vShow).toHaveCount(0);
      await expect(vOpener).toBeFocused();
      await stranger.close();
    } finally { await owner.close(); await browser.close(); }
  });
});
