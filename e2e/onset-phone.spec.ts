import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, devices } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// On set on a phone (an iPhone 15 Pro, portrait): the day's page never scrolls sideways, every control is a thumb's size, and the note
// field stays above the keyboard (faked through `visualViewport`). Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const SCRIPT = 'INT. TUNNEL - NIGHT\n\nMAYA\nQuiet.\n\nEXT. RIDGE - DAWN\n\nJO\nMove.\n';
const d = new Date();
const TODAY = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

test.describe('On set on a phone (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');
  let admin: SupabaseClient; let userId = ''; let email = ''; let projectId = '';

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    email = `osph.${Date.now()}@journey.test`;
    userId = (await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { username: `osph${Date.now().toString(36)}` } })).data.user!.id;
    projectId = (await admin.from('projects').insert({ title: 'Underground', creator_id: userId, status: 'production' }).select('id').single()).data!.id;
    await admin.from('scripts').insert({ title: 'Underground', content: SCRIPT, project_id: projectId, created_by: userId, last_edited_by: userId });
    await admin.from('call_sheets').insert({ project_id: projectId, shoot_day: 1, shoot_date: TODAY, general_call: '07:00', estimated_wrap: '19:00' });
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('project_id', projectId);
    await admin.from('projects').delete().eq('id', projectId);
    await admin.auth.admin.deleteUser(userId);
  });

  test('no sideways scroll, thumb-sized controls, and the note above the keyboard', async ({ browser }) => {
    test.setTimeout(120_000);
    const ctx = await browser.newContext(devices['iPhone 15 Pro']);
    await ctx.addInitScript(() => {
      const w = window as unknown as { __kb: number; __setKb: (n: number) => void };
      w.__kb = 0;
      Object.defineProperty(window, 'visualViewport', { configurable: true, get: () => ({ get height() { return window.innerHeight - w.__kb; }, offsetTop: 0, addEventListener() {}, removeEventListener() {} }) });
      w.__setKb = (n) => { w.__kb = n; window.dispatchEvent(new Event('resize')); };
    });
    const page = await ctx.newPage();
    await page.goto('/auth');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
    await page.goto('/studio?tab=production&view=onset');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
    await expect.poll(async () => (await admin.from('scenes').select('id').eq('project_id', projectId).is('removed_at', null)).data?.length, { timeout: 30_000 }).toBe(2);
    const scene = (await admin.from('scenes').select('id').eq('project_id', projectId).order('scene_number').limit(1).single()).data!.id;
    await admin.from('scenes').update({ shoot_day: 1 }).eq('id', scene);
    await admin.from('shots').insert({ project_id: projectId, scene_id: scene, shot_number: '1.1', shot_size: 'WS', created_by: userId });
    await page.reload();
    await expect(page.getByRole('button', { name: 'Shot 1.1: mark got' })).toBeVisible({ timeout: 30_000 });

    // Nothing wider than the screen.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    // Every control on the day is at least a thumb.
    const small = await page.evaluate(() => [...document.querySelectorAll('main button, main [role="button"], main a[href], main input:not([type="hidden"]), main select')]
      .map((el) => { const r = (el as HTMLElement).getBoundingClientRect(); return { n: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) }; })
      .filter((x) => x.w > 0 && x.h > 0 && (x.h < 40 || x.w < 40) && !/^(Skip|sr-only)/.test(x.n)));
    expect(small, JSON.stringify(small)).toEqual([]);

    // The note field, focused with the keyboard up, is visible above it.
    const note = page.getByLabel('Note for the day');
    await note.scrollIntoViewIfNeeded();
    await note.focus();
    await page.evaluate(() => (window as unknown as { __setKb: (n: number) => void }).__setKb(336));
    await expect(page.locator('html')).toHaveAttribute('data-typing', 'true');
    await expect.poll(async () => { const b = (await note.boundingBox())!; return b.y >= 0 && b.y + b.height <= page.viewportSize()!.height - 336; }, { timeout: 10_000 }).toBe(true);
    await ctx.close();
  });
});
