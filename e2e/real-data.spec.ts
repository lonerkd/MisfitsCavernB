import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';
import type { Page } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';

// What used to be hardcoded, against a local stack: the home page shows real
// public activity (no invented chats, files or screenplay), and Promos suggests
// the platforms the team has used instead of a preset list. Opt-in: E2E_LOCAL_STACK=1.
const PASSWORD = randomUUID();
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const TAG = Date.now().toString(36);

async function axeViolations(page: Page): Promise<string[]> {
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async () => {
    const r = await (window as any).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] });
    return r.violations.map((v: any) => `${v.id}: ${v.nodes.slice(0, 3).map((n: any) => `${n.target.join(' ')} ${n.html.slice(0, 140)} ${n.any?.[0]?.message ?? ''}`).join(' | ')}`);
  });
}

test.describe('Real data, not presets (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let admin: SupabaseClient;
  let userId: string;
  let email: string;
  let projectId: string;
  let otherProjectId: string;

  test.beforeAll(async ({ stack }) => {
    admin = stack.admin;
    email = `rd.${TAG}@journey.test`;
    const data = await stack.createUser({ email, password: PASSWORD, username: `rd${TAG}` });
    userId = data.id;
    projectId = (await admin.from('projects').insert({ title: `Release ${TAG}`, creator_id: userId, status: 'completed' }).select('id').single()).data!.id;
    otherProjectId = (await admin.from('projects').insert({ title: `Earlier ${TAG}`, creator_id: userId, status: 'completed' }).select('id').single()).data!.id;
    await admin.from('campaigns').insert({ project_id: otherProjectId, title: 'Old run', platform: `Drive-in ${TAG}`, created_by: userId });
    await admin.from('jobs').insert({ title: `Night Shift ${TAG}`, role: 'Gaffer', created_by: userId, status: 'open', description: 'Two nights' });
    await admin.from('portfolio_projects').insert({ user_id: userId, title: `Salt ${TAG}`, visibility: 'public', year: 2026, role: 'Director', category: 'Short Film' });
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('jobs').delete().eq('created_by', userId);
    await admin.from('portfolio_projects').delete().eq('user_id', userId);
    await admin.from('projects').delete().in('id', [projectId, otherProjectId]);
  });

  test('home: live activity, and nothing invented', async ({ page }) => {
    await page.goto('/');
    const ticker = page.getByRole('marquee', { name: 'Happening now' });
    await expect(ticker).toContainText(`Hiring · Gaffer — Night Shift ${TAG}`, { timeout: 20_000 });
    await expect(ticker).toContainText(`New work · Salt ${TAG} (2026)`);
    await expect(page.getByText(`Salt ${TAG}`, { exact: true })).toBeVisible();
    for (const fake of ['Scene 14 is landing perfectly', 'Opening_v3.mov', 'INT. UNDERGROUND STUDIO', 'untitled_script.fdx', 'Industry-Format Screenplay']) {
      await expect(page.getByText(fake)).toHaveCount(0);
    }
  });

  test('promos: the platforms you’ve used, stages and spend', async ({ page }) => {
    await signInAs(page, { email: email, password: PASSWORD });

    await page.goto('/studio?tab=promos');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
    const open = page.getByRole('button', { name: 'Open it now' });
    if (await open.isVisible().catch(() => false)) await open.click();

    await page.getByRole('button', { name: 'New campaign' }).click();
    await page.getByLabel('Campaign title').fill('Festival push');
    await page.getByRole('group', { name: 'Platforms you’ve used' }).getByRole('button', { name: `Drive-in ${TAG}` }).click();
    await expect(page.getByLabel('Platform', { exact: true })).toHaveValue(`Drive-in ${TAG}`);
    await page.getByRole('button', { name: 'Add', exact: true }).click();

    const stage = page.getByRole('radiogroup', { name: 'Stage of Festival push' });
    await expect(stage.getByRole('radio', { name: 'Drafting' })).toHaveAttribute('aria-checked', 'true', { timeout: 10_000 });
    await stage.getByRole('radio', { name: 'Live' }).click();
    await expect(stage.getByRole('radio', { name: 'Live' })).toHaveAttribute('aria-checked', 'true', { timeout: 10_000 });
    const spend = page.getByLabel('Spent on Festival push');
    await spend.fill('75');
    await spend.press('Enter');
    await expect.poll(async () => (await admin.from('campaigns').select('status, spend, platform').eq('project_id', projectId).single()).data)
      .toMatchObject({ status: 'live', spend: 75, platform: `Drive-in ${TAG}` });

    await page.waitForTimeout(600);
    expect(await axeViolations(page)).toEqual([]);
  });
});
