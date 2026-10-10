import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The suite on a phone, in a real browser against a local stack: the tab bar
// replaces the dock, no page scrolls sideways, More reaches every tool and the
// active project, Today shows the day on set and lets you tick off your tasks,
// and the Lounge is list → conversation → back, reachable by link.
// Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };

async function axeViolations(page: Page): Promise<string[]> {
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async () => {
    const r = await (window as any).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] });
    return r.violations.map((v: any) => `${v.id}: ${v.nodes.slice(0, 3).map((n: any) => `${n.target.join(' ')} ${n.html.slice(0, 120)}`).join(' | ')}`);
  });
}

const overflow = (page: Page) => page.evaluate(() => {
  const vw = document.documentElement.clientWidth;
  return [...document.body.querySelectorAll('*')].filter((el) => {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    if (!r.width || cs.display === 'none' || cs.visibility === 'hidden' || r.right <= vw + 1 || r.left >= vw) return false;
    // Decoration fixed to the screen (the film grain jitters a few px either
    // way) never makes the page scroll and holds nothing to read.
    if (cs.position === 'fixed' && cs.pointerEvents === 'none' && el.getAttribute('aria-hidden') === 'true') return false;
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX;
      if (['auto', 'scroll', 'hidden', 'clip'].includes(o) && p.getBoundingClientRect().right <= vw + 1) return false;
    }
    return !(el.parentElement && el.parentElement.getBoundingClientRect().right > vw + 1);
  }).map((el) => `${el.tagName.toLowerCase()}.${String((el as HTMLElement).className).split(' ')[0]} +${Math.round(el.getBoundingClientRect().right - vw)}px`);
});

test.describe('The suite on a phone (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const owner = { id: '', email: `phone.${TAG}@journey.test` };
  let projectId: string;
  let taskId: string;
  let channelId: string;
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    owner.id = (await admin.auth.admin.createUser({ email: owner.email, password: PASSWORD, email_confirm: true, user_metadata: { username: `pocket${TAG}` } })).data.user!.id;
    projectId = (await admin.from('projects').insert({ title: `Tidewater ${TAG}`, creator_id: owner.id, status: 'production' }).select('id').single()).data!.id;
    await admin.from('call_sheets').insert({ project_id: projectId, shoot_day: 2, shoot_date: iso, general_call: '07:30', location_address: '12 Harbour Rd' });
    taskId = (await admin.from('project_tasks').insert({ project_id: projectId, title: `Confirm the boat ${TAG}`, assigned_to: owner.id, due_date: iso }).select('id').single()).data!.id;
    channelId = (await admin.from('channels').insert({ project_id: projectId, name: `harbour-${TAG}`, type: 'text' }).select('id').single()).data!.id;
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('projects').delete().eq('id', projectId);
    await admin.auth.admin.deleteUser(owner.id);
  });

  test('tab bar, Today, More, and nothing scrolls sideways', async ({ browser }) => {
    test.setTimeout(180_000);
    const ctx = await browser.newContext(PHONE);
    const page = await ctx.newPage();
    await page.goto('/auth');
    await page.fill('input[name="email"]', owner.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });

    // Today: the day on set with the way there, and the task — ticked off here.
    await page.goto('/today');
    const tabs = page.locator('[data-mobile-tabbar]');
    await expect(tabs).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('nav.mc-dock')).toBeHidden();
    const day = page.getByRole('article', { name: new RegExp(`Tidewater ${TAG}, day 2, Today`) });
    await expect(day).toContainText('7:30', { timeout: 20_000 });
    await expect(day.getByRole('link', { name: /12 Harbour Rd/ })).toHaveAttribute('href', /maps\.google\.com/);
    await page.getByRole('button', { name: `Mark done: Confirm the boat ${TAG}` }).click();
    await expect.poll(async () => (await admin.from('project_tasks').select('completed').eq('id', taskId).single()).data?.completed).toBe(true);
    const violations = await axeViolations(page);
    expect(violations, violations.join('\n')).toEqual([]);

    // More: every tool, and the project to work on.
    await tabs.getByRole('button', { name: 'More' }).click();
    const sheet = page.getByRole('dialog', { name: 'Everything' });
    await expect(sheet.getByRole('link', { name: 'Studio' })).toBeVisible();
    await expect(sheet.getByRole('radio', { name: new RegExp(`Tidewater ${TAG}`) })).toBeVisible();
    await sheet.getByRole('button', { name: 'Close' }).click();
    await expect(sheet).toBeHidden();

    // A long project name is what pushed the Lounge header off the screen and
    // wrapped the editor's status bar onto three lines: check with one.
    const longTitle = `Tidewater ${TAG} — the long way round the headland`;
    await admin.from('projects').update({ title: longTitle }).eq('id', projectId);
    const scriptId = (await admin.from('scripts').insert({ title: longTitle, content: 'INT. PIER - NIGHT\n\n', project_id: projectId, created_by: owner.id, last_edited_by: owner.id }).select('id').single()).data!.id;
    await page.reload();
    for (const path of ['/today', '/projects', `/projects/${projectId}`, '/studio?tab=overview', '/studio?tab=production&view=schedule', '/lounge', '/jobs', '/crew', '/settings', `/editor?script=${scriptId}`]) {
      await page.goto(path);
      await page.waitForTimeout(1500);
      expect(await overflow(page), path).toEqual([]);
    }
    // The editor's status bar is one line: its contents fit its height.
    const status = page.getByTestId('editor-status');
    await expect(status).toBeVisible();
    expect(await status.evaluate((el) => el.scrollHeight <= el.clientHeight + 1 && [...el.querySelectorAll('span')].every((s) => s.getBoundingClientRect().height <= el.clientHeight))).toBe(true);
    // Export opens a menu you can use on a phone (it was clipped by the
    // sideways-scrolling header, under the script).
    const exportBtn = page.getByRole('button', { name: 'Export', exact: true });
    await exportBtn.scrollIntoViewIfNeeded();
    await exportBtn.click();
    await page.getByRole('menu', { name: 'Export' }).getByRole('button', { name: '.PDF' }).click({ trial: true });
    await page.keyboard.press('Escape');
    await admin.from('scripts').delete().eq('id', scriptId);
    await admin.from('projects').update({ title: `Tidewater ${TAG}` }).eq('id', projectId);
    await ctx.close();
  });

  test('Lounge: a link opens the conversation; back returns to the list', async ({ browser }) => {
    test.setTimeout(90_000);
    const ctx = await browser.newContext(PHONE);
    const page = await ctx.newPage();
    await page.goto('/auth');
    await page.fill('input[name="email"]', owner.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
    await page.goto('/projects');
    await page.goto(`/lounge?channel=${channelId}`);
    await expect(page.getByPlaceholder(`Message #harbour-${TAG}...`)).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Back to channels and people' }).click();
    await expect(page.getByRole('button', { name: `harbour-${TAG}` }).or(page.getByText(`harbour-${TAG}`)).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByPlaceholder(`Message #harbour-${TAG}...`)).toBeHidden();
    await ctx.close();
  });

  test('Pocket: capture a note and a link from the phone; continue where the desk left off', async ({ browser }) => {
    test.setTimeout(120_000);
    // Where the desk was, twenty minutes ago.
    const desk = { path: `/projects/${projectId}`, label: `Tidewater ${TAG} — project page`, at: new Date(Date.now() - 20 * 60_000).toISOString(), project: projectId };
    await admin.from('profiles').update({ ui_prefs: { places: { desktop: desk } } }).eq('id', owner.id);

    const ctx = await browser.newContext(PHONE);
    const page = await ctx.newPage();
    await page.goto('/auth');
    await page.fill('input[name="email"]', owner.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });

    // Today offers the desk's place, and taking it goes there.
    await page.goto('/today');
    const offer = page.getByRole('complementary', { name: 'Continue from your desktop' }).first();
    await expect(offer).toContainText(`Tidewater ${TAG} — project page`, { timeout: 30_000 });
    await expect(offer).toContainText('20 min ago');
    await offer.getByRole('button', { name: /project page/ }).click();
    await page.waitForURL(`**/projects/${projectId}`);

    // Capture a note into the project, from the tab bar.
    await page.goto('/today');
    await page.locator('[data-mobile-tabbar]').getByRole('button', { name: /Capture/ }).click();
    const sheet = page.getByRole('dialog', { name: 'Capture' });
    await sheet.getByLabel('Project to capture into').selectOption(projectId);
    await sheet.getByRole('button', { name: 'Note' }).click();
    await sheet.getByLabel('Note', { exact: true }).fill(`Ferry at six ${TAG}\nbring coats`);
    await sheet.getByRole('button', { name: 'Save note' }).click();
    await expect(sheet.getByRole('status').filter({ hasText: `in Tidewater ${TAG}` })).toBeVisible({ timeout: 20_000 });
    await expect.poll(async () => (await admin.from('media').select('kind, title, notes').eq('project_id', projectId).eq('kind', 'note')).data)
      .toEqual([{ kind: 'note', title: `Ferry at six ${TAG}`, notes: `Ferry at six ${TAG}\nbring coats` }]);

    // Shared from another app: a link lands as a link.
    await page.goto(`/today?text=${encodeURIComponent('look https://example.com/harbour')}`);
    const shared = page.getByRole('dialog', { name: 'Capture' });
    await expect(shared.getByLabel('Web address')).toHaveValue('https://example.com/harbour');
    await shared.getByLabel('Project to capture into').selectOption(projectId);
    await shared.getByRole('button', { name: 'Add link' }).click();
    await expect.poll(async () => (await admin.from('media').select('external_url').eq('project_id', projectId).eq('kind', 'link')).data)
      .toEqual([{ external_url: 'https://example.com/harbour' }]);
    await shared.getByRole('button', { name: 'Close' }).click();

    // The note is in the Studio library, on any device.
    await page.goto('/studio?tab=library');
    await expect(page.getByText(`Ferry at six ${TAG}`).first()).toBeVisible({ timeout: 30_000 });

    // And the phone remembered where it was, for the desk to offer back.
    await expect.poll(async () => ((await admin.from('profiles').select('ui_prefs').eq('id', owner.id).single()).data?.ui_prefs as { places?: { phone?: { path: string } } })?.places?.phone?.path, { timeout: 20_000 })
      .toBe('/studio?tab=library');
    await ctx.close();
  });

  test('on a desk the dock stays and the tab bar does not show', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto('/auth');
    await page.fill('input[name="email"]', owner.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
    await page.goto('/today');
    await expect(page.locator('nav.mc-dock')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('[data-mobile-tabbar]')).toBeHidden();
    await ctx.close();
  });
});
