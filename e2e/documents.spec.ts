import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Paperwork in a real browser against a local stack: what's still needed
// (insurance, a location's permit, a crew deal memo), one added in a click,
// granted (the location's permit follows) and a file attached. Opt-in:
// E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

async function axeViolations(page: Page): Promise<string[]> {
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
    .map((a) => a.finished.catch(() => undefined))));
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async () => {
    const r = await (window as any).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] });
    return r.violations.map((v: any) => `${v.id}: ${v.nodes.slice(0, 3).map((n: any) => `${n.target.join(' ')} ${n.html.slice(0, 140)} ${n.any?.[0]?.message ?? ''}`).join(' | ')}`);
  });
}

test.describe('Paperwork (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const owner = { id: '', email: `paper-owner.${TAG}@journey.test` };
  const crew = { id: '', email: `paper-crew.${TAG}@journey.test` };
  let projectId: string;
  let locationId: string;

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    for (const [who, name] of [[owner, `powner${TAG}`], [crew, `pcrew${TAG}`]] as const) {
      who.id = (await admin.auth.admin.createUser({ email: who.email, password: PASSWORD, email_confirm: true, user_metadata: { username: name } })).data.user!.id;
    }
    projectId = (await admin.from('projects').insert({ title: `Papers ${TAG}`, creator_id: owner.id, status: 'pre-production' }).select('id').single()).data!.id;
    await admin.from('project_crew').insert({ project_id: projectId, user_id: crew.id, craft: 'Gaffer', status: 'confirmed' });
    locationId = (await admin.from('project_locations').insert({ project_id: projectId, name: 'HARBOR', permit: 'needed' }).select('id').single()).data!.id;
  });

  test.afterAll(async () => {
    if (!admin) return;
    const { data } = await admin.from('project_documents').select('storage_path').eq('project_id', projectId);
    const paths = (data ?? []).map((d) => d.storage_path).filter(Boolean) as string[];
    if (paths.length) await admin.storage.from('project-papers').remove(paths);
    await admin.from('projects').delete().eq('id', projectId);
    for (const who of [owner, crew]) await admin.auth.admin.deleteUser(who.id);
  });

  test('still needed → added → granted, with the file attached', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/auth');
    await page.fill('input[name="email"]', owner.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });

    await page.goto('/studio?tab=production&view=paperwork');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);

    const needed = page.getByRole('region', { name: /Still needed/ });
    await expect(needed.getByText('Production insurance')).toBeVisible({ timeout: 20_000 });
    await expect(needed.getByText(`Crew deal memo — pcrew${TAG}`)).toBeVisible();
    await expect(await axeViolations(page)).toEqual([]);

    await needed.getByRole('button', { name: 'Add Filming permit — HARBOR' }).click();
    await expect(needed.getByText('Filming permit — HARBOR')).toHaveCount(0);

    await page.getByRole('button', { name: 'Edit Filming permit — HARBOR' }).click();
    await page.getByRole('radiogroup', { name: 'Filming permit — HARBOR status' }).getByRole('radio', { name: 'Granted' }).click();
    await expect.poll(async () => (await admin.from('project_locations').select('permit').eq('id', locationId).single()).data?.permit).toBe('granted');

    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'permit.png', mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'),
    });
    await expect(page.getByRole('button', { name: /Open .*permit\.png/ })).toBeVisible({ timeout: 20_000 });
    await expect(await axeViolations(page)).toEqual([]);
  });
});
