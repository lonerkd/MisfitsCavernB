import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as Y from 'yjs';

// Conflict-free co-writing (ADR 0008) with two real browsers: simultaneous
// typing in different places, in the same place, a fresh session joining after,
// and — the invariant the design rests on — the stored script text and the
// stored Yjs state always spell the same text once things settle.
// Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const BASE = 'INT. KITCHEN - NIGHT\n\nMAYA\nStill up.\n\nEXT. PIER - DAY\n\nBoats come in.\n';

test.describe.serial('Co-writing with Yjs (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const people = [
    { id: '', email: `cwa.${TAG}@journey.test` },
    { id: '', email: `cwb.${TAG}@journey.test` },
  ];
  let projectId = '';
  let scriptId = '';

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    for (const [i, p] of people.entries()) {
      p.id = (await admin.auth.admin.createUser({ email: p.email, password: PASSWORD, email_confirm: true, user_metadata: { username: `cw${i}${TAG}` } })).data.user!.id;
    }
    projectId = (await admin.from('projects').insert({ title: `Cowrite ${TAG}`, creator_id: people[0].id }).select('id').single()).data!.id;
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
    await admin.from('scripts').update({ content: BASE, yjs_state: null, updated_at: new Date().toISOString() }).eq('id', scriptId);
  };
  const stored = async () => (await admin.from('scripts').select('content, yjs_state').eq('id', scriptId).single()).data as { content: string; yjs_state: string | null };
  /** The text a stored Yjs state spells. */
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

  test('typing at the same moment in two places: both edits survive, all windows agree, and the stored text equals the stored state', async ({ browser }) => {
    test.setTimeout(180_000);
    await reset();
    const a = await writer(browser, 0);
    const b = await writer(browser, 1);
    try {
      await expect(a.script).toHaveValue(BASE, { timeout: 30_000 });
      await expect(b.script).toHaveValue(BASE, { timeout: 30_000 });

      await caretAt(a, BASE.indexOf('Still up.') + 'Still up.'.length);
      await caretAt(b, BASE.indexOf('Boats come in.') + 'Boats come in.'.length);
      await Promise.all([
        a.page.keyboard.type(' Alpha alpha alpha.', { delay: 25 }),
        b.page.keyboard.type(' Bravo bravo bravo.', { delay: 25 }),
      ]);

      const both = (v: string) => v.includes('Still up. Alpha alpha alpha.') && v.includes('Boats come in. Bravo bravo bravo.');
      await expect.poll(async () => both(await a.script.inputValue()), { timeout: 30_000 }).toBe(true);
      await expect.poll(async () => both(await b.script.inputValue()), { timeout: 30_000 }).toBe(true);
      expect(await a.script.inputValue()).toBe(await b.script.inputValue());

      // Once the saves settle, the script and its Yjs state say the same thing.
      await expect.poll(async () => {
        const s = await stored();
        return both(s.content) && !!s.yjs_state && textOfState(s.yjs_state) === s.content;
      }, { timeout: 30_000 }).toBe(true);

      // A session that joins afterwards opens on the merged text.
      const c = await writer(browser, 1);
      try {
        await expect.poll(async () => both(await c.script.inputValue()), { timeout: 30_000 }).toBe(true);
      } finally { await c.ctx.close(); }
    } finally {
      await Promise.all([a.ctx.close(), b.ctx.close()]);
    }
  });

  test('typing at the very same spot at the same moment: both insertions are kept and the windows converge', async ({ browser }) => {
    test.setTimeout(180_000);
    await reset();
    const a = await writer(browser, 0);
    const b = await writer(browser, 1);
    try {
      await expect(a.script).toHaveValue(BASE, { timeout: 30_000 });
      await expect(b.script).toHaveValue(BASE, { timeout: 30_000 });
      const at = BASE.indexOf('Still up.');
      await caretAt(a, at);
      await caretAt(b, at);
      await Promise.all([
        a.page.keyboard.type('(aaaa) ', { delay: 20 }),
        b.page.keyboard.type('(bbbb) ', { delay: 20 }),
      ]);
      const both = (v: string) => v.includes('(aaaa) ') && v.includes('(bbbb) ') && v.includes('Still up.');
      await expect.poll(async () => both(await a.script.inputValue()) && both(await b.script.inputValue()), { timeout: 30_000 }).toBe(true);
      await expect.poll(async () => (await a.script.inputValue()) === (await b.script.inputValue()), { timeout: 30_000 }).toBe(true);
      await expect.poll(async () => {
        const s = await stored();
        return both(s.content) && !!s.yjs_state && textOfState(s.yjs_state) === s.content && s.content === (await a.script.inputValue());
      }, { timeout: 30_000 }).toBe(true);
    } finally {
      await Promise.all([a.ctx.close(), b.ctx.close()]);
    }
  });

  test('one writer deletes a paragraph while the other types inside it: the windows converge and nothing is left half-merged on the server', async ({ browser }) => {
    test.setTimeout(180_000);
    await reset();
    const a = await writer(browser, 0);
    const b = await writer(browser, 1);
    try {
      await expect(a.script).toHaveValue(BASE, { timeout: 30_000 });
      await expect(b.script).toHaveValue(BASE, { timeout: 30_000 });
      const start = BASE.indexOf('EXT. PIER - DAY');
      await a.script.evaluate((el, [from, to]) => {
        const t = el as HTMLTextAreaElement;
        t.focus();
        t.setSelectionRange(from, to);
      }, [start, BASE.length]);
      await caretAt(b, BASE.indexOf('Boats'));
      await Promise.all([
        a.page.keyboard.press('Delete'),
        b.page.keyboard.type('Many ', { delay: 20 }),
      ]);
      await expect.poll(async () => (await a.script.inputValue()) === (await b.script.inputValue()), { timeout: 30_000 }).toBe(true);
      await expect.poll(async () => {
        const s = await stored();
        return !!s.yjs_state && textOfState(s.yjs_state) === s.content && s.content === (await a.script.inputValue());
      }, { timeout: 30_000 }).toBe(true);
      // The kitchen scene, untouched by either, is intact.
      expect(await a.script.inputValue()).toContain('INT. KITCHEN - NIGHT\n\nMAYA\nStill up.');
    } finally {
      await Promise.all([a.ctx.close(), b.ctx.close()]);
    }
  });
});
