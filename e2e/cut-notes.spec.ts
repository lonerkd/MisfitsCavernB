import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Cut notes on script lines against a local stack: the script beside the cut,
// pin a note to a line, see it quoted, open it in the script (the margin marker
// opens on its line) and follow its link back to the cut. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const SCRIPT = 'INT. CAVE - NIGHT\n\nSam lights a match.\n\nSAM\nWho’s there?\n\nEXT. RIDGE - DAWN\n\nMaya climbs into the light.\n\nMAYA\nYou came back.\n';

async function axeViolations(page: Page): Promise<string[]> {
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async () => {
    const r = await (window as any).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] });
    return r.violations.map((v: any) => `${v.id}: ${v.nodes.slice(0, 3).map((n: any) => `${n.target.join(' ')} ${n.html.slice(0, 140)} ${n.any?.[0]?.message ?? ''}`).join(' | ')}`);
  });
}

test.describe('Cut notes on script lines (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  let userId: string;
  let email: string;
  let projectId: string;
  let scriptId: string;
  let cutId: string;

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    email = `cn.${Date.now()}@journey.test`;
    const { data } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { username: `cn${Date.now().toString(36)}` } });
    userId = data.user!.id;
    projectId = (await admin.from('projects').insert({ title: 'Cut lines', creator_id: userId, status: 'post-production' }).select('id').single()).data!.id;
    scriptId = (await admin.from('scripts').insert({ title: 'Cut lines', content: SCRIPT, project_id: projectId, created_by: userId, last_edited_by: userId }).select('id').single()).data!.id;
    cutId = (await admin.from('post_cuts').insert({ project_id: projectId, title: 'Assembly', url: 'https://youtu.be/dQw4w9WgXcQ', created_by: userId }).select('id').single()).data!.id;
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('project_id', projectId);
    await admin.from('projects').delete().eq('id', projectId);
    await admin.auth.admin.deleteUser(userId);
  });

  test('pin a note to a line, open it in the script, come back to the cut', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });

    // A link to the cut opens its project's Post tab.
    await page.goto(`/studio?tab=post&project=${projectId}&cut=${cutId}&t=12`);
    const script = page.getByRole('region', { name: 'Script beside the cut' });
    await expect(script).toBeVisible({ timeout: 20_000 });
    await expect(script.getByRole('heading')).toContainText('INT. CAVE - NIGHT', { timeout: 20_000 });

    // Scene strip → scene 2; its lines are a script page.
    await script.getByRole('group', { name: 'Scenes along the cut' }).getByRole('button', { name: /^Scene 2:/ }).click();
    await expect(script.getByRole('heading')).toContainText('EXT. RIDGE - DAWN');
    await expect(page.getByText(/About Sc 2 · EXT\. RIDGE - DAWN/)).toBeVisible();

    await script.getByRole('button', { name: 'You came back.', exact: true }).click();
    await expect(script.getByRole('button', { name: 'You came back.', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('On Sc 2 ·')).toBeVisible();

    await page.getByLabel('Timecode').fill('1:23');
    await page.getByLabel('Note', { exact: true }).fill('Hold on Maya before the line');
    await page.getByRole('button', { name: 'Note', exact: true }).click();
    const notes = page.locator('[class*="noteRow"]');
    await expect(notes.filter({ hasText: 'Hold on Maya before the line' })).toContainText('You came back.', { timeout: 10_000 });
    // The line now carries the note's marker.
    await expect(script.getByRole('button', { name: /1 note on this line — play from 1:23/ })).toBeVisible();

    const saved = (await admin.from('post_notes').select('line_offset, line_text, scene_id').eq('cut_id', cutId).single()).data!;
    expect(saved).toMatchObject({ line_text: 'You came back.' });

    await page.waitForTimeout(800);
    expect(await axeViolations(page)).toEqual([]);

    // "In script" opens the editor on the line, its margin note open.
    await notes.filter({ hasText: 'Hold on Maya' }).getByRole('button', { name: 'Open the line in the script' }).click();
    await page.waitForURL(/\/editor\?script=.*&note=/, { timeout: 20_000 });
    const dialog = page.getByRole('dialog', { name: /^Cut notes on line 13$/ });
    await expect(dialog).toBeVisible({ timeout: 20_000 });
    await expect(dialog).toContainText('Hold on Maya before the line');
    await expect(dialog).toContainText('Assembly');

    // Resolve from the script; the marker stays, the note reads resolved.
    await dialog.getByRole('button', { name: 'Resolve note' }).click();
    await expect(dialog.getByRole('button', { name: 'Reopen note' })).toBeVisible();
    await expect.poll(async () => (await admin.from('post_notes').select('resolved_by').eq('cut_id', cutId).single()).data?.resolved_by).toBe(userId);

    // Its timecode goes back to the cut.
    await dialog.getByRole('link', { name: /1:23/ }).click();
    await page.waitForURL(/\/studio\?tab=post/, { timeout: 20_000 });
    await expect(page.getByRole('region', { name: 'Script beside the cut' })).toBeVisible({ timeout: 20_000 });
  });
});
