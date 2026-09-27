import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The breakdown, written into the script, in a real browser against a local
// stack: suggestions from the writer's CAPS, accepting one, tagging any words
// by selecting them, and the element card. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const SCRIPT = 'INT. CAVE - NIGHT\n\nSam lights the LANTERN and checks an old revolver.\n\nSAM\nWho’s there?\n\nEXT. RIDGE - DAWN\n\nThe lantern gutters out.\n';

async function axeViolations(page: Page): Promise<string[]> {
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async () => {
    const r = await (window as any).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] });
    return r.violations.map((v: any) => `${v.id}: ${v.nodes.slice(0, 3).map((n: any) => `${n.target.join(' ')} ${n.html.slice(0, 140)} ${n.any?.[0]?.message ?? ''}`).join(' | ')}`);
  });
}

async function selectInScript(page: Page, text: string) {
  await page.getByLabel('Script', { exact: true }).evaluate((el, t) => {
    const ta = el as HTMLTextAreaElement;
    const at = ta.value.indexOf(t);
    ta.focus();
    ta.setSelectionRange(at, at + t.length);
    // What a mouse selection ends with.
    ta.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  }, text);
}

test.describe('Breakdown in the script (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  let userId: string;
  let email: string;
  let projectId: string;
  let scriptId: string;

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    email = `bd.${Date.now()}@journey.test`;
    const { data } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { username: `bd${Date.now().toString(36)}` } });
    userId = data.user!.id;
    projectId = (await admin.from('projects').insert({ title: 'The Cave', creator_id: userId }).select('id').single()).data!.id;
    scriptId = (await admin.from('scripts').insert({ title: 'The Cave', content: SCRIPT, project_id: projectId, created_by: userId, last_edited_by: userId }).select('id').single()).data!.id;
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('project_id', projectId);
    await admin.auth.admin.deleteUser(userId);
  });

  test('tag in the script → price it in the Studio → push to budget → schedule on the stripboard', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });

    await page.goto(`/editor?script=${scriptId}`);
    await expect(page.getByLabel('Script', { exact: true })).toBeVisible();
    // Put the caret in scene 1, open the Breakdown tab, turn on tag mode.
    await page.getByLabel('Script', { exact: true }).evaluate((el) => { const ta = el as HTMLTextAreaElement; ta.focus(); ta.setSelectionRange(25, 25); ta.dispatchEvent(new Event('select', { bubbles: true })); });
    await page.getByRole('button', { name: 'Breakdown' }).click();
    await page.getByRole('switch', { name: 'Tag mode' }).click();
    await expect(page.getByText('Tag mode — select words to tag them')).toBeVisible();

    // The writer's CAPS are offered; accepting tags it in this scene.
    await page.getByRole('button', { name: /^Tag Lantern as Props$/ }).click({ timeout: 20_000 });
    await expect.poll(async () => (await admin.from('breakdown_elements').select('name').eq('project_id', projectId)).data?.map((e) => e.name)).toEqual(['Lantern']);

    // Select any words in the script and tag them from the floating bar.
    await selectInScript(page, 'old revolver');
    const bar = page.getByRole('dialog', { name: 'Tag “old revolver”' });
    await expect(bar).toBeVisible();
    await bar.getByRole('button', { name: /Props/ }).click();
    await expect.poll(async () => (await admin.from('breakdown_elements').select('name').eq('project_id', projectId).order('name')).data?.map((e) => e.name)).toEqual(['Lantern', 'old revolver']);
    const { data: tags } = await admin.from('scene_elements').select('element_id').eq('project_id', projectId);
    expect(tags).toHaveLength(2);

    // The element card: status, cost; the budget reads it.
    await page.getByRole('button', { name: /^old revolver/ }).click();
    const card = page.getByRole('region', { name: 'Element: old revolver' });
    await card.getByRole('radio', { name: 'Sourcing' }).click();
    await card.getByLabel('Cost').fill('85');
    await card.getByLabel('Cost').blur();
    await expect.poll(async () => (await admin.from('breakdown_elements').select('status, cost').eq('name', 'old revolver').single()).data).toEqual({ status: 'sourcing', cost: 85 });
    await expect(page.getByText('$85')).toBeVisible();

    // The breakdown UI (panel, element card, highlights, tag bar) passes WCAG 2.2 AA.
    await selectInScript(page, 'checks');
    await expect(page.getByRole('dialog', { name: 'Tag “checks”' })).toBeVisible();
    const violations = await axeViolations(page);
    expect(violations, violations.join('\n')).toEqual([]);
    await page.screenshot({ path: 'test-results/breakdown-editor.png', fullPage: false });

    // ── The Studio: the breakdown by category, rates, the budget ──
    await page.goto('/studio?tab=production&view=breakdown');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
    await page.goto('/studio?tab=production&view=breakdown');
    const props = page.getByRole('region', { name: 'Props' });
    await expect(props.getByRole('button', { name: /old revolver/ })).toBeVisible();
    await page.getByRole('button', { name: 'Categories & rates' }).click();
    const dialog = page.getByRole('dialog', { name: 'Categories & rates' });
    await dialog.getByLabel('Props unit cost').fill('20');
    await dialog.getByLabel('Props unit cost').blur();
    await expect.poll(async () => (await admin.from('breakdown_categories').select('unit_cost').eq('project_id', projectId).eq('key', 'props').single()).data?.unit_cost).toBe(20);
    await dialog.getByRole('button', { name: 'Done' }).click();
    await page.getByRole('button', { name: 'Push to budget' }).click();
    // Lantern has no cost of its own → the unit cost; the revolver has $85.
    await expect.poll(async () => (await admin.from('budget_items').select('category, amount').eq('project_id', projectId)).data).toEqual([{ category: 'Breakdown · Props', amount: 105 }]);
    await page.screenshot({ path: 'test-results/breakdown-studio.png', fullPage: true });
    expect(await axeViolations(page), 'breakdown view').toEqual([]);

    // ── The stripboard: drag a strip to a new day, then Alt+← it back ──
    await page.goto('/studio?tab=production&view=schedule');
    // Scheduling opens in pre-production; a writer can look early.
    await page.getByRole('button', { name: 'Open it now' }).click();
    const strip = page.getByRole('listitem', { name: /^Scene 2,/ });
    await strip.dragTo(page.getByRole('region', { name: 'A new shoot day' }));
    await expect.poll(async () => (await admin.from('scenes').select('shoot_day').eq('script_id', scriptId).eq('scene_number', 2).is('removed_at', null).single()).data?.shoot_day).toBe(2);
    await expect(page.getByRole('heading', { name: 'Day 2' })).toBeVisible();
    await page.getByRole('listitem', { name: /^Scene 2,/ }).focus();
    await page.keyboard.press('Alt+ArrowLeft');
    await expect.poll(async () => (await admin.from('scenes').select('shoot_day').eq('script_id', scriptId).eq('scene_number', 2).is('removed_at', null).single()).data?.shoot_day).toBe(1);
    await page.screenshot({ path: 'test-results/stripboard.png', fullPage: true });
    expect(await axeViolations(page), 'stripboard').toEqual([]);
  });
});
