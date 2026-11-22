import { randomUUID } from 'node:crypto';
import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';
import type { Page } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';

// The phone's "Everything" sheet and the editor's tool strip: the page actions sit clear of the Places tiles, a swipe down from
// the handle closes the sheet (a short drag does not), the page's own "New Project" band is a desk thing (the sheet carries it),
// and the strip's More button stays on screen with the keyboard up. Opt-in: E2E_LOCAL_STACK=1.
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };

async function fakeKeyboard(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __kb: number }).__kb = 0;
    Object.defineProperty(window, 'visualViewport', { configurable: true, get: () => ({ get height() { return window.innerHeight - (window as unknown as { __kb: number }).__kb; }, offsetTop: 0, addEventListener() {}, removeEventListener() {} }) });
    (window as unknown as { __setKb: (n: number) => void }).__setKb = (n) => { (window as unknown as { __kb: number }).__kb = n; window.dispatchEvent(new Event('resize')); };
  });
}

async function drag(page: Page, dy: number) {
  const box = (await page.getByTestId('sheet-drag').boundingBox())!;
  const x = box.x + box.width / 2, y = box.y + 12;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + dy / 2, { steps: 5 });
  await page.mouse.move(x, y + dy, { steps: 5 });
  await page.mouse.up();
}

test.describe('The menu sheet and the editor strip on a phone (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);
  let admin: SupabaseClient;
  const me = { id: '', email: `sheet.${TAG}@journey.test` };
  let projectId = '', scriptId = '';

  test.beforeAll(async ({ stack }) => {
    admin = stack.admin;
    me.id = (await stack.createUser({ email: me.email, password: PASSWORD, username: `sheet${TAG}` })).id;
    projectId = (await admin.from('projects').insert({ title: `Sheet ${TAG}`, creator_id: me.id }).select('id').single()).data!.id;
    scriptId = (await admin.from('scripts').insert({ title: 'Kitchen', content: 'INT. KITCHEN - NIGHT\n\nMAYA\nStill up.\n', project_id: projectId, created_by: me.id, last_edited_by: me.id }).select('id').single()).data!.id;
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('created_by', me.id);
    await admin.from('projects').delete().eq('id', projectId);
  });

  test('the sheet: spacing, swipe down, and no duplicate New Project', async ({ browser }) => {
    test.setTimeout(120_000);
    const ctx = await browser.newContext(PHONE);
    const page = await ctx.newPage();
    await signInAs(page, { email: me.email, password: PASSWORD });
    await page.goto('/projects');
    const tabs = page.locator('[data-mobile-tabbar]');
    await expect(tabs).toBeVisible({ timeout: 30_000 });

    // The page's own top "New Project" button is a desk thing.
    await expect(page.getByRole('button', { name: /^New Project$/ })).toBeHidden();

    const dialog = page.getByRole('dialog', { name: 'Everything' });
    await tabs.getByRole('button', { name: /^Menu/ }).click();
    await expect(dialog).toBeVisible();
    const action = dialog.getByRole('button', { name: '+ New Project' });
    await expect(action).toBeVisible();

    // The page-action row does not touch the Places tiles.
    const a = (await action.boundingBox())!;
    const p = (await dialog.getByRole('navigation', { name: 'Places' }).boundingBox())!;
    expect(p.y - (a.y + a.height)).toBeGreaterThanOrEqual(8);

    // A short drag does not close it; a long one does.
    await drag(page, 30);
    await expect(dialog).toBeVisible();
    await drag(page, 200);
    await expect(dialog).toHaveCount(0);
    await ctx.close();
  });

  test('the editor strip keeps More on screen with the keyboard up', async ({ browser }) => {
    test.setTimeout(120_000);
    const ctx = await browser.newContext(PHONE);
    const page = await ctx.newPage();
    await fakeKeyboard(page);
    await signInAs(page, { email: me.email, password: PASSWORD });
    await page.goto(`/editor?script=${scriptId}`);
    const script = page.getByRole('textbox', { name: 'Script', exact: true });
    await expect(script).toHaveValue(/KITCHEN/, { timeout: 30_000 });
    await script.click();
    await page.evaluate(() => (window as unknown as { __setKb: (n: number) => void }).__setKb(336));
    const strip = page.getByRole('toolbar', { name: 'Writing tools' });
    await expect(strip).toBeVisible();
    const more = strip.getByRole('button', { name: 'More' });
    await expect(more).toBeVisible();
    await expect(more).toBeInViewport({ ratio: 1 });
    await ctx.close();
  });
});
