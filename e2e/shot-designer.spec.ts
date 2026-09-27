import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The shot designer in a real browser against a local stack: add a shot, set
// the camera on the visual picker, reorder, and see a script-made shot's line.
// Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const SCRIPT = 'INT. CAVE - NIGHT\n\nSam lights a match.\n';

async function axeViolations(page: Page): Promise<string[]> {
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async () => {
    const r = await (window as any).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] });
    return r.violations.map((v: any) => `${v.id}: ${v.nodes.slice(0, 3).map((n: any) => `${n.target.join(' ')} ${n.html.slice(0, 140)} ${n.any?.[0]?.message ?? ''}`).join(' | ')}`);
  });
}

test.describe('Shot designer (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  let userId: string;
  let email: string;
  let projectId: string;
  let scriptId: string;
  let stack: { API_URL: string; ANON_KEY: string };

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    stack = s;
    email = `sd.${Date.now()}@journey.test`;
    const { data } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { username: `sd${Date.now().toString(36)}` } });
    userId = data.user!.id;
    projectId = (await admin.from('projects').insert({ title: 'Boards', creator_id: userId, status: 'pre-production' }).select('id').single()).data!.id;
    scriptId = (await admin.from('scripts').insert({ title: 'Boards', content: SCRIPT, project_id: projectId, created_by: userId, last_edited_by: userId }).select('id').single()).data!.id;
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('project_id', projectId);
    await admin.auth.admin.deleteUser(userId);
  });

  test('add shots, set the camera visually, reorder, see the script line', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });

    await page.goto('/studio?tab=scenes');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
    const scene = page.getByRole('article', { name: /^Scene 1:/ });
    await expect(scene).toBeVisible({ timeout: 20_000 });
    const sceneId = (await admin.from('scenes').select('id').eq('project_id', projectId).single()).data!.id;

    await scene.getByRole('button', { name: 'Shot', exact: true }).click();
    await expect(scene.getByRole('article', { name: /^Shot 1\.1$/ })).toBeVisible({ timeout: 10_000 });

    // A "Shot" margin note in the script (as the writer) becomes a shot that shows its line.
    const writer = createClient(stack.API_URL, stack.ANON_KEY, { auth: { persistSession: false } });
    await writer.auth.signInWithPassword({ email, password: PASSWORD });
    const note = await writer.rpc('add_script_annotation', { p_script: scriptId, p_line: 2, p_type: 'shot', p_text: 'Match flares', p_scene_ordinal: 0, p_scene_heading: 'INT. CAVE - NIGHT' });
    expect(note.error).toBeNull();
    await page.reload();
    await expect(scene.getByRole('button', { name: /From the script: “Match flares”/ })).toBeVisible({ timeout: 20_000 });

    // Camera on the visual picker.
    const first = scene.getByRole('article', { name: /^Shot 1\.1$/ });
    await first.getByRole('button', { name: /^Camera for shot 1\.1/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Camera · shot 1.1' });
    await dialog.getByRole('button', { name: /^CU\b/ }).click();
    await dialog.getByRole('button', { name: 'Low', exact: true }).click();
    await dialog.getByRole('button', { name: 'Dolly', exact: true }).click();
    await dialog.getByRole('button', { name: '35mm', exact: true }).click();
    await expect.poll(async () => (await admin.from('shots').select('shot_size, angle, movement, lens').eq('scene_id', sceneId).eq('shot_number', '1').single()).data)
      .toEqual({ shot_size: 'CU', angle: 'low', movement: 'dolly', lens: '35mm' });
    expect(await axeViolations(page)).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(first.getByRole('button', { name: /^Camera for shot 1\.1: CU · Low · Dolly · 35mm/ })).toBeVisible();

    // The script's shot (1.2) moved ahead of the first.
    const second = scene.getByRole('article', { name: /^Shot 1\.2$/ });
    await second.getByRole('button', { name: 'Move shot 1.2 earlier' }).click();
    await expect.poll(async () => (await admin.from('shots').select('shot_number').eq('scene_id', sceneId).order('order_index')).data?.map((x) => x.shot_number))
      .toEqual(['2', '1']);
    expect(await axeViolations(page)).toEqual([]);
  });
});
