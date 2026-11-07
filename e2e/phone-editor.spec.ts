import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, devices, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The editor on an iPhone 15 Pro, held both ways: a slim bar with four doors (script list, view, tools, more) and bottom sheets
// instead of a sideways-scrolling desk bar and drawers; with the keyboard up an element strip rides on it and one tap inserts an
// element at the caret. Chromium cannot raise a real iOS keyboard, so `visualViewport` is faked (the page reads only that).
// Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const BASE = 'INT. KITCHEN - NIGHT\n\nMAYA\nStill up.\n';
const PHONE = devices['iPhone 15 Pro'];
const SIDEWAYS = { ...PHONE, viewport: { width: 852, height: 393 }, screen: { width: 852, height: 393 } };

async function fakeKeyboard(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __kb: number }).__kb = 0;
    Object.defineProperty(window, 'visualViewport', { configurable: true, get: () => ({ get height() { return window.innerHeight - (window as unknown as { __kb: number }).__kb; }, offsetTop: 0, addEventListener() {}, removeEventListener() {} }) });
    (window as unknown as { __setKb: (n: number) => void }).__setKb = (n) => { (window as unknown as { __kb: number }).__kb = n; window.dispatchEvent(new Event('resize')); };
  });
}

test.describe('The editor on a phone (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');
  let admin: SupabaseClient;
  const me = { id: '', email: `phoneed.${TAG}@journey.test` };
  let projectId = '', scriptId = '';

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    me.id = (await admin.auth.admin.createUser({ email: me.email, password: PASSWORD, email_confirm: true, user_metadata: { username: `ped${TAG}` } })).data.user!.id;
    projectId = (await admin.from('projects').insert({ title: `Phone ${TAG}`, creator_id: me.id }).select('id').single()).data!.id;
    scriptId = (await admin.from('scripts').insert({ title: 'Kitchen', content: BASE, project_id: projectId, created_by: me.id, last_edited_by: me.id }).select('id').single()).data!.id;
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('created_by', me.id);
    await admin.from('projects').delete().eq('id', projectId);
    if (me.id) await admin.auth.admin.deleteUser(me.id);
  });

  for (const [name, device] of [['portrait', PHONE], ['landscape', SIDEWAYS]] as const) {
    test(`${name}: the bar, the sheets, and the element strip over the keyboard`, async ({ browser }) => {
      test.setTimeout(120_000);
      const ctx = await browser.newContext(device);
      const page = await ctx.newPage();
      await fakeKeyboard(page);
      await page.goto('/auth');
      await page.fill('input[name="email"]', me.email);
      await page.fill('input[name="password"]', PASSWORD);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
      await page.goto(`/editor?script=${scriptId}`);
      const script = page.getByRole('textbox', { name: 'Script', exact: true });
      await expect(script).toHaveValue(BASE, { timeout: 30_000 });

      // The four doors fit the screen and are thumb-sized; nothing scrolls sideways.
      const vw = page.viewportSize()!.width;
      for (const name of [/^Scripts and scenes/, /Change view/, /^Tools/, /^More/]) {
        const box = (await page.getByRole('button', { name }).boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(vw);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);

      // Each door opens a sheet that closes on Escape.
      for (const [door, title] of [[/^Scripts and scenes/, 'Scripts and scenes'], [/Change view/, 'View'], [/^Tools/, 'Tools'], [/^More/, 'More']] as const) {
        await page.getByRole('button', { name: door }).click();
        await expect(page.getByRole('dialog', { name: title })).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog', { name: title })).toHaveCount(0);
      }

      // The keyboard goes up: the strip rides on it, the island steps aside, and one tap puts an element at the caret.
      await script.click();
      await page.keyboard.press('Control+End');
      await page.evaluate((kb) => (window as unknown as { __setKb: (n: number) => void }).__setKb(kb), name === 'portrait' ? 336 : 200);
      const strip = page.getByRole('toolbar', { name: 'Insert an element' });
      await expect(strip).toBeVisible();
      const stripBox = (await strip.boundingBox())!;
      const innerH = page.viewportSize()!.height;
      expect(stripBox.y + stripBox.height).toBeLessThanOrEqual(innerH - (name === 'portrait' ? 336 : 200) + 1);
      await expect(page.locator('[data-taskbar]')).toBeHidden();
      await strip.getByRole('button', { name: 'Action' }).click();
      await expect(script).toHaveValue(/Action description here\./);
      await ctx.close();
    });
  }
});
