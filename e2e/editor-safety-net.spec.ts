import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The safety net for changing how the editor stores and syncs a script (the
// editor-on-the-graph plan, E0): what co-writing and offline do TODAY, pinned
// down so a change to either (the CRDT, E3) can't quietly lose a writer's text.
// Each spec says what it guards. The co-writing case takes one browser offline
// while the other edits, then checks that the CRDT reconciles on reconnect.
// Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const BASE = 'INT. KITCHEN - NIGHT\n\nMAYA\nStill up.\n\nEXT. PIER - DAY\n\nBoats come in.\n';

test.describe.serial('Editor safety net (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const people = [
    { id: '', email: `sam.${TAG}@journey.test` },
    { id: '', email: `jor.${TAG}@journey.test` },
  ];
  let projectId = '';
  let scriptId = '';

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    for (const [i, p] of people.entries()) {
      p.id = (await admin.auth.admin.createUser({ email: p.email, password: PASSWORD, email_confirm: true, user_metadata: { username: `net${i}${TAG}` } })).data.user!.id;
    }
    projectId = (await admin.from('projects').insert({ title: `Net ${TAG}`, creator_id: people[0].id }).select('id').single()).data!.id;
    await admin.from('project_crew').insert({ project_id: projectId, user_id: people[1].id, craft: 'Writer', status: 'confirmed' });
    scriptId = (await admin.from('scripts').insert({ title: 'Kitchen', content: BASE, project_id: projectId, created_by: people[0].id, last_edited_by: people[0].id }).select('id').single()).data!.id;
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('project_id', projectId);
    await admin.from('projects').delete().eq('id', projectId);
    for (const p of people) if (p.id) await admin.auth.admin.deleteUser(p.id);
  });

  async function writer(browser: Browser, who: number): Promise<{ ctx: BrowserContext; page: Page; script: ReturnType<Page['getByLabel']> }> {
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
    const page = await ctx.newPage();
    await page.goto('/auth');
    await page.fill('input[name="email"]', people[who].email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
    await page.goto('/studio');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
    await page.goto(`/editor?script=${scriptId}`);
    const script = page.getByLabel('Script', { exact: true });
    await expect(script).toBeVisible({ timeout: 30_000 });
    return { ctx, page, script };
  }
  const reset = async () => {
    await admin.from('scripts').update({ content: BASE, updated_at: new Date().toISOString() }).eq('id', scriptId);
  };
  const saved = async () => (await admin.from('scripts').select('content').eq('id', scriptId).single()).data!.content as string;

  test('two writers, one after the other: both edits survive, in both windows and on the server', async ({ browser }) => {
    test.setTimeout(150_000);
    await reset();
    const a = await writer(browser, 0);
    const b = await writer(browser, 1);
    await expect(a.script).toHaveValue(BASE, { timeout: 30_000 });
    await expect(b.script).toHaveValue(BASE, { timeout: 30_000 });

    // A writes at the end; B sees it once A's save goes out.
    await a.script.click();
    await a.page.keyboard.press('Control+End');
    await a.page.keyboard.type('\nA was here.');
    await expect(b.script).toHaveValue(BASE + '\nA was here.', { timeout: 20_000 });

    // Then B adds to what they now see; A sees both.
    await b.script.click();
    await b.page.keyboard.press('Control+End');
    await b.page.keyboard.type('\nB too.');
    await expect(a.script).toHaveValue(BASE + '\nA was here.\nB too.', { timeout: 20_000 });
    await expect.poll(saved, { timeout: 20_000 }).toBe(BASE + '\nA was here.\nB too.');
    await a.ctx.close();
    await b.ctx.close();
  });

  test('two writers edit the same paragraph across a reconnect: both edits survive', async ({ browser }) => {
    test.setTimeout(150_000);
    await reset();
    const a = await writer(browser, 0);
    const b = await writer(browser, 1);
    try {
      await expect(a.script).toHaveValue(BASE, { timeout: 30_000 });
      await expect(b.script).toHaveValue(BASE, { timeout: 30_000 });

      await b.ctx.setOffline(true);
      await expect.poll(() => b.page.evaluate(() => navigator.onLine)).toBe(false);

      const paragraph = BASE.indexOf('Still up.');
      await a.script.evaluate((el, at) => {
        const textarea = el as HTMLTextAreaElement;
        textarea.focus();
        textarea.setSelectionRange(at, at);
      }, paragraph + 'Still '.length);
      await a.page.keyboard.type('really ');
      await b.script.evaluate((el, at) => {
        const textarea = el as HTMLTextAreaElement;
        textarea.focus();
        textarea.setSelectionRange(at, at);
      }, paragraph + 'Still up.'.length);
      await b.page.keyboard.type(' Still listening');

      await b.ctx.setOffline(false);
      await expect.poll(() => b.page.evaluate(() => navigator.onLine)).toBe(true);
      const want = (v: string) => v.includes('really') && v.includes('Still listening');
      await expect.poll(async () => want(await saved()), { timeout: 30_000 }).toBe(true);
      await expect.poll(async () => want(await a.script.inputValue()), { timeout: 10_000 }).toBe(true);
      await expect.poll(async () => want(await b.script.inputValue()), { timeout: 10_000 }).toBe(true);
    } finally {
      await Promise.all([a.ctx.close(), b.ctx.close()]);
    }
  });

  test('offline: typing is kept on the device, and reaches the server when the connection returns', async ({ browser }) => {
    test.setTimeout(150_000);
    await reset();
    const a = await writer(browser, 0);
    await expect(a.script).toHaveValue(BASE, { timeout: 30_000 });
    await a.page.waitForTimeout(3000); // the first load's own save settles

    await a.ctx.setOffline(true);
    await a.script.click();
    await a.page.keyboard.press('Control+End');
    await a.page.keyboard.type('\nWritten offline.');
    await a.page.waitForTimeout(4000);
    expect(await saved()).toBe(BASE); // the server hasn't it

    // It is on the device (IndexedDB, key script_<id>), waiting to sync.
    const onDevice = await a.page.evaluate(async (id) => {
      const db: IDBDatabase = await new Promise((res, rej) => { const r = indexedDB.open('keyval-store'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
      const row: { content?: string; syncPending?: boolean } | undefined = await new Promise((res, rej) => {
        const r = db.transaction('keyval').objectStore('keyval').get(`script_${id}`); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
      });
      return { content: row?.content ?? null, pending: !!row?.syncPending };
    }, scriptId);
    expect(onDevice.content).toContain('Written offline.');
    expect(onDevice.pending).toBe(true);

    // The connection returns: it reaches the server without the writer doing anything.
    await a.ctx.setOffline(false);
    await expect.poll(saved, { timeout: 45_000 }).toContain('Written offline.');
    await a.ctx.close();
  });
});
