import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, type Browser, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { describeRange } from '../lib/availability/core';

// Crew availability in a real browser against a local stack: a gaffer marks
// the dates they're away on their profile; the owner sees it on the shoot day
// that falls in them and on the crew list — the dates, never the note.
// Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const SCRIPT = 'INT. HARBOR OFFICE - NIGHT\n\nRain on the glass.\n\nEXT. PIER - DAY\n\nGulls.\n';
const iso = (days: number) => new Date(Date.now() + days * 86_400_000).toLocaleDateString('en-CA');

async function axeViolations(page: Page, selector: string): Promise<string[]> {
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async (sel) => {
    const r = await (window as any).axe.run(sel, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] });
    return r.violations.map((v: any) => `${v.id}: ${v.nodes.slice(0, 3).map((n: any) => `${n.target.join(' ')} ${n.html.slice(0, 140)}`).join(' | ')}`);
  }, selector);
}

test.describe('Crew availability (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const owner = { id: '', email: `av-owner.${TAG}@journey.test`, name: `avowner${TAG}` };
  const crew = { id: '', email: `av-crew.${TAG}@journey.test`, name: `avcrew${TAG}` };
  let projectId: string;

  const signIn = async (browser: Browser, who: typeof owner) => {
    const page = await (await browser.newContext()).newPage();
    await page.goto('/auth');
    await page.fill('input[name="email"]', who.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
    return page;
  };

  const openStudio = async (page: Page, view: string) => {
    await page.goto(`/studio?tab=production&view=${view}`);
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
  };

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    for (const who of [owner, crew]) {
      const { data } = await admin.auth.admin.createUser({ email: who.email, password: PASSWORD, email_confirm: true, user_metadata: { username: who.name } });
      who.id = data.user!.id;
    }
    projectId = (await admin.from('projects').insert({ title: `Pier ${TAG}`, creator_id: owner.id, status: 'pre-production' }).select('id').single()).data!.id;
    await admin.from('project_crew').insert({ project_id: projectId, user_id: crew.id, craft: 'Gaffer', status: 'confirmed' });
    await admin.from('scripts').insert({ title: 'Pier', content: SCRIPT, project_id: projectId, created_by: owner.id, last_edited_by: owner.id });
    await admin.from('call_sheets').insert({ project_id: projectId, shoot_day: 1, shoot_date: iso(10) });
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('project_id', projectId);
    await admin.from('projects').delete().eq('id', projectId);
    for (const who of [owner, crew]) await admin.auth.admin.deleteUser(who.id);
  });

  test('away on the profile → flagged on the shoot day and the crew list', async ({ browser }) => {
    test.setTimeout(150_000);
    const range = describeRange(iso(9), iso(11));

    const gaffer = await signIn(browser, crew);
    await gaffer.goto('/profile');
    const section = gaffer.locator('section[aria-labelledby="away-title"]');
    await section.getByLabel('From').fill(iso(9), { timeout: 30_000 });
    await section.getByLabel('To (optional)').fill(iso(11));
    await section.getByLabel('Note (only you see it)').fill('Another shoot in Banff');
    await section.getByRole('button', { name: 'ADD DATES' }).click();
    await expect(section.getByRole('button', { name: `Remove ${range}` })).toBeVisible();
    const violations = await axeViolations(gaffer, 'section[aria-labelledby="away-title"]');
    expect(violations, violations.join('\n')).toEqual([]);
    await expect.poll(async () => (await admin.from('unavailability').select('starts_on, ends_on').eq('user_id', crew.id)).data)
      .toEqual([{ starts_on: iso(9), ends_on: iso(11) }]);

    const sam = await signIn(browser, owner);
    await openStudio(sam, 'schedule');
    const note = sam.getByRole('note').filter({ hasText: 'Away that day' });
    await expect(note).toHaveText(`Away that day: ${crew.name} (${range})`, { timeout: 30_000 });
    await expect(sam.getByText('Another shoot in Banff')).toHaveCount(0);

    await openStudio(sam, 'crew');
    await expect(sam.getByText(`Away ${range}`)).toBeVisible({ timeout: 30_000 });
  });
});
