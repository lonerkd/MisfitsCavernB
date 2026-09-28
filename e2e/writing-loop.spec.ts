import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The writing loop in the editor against a local stack: typed words count
// toward today's goal (a paste doesn't), the goal and sprint length are the
// writer's own, a sprint counts its words, and the day is saved. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

async function axeViolations(page: Page): Promise<string[]> {
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async () => {
    const r = await (window as any).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] });
    return r.violations.map((v: any) => `${v.id}: ${v.nodes.slice(0, 3).map((n: any) => `${n.target.join(' ')} ${n.html.slice(0, 140)} ${n.any?.[0]?.message ?? ''}`).join(' | ')}`);
  });
}

test.describe('Writing loop (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  let userId: string;
  let email: string;
  let scriptId: string;

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    email = `wl.${Date.now()}@journey.test`;
    const { data } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { username: `wl${Date.now().toString(36)}` } });
    userId = data.user!.id;
    scriptId = (await admin.from('scripts').insert({ title: 'Loop', content: 'INT. CAVE - NIGHT\n\n', created_by: userId, last_edited_by: userId }).select('id').single()).data!.id;
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('id', scriptId);
    await admin.auth.admin.deleteUser(userId);
  });

  test('typed words count, pastes don’t; goal, sprint and the saved day', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });

    await page.goto(`/editor?script=${scriptId}`);
    const ta = page.getByLabel('Script', { exact: true });
    await expect(ta).toHaveCount(1, { timeout: 20_000 });
    const loop = page.getByRole('region', { name: 'Writing loop' });
    await expect(loop).toContainText('/ 500 words typed today', { timeout: 20_000 });

    // Typing counts.
    await ta.click();
    await page.keyboard.press('Control+End');
    await page.keyboard.type('Sam lights a match and waits. ');
    await expect(loop).toContainText(/Today6\/ 500 words typed today/);

    // A paste (one big change) doesn't.
    await ta.evaluate((el, text) => {
      const t = el as HTMLTextAreaElement;
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
      setter.call(t, t.value + text);
      t.dispatchEvent(new Event('input', { bubbles: true }));
    }, ' ' + Array(60).fill('pasted').join(' '));
    await expect(loop).toContainText(/Today6\/ 500 words typed today/);

    // The goal is the writer's.
    await loop.getByRole('button', { name: 'Change the daily goal' }).click();
    await loop.getByLabel('Daily goal').fill('100');
    await loop.getByRole('button', { name: 'Save the goal' }).click();
    await expect(loop).toContainText('/ 100 words typed today');
    await expect.poll(async () => (await admin.from('profiles').select('daily_word_goal').eq('id', userId).single()).data?.daily_word_goal).toBe(100);

    // Sprint length, then a sprint counts its words.
    await loop.getByRole('button', { name: 'Shorter sprint' }).click();
    await expect(loop).toContainText('10 min');
    await loop.getByRole('button', { name: 'Start sprint' }).click();
    await ta.click();
    await page.keyboard.press('Control+End');
    await page.keyboard.type(' She turns around. ');
    await expect(loop).toContainText('3 words this sprint');

    await page.waitForTimeout(500);
    expect(await axeViolations(page)).toEqual([]);

    // A pause in typing saves the day; a reload shows the same numbers and the goal.
    await expect.poll(async () => (await admin.from('writing_days').select('words, goal').eq('user_id', userId).maybeSingle()).data, { timeout: 15_000 })
      .toMatchObject({ words: 9, goal: 100 });
    await page.reload();
    await expect(page.getByRole('region', { name: 'Writing loop' })).toContainText(/Today9\/ 100 words typed today/, { timeout: 20_000 });
  });
});
