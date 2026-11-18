import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, stackEnabled, stackSkipReason } from './support/stack';
import type { Page } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';

// A sweep of every admin screen as an admin, in a real browser against a local stack: each opens with its heading, throws no page
// error, logs no console error, and passes the accessibility check; a member is turned away from all of them. Opt-in: E2E_LOCAL_STACK=1.
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

async function axeViolations(page: Page): Promise<string[]> {
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => undefined))));
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async () => {
    const r = await (window as any).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] });
    return r.violations.map((v: any) => `${v.id}: ${v.nodes.slice(0, 3).map((n: any) => `${n.target.join(' ')} ${n.html.slice(0, 140)}`).join(' | ')}`);
  });
}


const SCREENS: Array<{ path: string; heading: RegExp }> = [
  { path: '/admin', heading: /admin panel/i },
  { path: '/admin/users', heading: /user management/i },
  { path: '/admin/analytics', heading: /analytics/i },
  { path: '/admin/errors', heading: /^errors$/i },
  { path: '/admin/audit-logs', heading: /audit logs/i },
  { path: '/admin/hub', heading: /hub posts/i },
  { path: '/admin/reports', heading: /^reports$/i },
  { path: '/admin/support', heading: /^support$/i },
  { path: '/admin/crafts', heading: /^crafts$/i },
  { path: '/admin/formats', heading: /project formats/i },
  { path: '/admin/brief-questions', heading: /brief questions/i },
  { path: '/admin/channel-presets', heading: /channel suggestions/i },
];

test.describe('Admin sweep (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let admin: SupabaseClient;
  const boss = { id: '', email: `as-boss.${TAG}@journey.test` };
  const member = { id: '', email: `as-mem.${TAG}@journey.test` };

  test.beforeAll(async ({ stack }) => {
    admin = stack.admin;
    for (const [who, name] of [[boss, 'asboss'], [member, 'asmem']] as const) {
      who.id = (await admin.auth.admin.createUser({ email: who.email, password: PASSWORD, email_confirm: true, user_metadata: { username: `${name}${TAG}` } })).data.user!.id;
    }
    await admin.from('profiles').update({ is_admin: true }).eq('id', boss.id);
  });
  test.afterAll(async () => {
    if (!admin) return;
    for (const who of [boss, member]) if (who.id) await admin.auth.admin.deleteUser(who.id);
  });

  const signIn = async (page: Page, who: { email: string }) => {
    await page.goto('/auth');
    await page.fill('input[name="email"]', who.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
  };

  test('every admin screen opens, is quiet and is accessible', async ({ page }) => {
    test.setTimeout(300_000);
    const problems: string[] = [];
    page.on('pageerror', (e) => problems.push(`pageerror ${page.url()}: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource.*(401|403|404)/.test(m.text())) problems.push(`console ${page.url()}: ${m.text().slice(0, 200)}`); });
    await signIn(page, boss);
    for (const sc of SCREENS) {
      await page.goto(sc.path);
      await expect(page.getByRole('heading', { name: sc.heading }).first(), `${sc.path} heading`).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(/something went wrong|could not load/i), `${sc.path} error state`).toHaveCount(0);
      const v = await axeViolations(page);
      if (v.length) problems.push(`axe ${sc.path}: ${v.join(' || ')}`);
    }
    expect(problems).toEqual([]);
  });

  test('a member is turned away from every admin screen', async ({ page }) => {
    test.setTimeout(200_000);
    await signIn(page, member);
    for (const sc of SCREENS) {
      await page.goto(sc.path);
      await page.waitForLoadState('domcontentloaded');
      expect(new URL(page.url()).pathname, `${sc.path} must not stay`).not.toMatch(/^\/admin/);
    }
  });
});
