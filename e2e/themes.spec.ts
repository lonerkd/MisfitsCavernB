import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';
import type { Page } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';

// Themes in a real browser against a local stack: a preset picked in
// Settings › Appearance applies at once, stays after a reload, follows the
// account to another device, and reads (colour contrast) on the pages people
// live in. System follows the device's light/dark setting. Opt-in:
// E2E_LOCAL_STACK=1.
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

async function contrastViolations(page: Page): Promise<string[]> {
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async () => {
    const r = await (window as any).axe.run(document, { runOnly: { type: 'rule', values: ['color-contrast'] }, resultTypes: ['violations'] });
    return r.violations.flatMap((v: any) => v.nodes.slice(0, 5).map((n: any) => `${n.target.join(' ')} ${(n.any[0]?.message || '').slice(0, 120)}`));
  });
}

async function signIn(page: Page, email: string) {
  await signInAs(page, { email: email, password: PASSWORD });
}

const theme = (page: Page) => page.evaluate(() => document.documentElement.dataset.theme);

test.describe('Themes (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let admin: SupabaseClient;
  const owner = { id: '', email: `themes.${TAG}@journey.test` };
  let projectId: string;

  test.beforeAll(async ({ stack }) => {
    admin = stack.admin;
    owner.id = (await stack.createUser({ email: owner.email, password: PASSWORD, username: `themer${TAG}` })).id;
    projectId = (await admin.from('projects').insert({ title: `Lantern Road ${TAG}`, creator_id: owner.id, status: 'pre-production' }).select('id').single()).data!.id;
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('projects').delete().eq('id', projectId);
  });

  test('a preset applies at once, stays, follows the account, and reads', async ({ page, browser }) => {
    test.setTimeout(150_000);
    await signIn(page, owner.email);
    await page.goto('/settings');
    const picker = page.getByRole('radiogroup', { name: 'Theme' });
    await picker.getByRole('radio', { name: /^Paper/ }).click({ timeout: 30_000 });
    await expect.poll(() => theme(page)).toBe('paper');
    await expect(picker.getByRole('radio', { name: /^Paper/ })).toHaveAttribute('aria-checked', 'true');
    await expect.poll(async () => (await admin.from('profiles').select('ui_prefs').eq('id', owner.id).single()).data?.ui_prefs?.theme?.id, { timeout: 15_000 }).toBe('paper');

    // Readable where people work, in the light theme.
    for (const path of ['/settings', '/projects', `/projects/${projectId}`]) {
      await page.goto(path);
      await expect.poll(() => theme(page)).toBe('paper');
      await page.waitForTimeout(1500);
      const violations = await contrastViolations(page);
      expect(violations, `${path}\n${violations.join('\n')}`).toEqual([]);
    }

    // Another device, nothing stored locally: the account's theme arrives.
    const other = await browser.newContext();
    const second = await other.newPage();
    await signIn(second, owner.email);
    await expect.poll(() => theme(second), { timeout: 20_000 }).toBe('paper');
    await second.reload();
    await expect.poll(() => theme(second)).toBe('paper');
    await other.close();
  });

  test('System follows the device between Cavern and Paper', async ({ page }) => {
    test.setTimeout(90_000);
    await signIn(page, owner.email);
    await page.goto('/settings');
    await page.emulateMedia({ colorScheme: 'light' });
    await page.getByRole('radiogroup', { name: 'Theme' }).getByRole('radio', { name: /^System/ }).click({ timeout: 30_000 });
    await expect.poll(() => theme(page)).toBe('paper');
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect.poll(() => theme(page)).toBe('default');
    await page.reload();
    await expect.poll(() => theme(page)).toBe('default');
  });
});
