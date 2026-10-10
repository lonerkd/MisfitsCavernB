import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Fountain emphasis while writing: *italic*, **bold**, _underline_ show
// styled in the editor (markers dimmed), every character stays where the
// textarea puts it (so the caret doesn't drift), and the saved text and the
// Fountain export keep the markers. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

test.describe('Emphasis in the editor (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const me = { id: '', email: `em.${TAG}@journey.test` };
  let scriptId = '';

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    me.id = (await admin.auth.admin.createUser({ email: me.email, password: PASSWORD, email_confirm: true, user_metadata: { username: `em${TAG}` } })).data.user!.id;
    scriptId = (await admin.from('scripts').insert({ title: `Emphasis ${TAG}`, content: 'INT. HARBOUR - NIGHT\n\n', created_by: me.id, last_edited_by: me.id }).select('id').single()).data!.id;
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('id', scriptId);
    if (me.id) await admin.auth.admin.deleteUser(me.id);
  });

  test('typed emphasis is drawn styled, aligned, and saved with its markers', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/auth');
    await page.fill('input[name="email"]', me.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });

    await page.goto(`/editor?script=${scriptId}`);
    const ta = page.getByLabel('Script', { exact: true });
    await expect(ta).toHaveValue(/HARBOUR/, { timeout: 20_000 });
    await ta.click();
    await page.keyboard.press('Control+End');
    const line = 'She is *very* late, **not** sorry, _never_ again.';
    await page.keyboard.type(line);

    const overlay = page.locator('[data-emphasis]');
    await expect(page.locator('[data-emphasis="italic"]')).toHaveText('very');
    await expect(page.locator('[data-emphasis="bold"]')).toHaveText('not');
    await expect(page.locator('[data-emphasis="underline"]')).toHaveText('never');
    expect(await overlay.evaluateAll((els) => els.filter((e) => e.getAttribute('data-emphasis') === 'marker').map((e) => e.textContent).join(''))).toBe('******__');
    const looks = await page.locator('[data-emphasis="italic"]').evaluate((e) => getComputedStyle(e).fontStyle);
    expect(looks).toBe('italic');
    expect(await page.locator('[data-emphasis="bold"]').evaluate((e) => getComputedStyle(e).fontWeight)).toBe('700');

    // Aligned: the styled line is exactly as wide as the same text set plain
    // in the textarea's font — so each letter sits under its caret position.
    const widths = await page.locator('[data-emphasis="italic"]').evaluate((span, text) => {
      const lineEl = span.closest('[data-emphasis-line]')!.parentElement!;
      const probe = document.createElement('span');
      const cs = getComputedStyle(document.querySelector('textarea[aria-label="Script"]')!);
      Object.assign(probe.style, { position: 'absolute', visibility: 'hidden', whiteSpace: 'pre', fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: getComputedStyle(lineEl).fontWeight, letterSpacing: cs.letterSpacing });
      probe.textContent = text;
      document.body.appendChild(probe);
      const plain = probe.getBoundingClientRect().width;
      probe.remove();
      // The drawn text of the line (margin-note controls sit outside it).
      const r = document.createRange();
      r.selectNodeContents(lineEl.querySelector('[data-emphasis-line]')!);
      return { styled: r.getBoundingClientRect().width, plain };
    }, line);
    expect(Math.abs(widths.styled - widths.plain)).toBeLessThan(1);

    // Saved with its markers (the source is Fountain).
    await expect.poll(async () => (await admin.from('scripts').select('content').eq('id', scriptId).single()).data?.content, { timeout: 20_000 })
      .toContain(line);
  });
});
