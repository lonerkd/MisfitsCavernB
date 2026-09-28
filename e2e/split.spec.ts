import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Split screen in a real browser against a local stack: the script beside
// the Studio, linked — the caret's scene lights up in the Studio, the Studio
// sends the script to a scene — any surface in either pane, keyboard resize,
// and only this site may frame its pages. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const SCRIPT = 'INT. CAVE - NIGHT\n\nSam lights the lantern.\n\nSAM\nWho’s there?\n\nEXT. RIDGE - DAWN\n\nWind over the ridge.\n';

async function axeViolations(page: Page): Promise<string[]> {
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async () => {
    const r = await (window as any).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] });
    return r.violations.map((v: any) => `${v.id}: ${v.nodes.slice(0, 3).map((n: any) => `${n.target.join(' ')} ${n.html.slice(0, 140)} ${n.any?.[0]?.message ?? ''}`).join(' | ')}`);
  });
}

test.describe('Split screen (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  let userId: string;
  let email: string;
  let projectId: string;
  let scriptId: string;

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    email = `sp.${Date.now()}@journey.test`;
    const { data } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { username: `sp${Date.now().toString(36)}` } });
    userId = data.user!.id;
    projectId = (await admin.from('projects').insert({ title: 'Two Panes', creator_id: userId, status: 'pre-production' }).select('id').single()).data!.id;
    scriptId = (await admin.from('scripts').insert({ title: 'Two Panes', content: SCRIPT, project_id: projectId, created_by: userId, last_edited_by: userId }).select('id').single()).data!.id;
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('project_id', projectId);
    await admin.auth.admin.deleteUser(userId);
  });

  test('only this site may frame its pages; public share pages stay embeddable', async ({ request }) => {
    const app = await request.get('/auth');
    expect(app.headers()['content-security-policy']).toContain("frame-ancestors 'self'");
    expect(app.headers()['x-frame-options']).toBe('SAMEORIGIN');
    const share = await request.get('/p/not-a-token');
    expect(share.headers()['content-security-policy'] ?? '').not.toContain('frame-ancestors');
  });

  test('script beside the Studio, linked both ways; any surface; keyboard resize', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });

    await page.goto('/studio?tab=scenes');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
    await expect.poll(async () => (await admin.from('scenes').select('id').eq('project_id', projectId).is('removed_at', null)).data?.length, { timeout: 20_000 }).toBe(2);
    const scenes = (await admin.from('scenes').select('id, scene_number').eq('project_id', projectId).order('scene_number')).data!;

    // Ctrl+\ from the script opens it beside its companion, the Studio's scenes.
    await page.goto(`/editor?script=${scriptId}`);
    // The editor's view transition briefly shows two; wait for it to settle.
    await expect(page.getByLabel('Script', { exact: true })).toHaveCount(1, { timeout: 20_000 });
    await page.keyboard.press('Control+Backslash');
    await page.waitForURL(/\/split\?/);
    const first = page.frameLocator('iframe[title^="First pane"]');
    const second = page.frameLocator('iframe[title^="Second pane"]');
    await expect(first.getByLabel('Script', { exact: true })).toHaveCount(1, { timeout: 20_000 });
    await expect(second.getByRole('article', { name: /^Scene 2:/ })).toBeVisible({ timeout: 20_000 });
    // Panes carry no suite chrome of their own.
    await expect(first.getByRole('navigation', { name: 'Suite' })).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'Suite' })).toHaveCount(0);

    // Caret into scene 2 → the Studio shows scene 2.
    await first.getByLabel('Script', { exact: true }).evaluate((el) => {
      const ta = el as HTMLTextAreaElement;
      const at = ta.value.indexOf('Wind over');
      ta.focus();
      ta.setSelectionRange(at, at);
      ta.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });
    await expect(second.getByRole('article', { name: /^Scene 2:/ })).toHaveAttribute('aria-current', 'location', { timeout: 10_000 });

    // The Studio sends the script to scene 1.
    await second.getByRole('button', { name: 'Open scene 1 in the script' }).click();
    await expect.poll(() => first.getByLabel('Script', { exact: true }).evaluate((el) => (el as HTMLTextAreaElement).selectionStart), { timeout: 10_000 }).toBe(0);
    // …and the script's new scene comes back to the Studio.
    await expect(second.getByRole('article', { name: /^Scene 1:/ })).toHaveAttribute('aria-current', 'location', { timeout: 10_000 });

    // Unlinked panes don't follow.
    await page.getByRole('switch', { name: 'Linked' }).click();
    await first.getByLabel('Script', { exact: true }).evaluate((el) => {
      const ta = el as HTMLTextAreaElement;
      const at = ta.value.indexOf('Wind over');
      ta.focus();
      ta.setSelectionRange(at, at);
      ta.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });
    await page.waitForTimeout(800);
    await expect(second.getByRole('article', { name: /^Scene 1:/ })).toHaveAttribute('aria-current', 'location');
    await page.getByRole('switch', { name: 'Linked' }).click();

    // Any surface in either pane; the URL remembers where the panes are.
    await page.getByRole('region', { name: /^Second pane/ }).getByRole('button', { name: 'Scenes' }).click();
    await page.getByRole('dialog', { name: 'Show in this pane' }).getByRole('button', { name: 'Readiness' }).click();
    await expect(second.getByRole('region', { name: 'Ready to shoot' })).toBeVisible({ timeout: 20_000 });
    await expect.poll(() => new URL(page.url()).searchParams.get('b')).toContain('view=readiness');
    // Linked: the caret's scene opens in Readiness too.
    await first.getByLabel('Script', { exact: true }).evaluate((el) => {
      const ta = el as HTMLTextAreaElement;
      ta.focus();
      ta.setSelectionRange(5, 5);
      ta.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });
    await expect(second.locator(`#rd-row-${scenes[0].id} button[aria-expanded="true"]`)).toBeVisible({ timeout: 10_000 });

    // Keyboard resize; swap.
    const divider = page.getByRole('separator', { name: 'Resize the panes' });
    await divider.focus();
    await page.keyboard.press('ArrowRight');
    await expect(divider).toHaveAttribute('aria-valuenow', '55');
    await page.getByRole('button', { name: 'Swap the panes' }).click();
    await expect(page.frameLocator('iframe[title^="First pane"]').getByRole('region', { name: 'Ready to shoot' })).toBeVisible({ timeout: 20_000 });

    expect(await axeViolations(page)).toEqual([]);
  });
});
