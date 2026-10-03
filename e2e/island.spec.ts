import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The island at desk size, in a real browser against a local stack: it rests
// as a small pill naming the page; opens to the whole suite when reached for;
// shrinks to a dot while you type; holds a keyboard deck open under Caps Lock;
// and keeps a menu open until you click away. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const DESK = { viewport: { width: 1280, height: 800 } };

const island = (page: Page) => page.locator('[data-taskbar]');
const surface = (page: Page) => page.locator('[data-taskbar] .mc-taskbar');
const shape = (page: Page, mode: string) => expect(island(page)).toHaveAttribute('data-island', mode);

/** A key press with Caps Lock on. Playwright's own key presses never carry the lock, so these are dispatched. */
const capsKey = (page: Page, key: string, type: 'keydown' | 'keyup' = 'keydown') =>
  page.evaluate(([k, t]) => { window.dispatchEvent(new KeyboardEvent(t, { key: k, modifierCapsLock: true, bubbles: true, cancelable: true })); }, [key, type]);
const capsOff = (page: Page) =>
  page.evaluate(() => { window.dispatchEvent(new KeyboardEvent('keyup', { key: 'CapsLock', modifierCapsLock: false, bubbles: true })); });

test.describe('The island (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const owner = { id: '', email: `island.${TAG}@journey.test` };
  let projectId: string;

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    owner.id = (await admin.auth.admin.createUser({ email: owner.email, password: PASSWORD, email_confirm: true, user_metadata: { username: `island${TAG}` } })).data.user!.id;
    projectId = (await admin.from('projects').insert({ title: `Lighthouse ${TAG}`, creator_id: owner.id, status: 'production' }).select('id').single()).data!.id;
    await admin.from('channels').insert({ project_id: projectId, name: `general-${TAG}`, type: 'text' });
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('projects').delete().eq('id', projectId);
    await admin.auth.admin.deleteUser(owner.id);
  });

  test('rests, opens, yields to typing, and takes keys under Caps Lock', async ({ browser }) => {
    test.setTimeout(150_000);
    const ctx = await browser.newContext(DESK);
    const page = await ctx.newPage();
    await page.goto('/auth');
    const email = page.locator('input[name="email"]');
    await expect(async () => {
      // The form can re-render as it hydrates; make sure the address is still there before sending.
      await email.fill(owner.email);
      await page.fill('input[name="password"]', PASSWORD);
      await expect(email).toHaveValue(owner.email);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 10_000 });
    }).toPass({ timeout: 60_000 });

    // At rest: a small pill that says where you are, and nothing of the deck.
    await page.goto('/projects');
    await expect(island(page)).toBeVisible({ timeout: 30_000 });
    await page.mouse.move(10, 10);
    await shape(page, 'rest');
    await expect(surface(page)).toContainText('Projects');
    await expect(page.getByRole('link', { name: 'Studio', exact: true })).toBeHidden();
    await page.waitForTimeout(1200); // entrance
    const rest = (await surface(page).boundingBox())!;
    expect(rest.height, 'the resting island is a slim pill').toBeLessThanOrEqual(48);
    expect(rest.width).toBeLessThan(420);
    expect(Math.abs(rest.x + rest.width / 2 - DESK.viewport.width / 2), 'centred').toBeLessThan(3);

    // Reached for: the suite, the page's own control, and the places the strip doesn't reach.
    await surface(page).hover();
    await shape(page, 'open');
    const controls = page.getByRole('group', { name: 'Projects controls' });
    await expect(controls.getByRole('button', { name: '+ New Project' })).toBeVisible();
    for (const name of ['Hub', 'Today', 'ScriptOS', 'Studio', 'Lounge', 'Portfolio', 'Profile', 'Settings']) {
      await expect(island(page).getByRole('link', { name, exact: true })).toBeVisible();
    }
    await expect(page.getByRole('button', { name: 'Search (Command-K)' })).toBeVisible();
    await page.waitForTimeout(600);
    const open = (await surface(page).boundingBox())!;
    expect(open.width).toBeGreaterThan(rest.width + 200);
    expect(open.x).toBeGreaterThanOrEqual(0);
    expect(open.x + open.width).toBeLessThanOrEqual(DESK.viewport.width);
    expect(open.y + open.height).toBeLessThanOrEqual(DESK.viewport.height);
    // The room it asks pages for doesn't change when it opens.
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--taskbar-height').trim())).toBe('64px');

    // Its control does the real thing. (Pointing at the strip first: a press where the pill
    // was, in the moment after it opens, keeps the island open rather than pressing a control.)
    await page.getByRole('button', { name: 'Search (Command-K)' }).hover();
    await controls.getByRole('button', { name: '+ New Project' }).click();
    await expect(page.getByRole('heading', { name: 'Start a project' })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.mouse.click(10, 300);

    // Away again: back to rest.
    await page.mouse.move(10, 10);
    await shape(page, 'rest');

    // A menu left open holds it open until you click away.
    await surface(page).hover();
    await page.getByRole('button', { name: 'Switch project' }).click();
    await expect(page.getByText(`Lighthouse ${TAG}`).first()).toBeVisible();
    await page.mouse.move(10, 10);
    await page.waitForTimeout(600);
    await shape(page, 'open');
    await page.mouse.click(10, 300);
    await shape(page, 'rest');

    // Pressing the pill keeps it open — it doesn't press whatever slides in under the pointer.
    await page.getByRole('button', { name: /^Open the island/ }).click();
    await expect(page.getByRole('heading', { name: 'Start a project' })).toBeHidden();
    await page.mouse.move(10, 10);
    await page.waitForTimeout(500);
    await shape(page, 'open');
    await expect(page.getByRole('button', { name: 'Close the island' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Close the island' }).focus();
    await page.keyboard.press('Escape');
    await shape(page, 'rest');

    // An app from the strip.
    await surface(page).hover();
    await island(page).getByRole('link', { name: 'Lounge', exact: true }).click();
    await page.waitForURL(/\/lounge/);
    await page.mouse.move(10, 10);
    await shape(page, 'rest');

    // Typing: a dot, clear of the words — and back when the keys stop.
    const composer = page.locator('.mc-lounge-composer').locator('textarea, input[type="text"], [contenteditable="true"]').first();
    await expect(composer).toBeVisible({ timeout: 30_000 });
    await composer.click();
    await page.keyboard.type('checking the gate', { delay: 20 });
    await shape(page, 'dot');
    expect((await surface(page).boundingBox())!.width, 'the dot is small').toBeLessThan(40);
    await expect(island(page)).toHaveAttribute('data-island', 'rest', { timeout: 6_000 });
    await composer.fill('');
    await page.mouse.click(640, 300);

    // Caps Lock: the deck held open, every control on a key.
    await capsKey(page, 'CapsLock');
    await shape(page, 'caps');
    await expect(surface(page)).toContainText('put away');
    await expect(island(page).getByRole('link', { name: 'Today', exact: true })).toBeVisible();
    // Q is the first control on show — here, the Lounge's message search.
    await capsKey(page, 'Q');
    await expect(page.getByRole('dialog', { name: 'Search the Lounge' })).toBeVisible();
    await capsKey(page, 'Escape');
    await shape(page, 'rest'); // put away with Escape…
    await capsKey(page, 'CapsLock', 'keyup');
    await shape(page, 'rest'); // …and it stays away while the lock is on
    await capsOff(page);
    await capsKey(page, 'CapsLock');
    await shape(page, 'caps'); // a fresh Caps Lock brings it back
    await capsKey(page, '2'); // the second app: Today
    await page.waitForURL(/\/today/);
    await capsOff(page);
    await shape(page, 'rest');

    await ctx.close();
  });

  test('Settings › Island size resizes it at once, and the size is kept', async ({ browser }) => {
    test.setTimeout(90_000);
    const ctx = await browser.newContext(DESK);
    const page = await ctx.newPage();
    await page.goto('/auth');
    await page.fill('input[name="email"]', owner.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });

    await page.goto('/settings');
    const slider = page.getByRole('slider', { name: 'Island size' });
    await expect(slider).toBeVisible({ timeout: 30_000 });
    await page.mouse.move(10, 10);
    await shape(page, 'rest');
    await page.waitForTimeout(1200); // entrance
    const reserve = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--taskbar-height').trim());
    const height = async () => (await surface(page).boundingBox())!.height;
    const normal = await height();
    expect(await reserve()).toBe('64px');

    await slider.fill('1.3');
    await expect.poll(height).toBeGreaterThan(normal + 8);
    expect(await reserve()).toBe('77px');
    await slider.fill('0.8');
    await expect.poll(height).toBeLessThan(normal - 4);
    // Smaller controls, but its words stay at the 11px floor.
    expect(await surface(page).locator('button').first().evaluate((el) => Math.min(...[...el.querySelectorAll('span')].filter((n) => n.textContent).map((n) => parseFloat(getComputedStyle(n).fontSize))))).toBeGreaterThanOrEqual(11);

    // Kept on this device: still that size on another page, after a reload.
    await slider.fill('1.3');
    await page.goto('/today');
    await expect(island(page)).toBeVisible({ timeout: 30_000 });
    await page.mouse.move(10, 10);
    await expect.poll(reserve).toBe('77px');
    // And the opened island still fits the screen at its largest.
    await page.waitForTimeout(1200);
    await surface(page).hover();
    await shape(page, 'open');
    await page.waitForTimeout(600);
    const open = (await surface(page).boundingBox())!;
    expect(open.x).toBeGreaterThanOrEqual(0);
    expect(open.x + open.width).toBeLessThanOrEqual(DESK.viewport.width);
    await ctx.close();
  });
});
