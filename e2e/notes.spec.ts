import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, type Browser, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Notes in three layers, in two real browsers: Sam (owner) and Jordan (confirmed crew). A private note is Sam's alone; a project
// note reaches Jordan's list and his bell; the island's Note key (U under Caps Lock) opens the box. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

const capsKey = (page: Page, key: string, type: 'keydown' | 'keyup' = 'keydown') =>
  page.evaluate(([k, t]) => { window.dispatchEvent(new KeyboardEvent(t, { key: k, modifierCapsLock: true, bubbles: true, cancelable: true })); }, [key, type]);

test.describe('Notes (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const sam = { id: '', email: `notes.sam.${TAG}@journey.test` };
  const jordan = { id: '', email: `notes.jordan.${TAG}@journey.test` };
  let projectId = '';
  let scriptId = '';

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    for (const [who, name] of [[sam, 'sam'], [jordan, 'jordan']] as const) {
      who.id = (await admin.auth.admin.createUser({ email: who.email, password: PASSWORD, email_confirm: true, user_metadata: { username: `n${name}${TAG}` } })).data.user!.id;
    }
    projectId = (await admin.from('projects').insert({ title: `Notes ${TAG}`, creator_id: sam.id }).select('id').single()).data!.id;
    await admin.from('project_crew').insert({ project_id: projectId, user_id: jordan.id, craft: 'Production designer', status: 'confirmed' });
    scriptId = (await admin.from('scripts').insert({ title: 'Kitchen', content: 'INT. KITCHEN - NIGHT\n\nMAYA\nStill up.\n', project_id: projectId, created_by: sam.id, last_edited_by: sam.id }).select('id').single()).data!.id;
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('notes').delete().eq('project_id', projectId);
    await admin.from('scripts').delete().eq('project_id', projectId);
    await admin.from('projects').delete().eq('id', projectId);
    for (const u of [sam, jordan]) if (u.id) await admin.auth.admin.deleteUser(u.id);
  });

  async function openEditor(browser: Browser, who: { email: string }) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('/auth');
    await page.fill('input[name="email"]', who.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
    await page.goto(`/editor?script=${scriptId}`);
    await expect(page.getByRole('textbox', { name: 'Script', exact: true })).toBeVisible({ timeout: 30_000 });
    await page.getByTitle('Notes', { exact: true }).click();
    // The first list has settled: anything Jordan sees afterwards arrived live, not through that first fetch.
    await expect(page.getByLabel('New note')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Loading notes…')).toHaveCount(0, { timeout: 30_000 });
    return { ctx, page };
  }

  test('private stays private, project reaches the crew live and in their notifications, and U opens the box', async ({ browser }) => {
    test.setTimeout(180_000);
    const a = await openEditor(browser, sam);
    const b = await openEditor(browser, jordan);

    // Sam writes a private note, then a project note.
    await a.page.getByLabel('New note').fill('only for me');
    await a.page.getByRole('button', { name: 'Add note' }).click();
    await expect(a.page.getByText('only for me')).toBeVisible();
    await a.page.getByRole('button', { name: /Project/ }).click();
    await a.page.getByLabel('New note').fill('we shoot the kitchen first');
    await a.page.getByRole('button', { name: 'Add note' }).click();
    await expect(a.page.getByText('we shoot the kitchen first')).toBeVisible();

    // Jordan sees the project note arrive (live), never the private one.
    await expect(b.page.getByText('we shoot the kitchen first')).toBeVisible({ timeout: 30_000 });
    await expect(b.page.getByText('only for me')).toHaveCount(0);
    // …and a notification row was written for him (and the bell shows it, below).
    const told = await admin.from('notifications').select('title, link').eq('user_id', jordan.id).eq('type', 'note');
    expect(told.data?.some((n) => n.link === `/studio?project=${projectId}`)).toBe(true);
    // The bell itself shows it. The bell fetches once on mount and listens for new rows; if the row landed in the gap between
    // the two, a fresh load (the bell's own initial fetch) must show it, so reload once rather than fail on that race.
    const bellRow = b.page.getByText(/added a project note/).first();
    const openBell = async () => {
      await b.page.locator('[data-taskbar]').hover();
      await b.page.getByRole('button', { name: 'Notifications' }).first().click({ timeout: 15_000 });
    };
    await openBell();
    if (!(await bellRow.isVisible({ timeout: 8_000 }).catch(() => false))) {
      await b.page.reload();
      await openBell();
    }
    await expect(bellRow).toBeVisible({ timeout: 15_000 });
    const samTold = await admin.from('notifications').select('id').eq('user_id', sam.id).eq('type', 'note');
    expect(samTold.data ?? []).toHaveLength(0);

    // The island's Note key opens the Notes tab and focuses the box, from another tab.
    await a.page.getByTitle('Scene', { exact: true }).click();
    await capsKey(a.page, 'CapsLock');
    await capsKey(a.page, 'U');
    await expect(a.page.getByLabel('New note')).toBeFocused();
    await a.page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keyup', { key: 'CapsLock', modifierCapsLock: false, bubbles: true })));

    await a.ctx.close();
    await b.ctx.close();
  });

  test('a writer note reaches Jordan on the script, and U opens the box on the Studio overview', async ({ browser }) => {
    test.setTimeout(180_000);
    const a = await openEditor(browser, sam);
    const b = await openEditor(browser, jordan);

    await a.page.getByRole('button', { name: /Writers/ }).click();
    await a.page.getByLabel('New note').fill('cut the second beat');
    await a.page.getByRole('button', { name: 'Add note' }).click();
    await expect(a.page.getByText('cut the second beat')).toBeVisible();
    // Jordan opens the same script: the writer note is in his list, labelled as one.
    const card = b.page.locator('li', { hasText: 'cut the second beat' });
    await expect(card).toBeVisible({ timeout: 30_000 });
    await expect(card.getByText('Writers', { exact: true })).toBeVisible();
    const told = await admin.from('notifications').select('title, link').eq('user_id', jordan.id).eq('type', 'note');
    expect(told.data?.some((n) => n.link === `/editor?script=${scriptId}` && /writer note/.test(n.title))).toBe(true);

    // The Studio overview: Caps Lock then U focuses its note box.
    await a.page.goto(`/studio?project=${projectId}`);
    await expect(a.page.getByLabel('New note')).toBeVisible({ timeout: 30_000 });
    await capsKey(a.page, 'CapsLock');
    await capsKey(a.page, 'U');
    await expect(a.page.getByLabel('New note')).toBeFocused();
    await a.page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keyup', { key: 'CapsLock', modifierCapsLock: false, bubbles: true })));

    await a.ctx.close();
    await b.ctx.close();
  });
});
