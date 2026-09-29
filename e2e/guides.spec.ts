import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Guides in a real browser against a local stack: the owner answers how they
// work and gets the short-film walkthrough (steps that tick themselves, a
// step ticked by hand, another guide picked, the depth turned down, the guide
// put away and back); an actor on the crew gets the crew guide for their
// craft. Opt-in: E2E_LOCAL_STACK=1.
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
    const r = await (window as any).axe.run('#guide', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] });
    return r.violations.map((v: any) => `${v.id}: ${v.nodes.slice(0, 3).map((n: any) => `${n.target.join(' ')} ${n.html.slice(0, 140)} ${n.any?.[0]?.message ?? ''}`).join(' | ')}`);
  });
}

async function signIn(page: Page, email: string) {
  await page.goto('/auth');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
}

test.describe('Guides (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const owner = { id: '', email: `guide-owner.${TAG}@journey.test` };
  const actor = { id: '', email: `guide-actor.${TAG}@journey.test` };
  let projectId: string;

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    for (const [who, name] of [[owner, `gowner${TAG}`], [actor, `gactor${TAG}`]] as const) {
      who.id = (await admin.auth.admin.createUser({ email: who.email, password: PASSWORD, email_confirm: true, user_metadata: { username: name } })).data.user!.id;
    }
    projectId = (await admin.from('projects').insert({
      title: `Guided ${TAG}`, creator_id: owner.id, status: 'concept', project_type: 'Short Film',
      description: 'A lighthouse keeper hears a ship that sank fifty years ago.',
    }).select('id').single()).data!.id;
    await admin.from('project_crew').insert({ project_id: projectId, user_id: actor.id, craft: 'Actor', status: 'confirmed' });
    await admin.from('profiles').update({ ui_prefs: { guide: { hours: 5, experience: 'some', team: 'small' } } }).eq('id', actor.id);
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('projects').delete().eq('id', projectId);
    for (const who of [owner, actor]) await admin.auth.admin.deleteUser(who.id);
  });

  test('the owner’s walkthrough, tuned and ticked', async ({ page }) => {
    test.setTimeout(120_000);
    await signIn(page, owner.email);
    await page.goto(`/projects/${projectId}`);

    // First time: how do you work?
    const guide = page.locator('#guide');
    await expect(guide.getByRole('heading', { name: 'How do you work?' })).toBeVisible({ timeout: 30_000 });
    await guide.getByRole('radio', { name: /^I’ve made a few/ }).click();
    await guide.getByRole('radiogroup', { name: 'Hours a week' }).getByRole('radio', { name: '8h' }).click();
    await guide.getByRole('radio', { name: /^A few friends/ }).click();
    await guide.getByRole('radio', { name: /^Walk me through it/ }).click();
    await guide.getByRole('button', { name: 'Show my guide' }).click();

    // The short-film guide: the logline is written, so the brief comes first.
    await expect(guide.getByText('Your guide · Short film')).toBeVisible();
    await expect(guide.getByRole('heading', { name: 'Answer the brief' })).toBeVisible();
    const week = guide.getByRole('list', { name: 'This week' });
    await expect(week.getByText('Walk me through it').first()).toBeVisible();
    const logline = guide.getByRole('checkbox', { name: /^Write the logline/ });
    await expect(logline).toBeChecked();
    await expect(logline).toBeDisabled();
    await guide.screenshot({ path: 'test-results/guide.png' });
    const violations = await axeViolations(page);
    expect(violations, violations.join('\n')).toEqual([]);

    // Ticked by hand, kept.
    await guide.getByRole('checkbox', { name: /^Answer the brief/ }).check();
    await expect(guide.getByRole('heading', { name: 'Gather five references' })).toBeVisible();
    await expect.poll(async () => (await admin.from('guide_progress').select('done').eq('user_id', owner.id).eq('project_id', projectId).maybeSingle()).data?.done)
      .toEqual(['brief']);

    // Another guide for the same project.
    await guide.getByLabel('Guide', { exact: true }).selectOption('feature');
    await expect(guide.getByText('Your guide · Feature film')).toBeVisible();
    await expect.poll(async () => (await admin.from('guide_progress').select('workflow').eq('user_id', owner.id).single()).data?.workflow).toBe('feature');

    // Less explanation: just the checklist.
    await guide.getByRole('button', { name: 'Tune' }).click();
    await guide.getByRole('radio', { name: /^Just the checklist/ }).click();
    await guide.getByRole('button', { name: 'Save' }).click();
    await expect(guide.getByText('Walk me through it')).toHaveCount(0);
    await expect.poll(async () => (await admin.from('profiles').select('ui_prefs').eq('id', owner.id).single()).data?.ui_prefs?.guide)
      .toEqual({ hours: 8, experience: 'some', team: 'small', depth: 'light' });

    // Put away, and back.
    await guide.getByRole('button', { name: 'Put away' }).click();
    await page.reload();
    await guide.getByRole('button', { name: 'Show the guide' }).click({ timeout: 30_000 });
    await expect(guide.getByText('Your guide · Feature film')).toBeVisible();
  });

  test('an actor on the crew gets the crew guide for their craft', async ({ page }) => {
    test.setTimeout(90_000);
    await signIn(page, actor.email);
    await page.goto(`/projects/${projectId}`);
    const guide = page.locator('#guide');
    await expect(guide.getByText('Your guide · On the crew')).toBeVisible({ timeout: 30_000 });
    await expect(guide.getByRole('list', { name: 'This week' }).getByRole('checkbox', { name: /^Know your scenes/ })).toBeVisible();
    await expect(guide.getByRole('checkbox', { name: /^Learn your lines/, includeHidden: true })).toHaveCount(1);
    await expect(guide.getByRole('checkbox', { name: /^Walk the shot list/ })).toHaveCount(0);
    // Nothing of the owner's guide leaks across.
    await expect(guide.getByRole('checkbox', { name: /^Answer the brief/ })).toHaveCount(0);
  });
});
