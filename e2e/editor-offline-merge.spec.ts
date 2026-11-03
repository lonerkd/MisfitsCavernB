import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as Y from 'yjs';

// Offline capture meets a collaborator (ADR 0008). One writer loses the connection and types; another keeps
// writing online; the first comes back. Whatever the order things reach the server in, once they settle both
// edits are in the script, the stored text equals the text the stored Yjs state spells, and a device that has
// never seen the script opens on the merged text — not on a stale copy that quietly drops an edit.
// Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const BASE = 'INT. KITCHEN - NIGHT\n\nMAYA\nStill up.\n\nEXT. PIER - DAY\n\nBoats come in.\n';

test.describe.serial('Offline writer and online collaborator (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const people = [
    { id: '', email: `om1.${TAG}@journey.test` },
    { id: '', email: `om2.${TAG}@journey.test` },
    { id: '', email: `om3.${TAG}@journey.test` },
  ];
  let projectId = '';
  let scriptId = '';

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    for (const [i, p] of people.entries()) {
      p.id = (await admin.auth.admin.createUser({ email: p.email, password: PASSWORD, email_confirm: true, user_metadata: { username: `om${i}${TAG}` } })).data.user!.id;
    }
    projectId = (await admin.from('projects').insert({ title: `Offline merge ${TAG}`, creator_id: people[0].id }).select('id').single()).data!.id;
    for (const p of people.slice(1)) {
      await admin.from('project_crew').insert({ project_id: projectId, user_id: p.id, craft: 'Writer', status: 'confirmed' });
    }
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
    await admin.from('scripts').update({ content: BASE, yjs_state: null, updated_at: new Date().toISOString() }).eq('id', scriptId);
  };
  const stored = async () => (await admin.from('scripts').select('content, yjs_state').eq('id', scriptId).single()).data as { content: string; yjs_state: string | null };
  const textOfState = (b64: string) => {
    const doc = new Y.Doc();
    Y.applyUpdate(doc, Uint8Array.from(Buffer.from(b64, 'base64')));
    return doc.getText('script').toString();
  };
  const caretAt = (w: { script: ReturnType<Page['getByLabel']> }, at: number) => w.script.evaluate((el, i) => {
    const t = el as HTMLTextAreaElement;
    t.focus();
    t.setSelectionRange(i, i);
  }, at);

  test('offline edit + online edit, then reconnect: both survive, the stored text equals the stored state, and a fresh device sees both', async ({ browser }) => {
    test.setTimeout(240_000);
    await reset();
    const a = await writer(browser, 0);
    const b = await writer(browser, 1);
    try {
      await expect(a.script).toHaveValue(BASE, { timeout: 30_000 });
      await expect(b.script).toHaveValue(BASE, { timeout: 30_000 });
      await a.page.waitForTimeout(3000); // the first load's own save settles

      // A drops off the network and writes in the kitchen scene.
      await a.ctx.setOffline(true);
      await expect.poll(() => a.page.evaluate(() => navigator.onLine)).toBe(false);
      await caretAt(a, BASE.indexOf('Still up.') + 'Still up.'.length);
      await a.page.keyboard.type(' Alpha was offline.');

      // B, online, writes on the pier and it reaches the server.
      await caretAt(b, BASE.indexOf('Boats come in.') + 'Boats come in.'.length);
      await b.page.keyboard.type(' Bravo stayed online.');
      await expect.poll(async () => (await stored()).content.includes('Bravo stayed online.'), { timeout: 30_000 }).toBe(true);
      expect((await stored()).content).not.toContain('Alpha was offline.');

      // A comes back.
      await a.ctx.setOffline(false);
      await expect.poll(() => a.page.evaluate(() => navigator.onLine)).toBe(true);
      const both = (v: string) => v.includes('Still up. Alpha was offline.') && v.includes('Boats come in. Bravo stayed online.');
      const settled = async () => {
        const row = await stored();
        return both(row.content) && !!row.yjs_state && textOfState(row.yjs_state) === row.content;
      };
      await expect.poll(settled, { timeout: 60_000 }).toBe(true);

      // …and stays settled: a late stale write from the offline queue must not undo it.
      await a.page.waitForTimeout(8000);
      expect(await settled()).toBe(true);
      await expect.poll(async () => both(await a.script.inputValue()), { timeout: 10_000 }).toBe(true);
      await expect.poll(async () => both(await b.script.inputValue()), { timeout: 10_000 }).toBe(true);

      // A device that has never seen this script opens on the merged text.
      const c = await writer(browser, 2);
      try {
        await expect.poll(async () => both(await c.script.inputValue()), { timeout: 30_000 }).toBe(true);
        await c.page.waitForTimeout(4000); // its own load-time save must not roll anything back either
        expect(await settled()).toBe(true);
      } finally { await c.ctx.close(); }
    } finally {
      await Promise.all([a.ctx.close(), b.ctx.close()]);
    }
  });
  test('the queue syncs from a page that is not the editor (the tab was closed offline): a collaborator\'s edit is not lost', async ({ browser }) => {
    test.setTimeout(240_000);
    await reset();
    const a = await writer(browser, 0);
    let b: Awaited<ReturnType<typeof writer>> | null = null;
    try {
      await expect(a.script).toHaveValue(BASE, { timeout: 30_000 });
      await a.page.waitForTimeout(3000);

      // A loses the connection, writes in the kitchen scene, and closes the tab with the text still waiting on the device.
      await a.ctx.setOffline(true);
      await expect.poll(() => a.page.evaluate(() => navigator.onLine)).toBe(false);
      await caretAt(a, BASE.indexOf('Still up.') + 'Still up.'.length);
      await a.page.keyboard.type(' Alpha was offline.');
      await a.page.waitForTimeout(2500);
      await a.page.close();

      // B opens the script only now, so nothing A typed can have reached B over a connection that was still open
      // (going offline does not close an established websocket). B writes on the pier.
      b = await writer(browser, 1);
      await expect(b.script).toHaveValue(BASE, { timeout: 30_000 });
      expect((await stored()).content, 'A\'s offline words never reached the server').not.toContain('Alpha was offline.');
      await caretAt(b, BASE.indexOf('Boats come in.') + 'Boats come in.'.length);
      await b.page.keyboard.type(' Bravo stayed online.');
      await expect.poll(async () => (await stored()).content.includes('Bravo stayed online.'), { timeout: 30_000 }).toBe(true);

      // A comes back and opens the Today page, not the editor, and syncs from the island.
      await a.ctx.setOffline(false);
      const today = await a.ctx.newPage();
      await today.goto('/community');
      const island = today.getByRole('navigation', { name: 'Suite' });
      await expect(island.getByText(/waiting to sync|saved on this device/)).toBeVisible({ timeout: 30_000 });
      await island.getByRole('button', { name: 'Sync now' }).click();
      await expect(island.getByText(/waiting to sync|saved on this device|Syncing/)).toHaveCount(0, { timeout: 45_000 });

      // Whoever opens the script next — on any device — must find both edits, and the server must agree with itself.
      const both = (v: string) => v.includes('Still up. Alpha was offline.') && v.includes('Boats come in. Bravo stayed online.');
      const c = await writer(browser, 2);
      try {
        await c.page.waitForTimeout(6000);
        const row = await stored();
        expect(both(await c.script.inputValue()), 'a fresh device opens on both edits').toBe(true);
        expect(both(row.content), 'the stored text has both edits').toBe(true);
        expect(!!row.yjs_state && textOfState(row.yjs_state) === row.content, 'the stored text equals the stored state').toBe(true);
      } finally { await c.ctx.close(); }

      // B never heard about A's sync (it wasn't broadcast) and keeps typing: B's next save must merge with the
      // server's text, not overwrite it, so A's offline words survive a third edit.
      await caretAt(b, (await b.script.inputValue()).length);
      await b.page.keyboard.type(' Bravo again.');
      await expect.poll(async () => (await stored()).content.includes('Bravo again.'), { timeout: 30_000 }).toBe(true);
      const final = await stored();
      expect(final.content, 'A\'s offline edit survives B going on').toContain('Still up. Alpha was offline.');
      expect(final.content).toContain('Bravo stayed online.');
      expect(!!final.yjs_state && textOfState(final.yjs_state) === final.content, 'the stored text equals the stored state').toBe(true);
    } finally {
      await Promise.all([a.ctx.close(), b?.ctx.close()]);
    }
  });
});
