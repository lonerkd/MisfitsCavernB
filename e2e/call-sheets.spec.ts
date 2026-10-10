import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, type Browser, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Call sheets reach the crew, in real browsers against a local stack: the
// owner issues Day 1, the crew member gets their own call and confirms from
// the crew view, the owner sees who confirmed, and a change becomes a
// revision. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const SCRIPT = 'INT. HARBOR - NIGHT\n\nMAYA waits by the water.\n\nMAYA\nYou’re late.\n';

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

test.describe('Call sheets reach the crew (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const owner = { id: '', email: `cs-owner.${TAG}@journey.test`, name: `csowner${TAG}` };
  const crew = { id: '', email: `cs-crew.${TAG}@journey.test`, name: `cscrew${TAG}` };
  const outsider = { id: '', email: `cs-out.${TAG}@journey.test`, name: `csout${TAG}` };
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

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    for (const who of [owner, crew, outsider]) {
      const { data } = await admin.auth.admin.createUser({ email: who.email, password: PASSWORD, email_confirm: true, user_metadata: { username: who.name } });
      who.id = data.user!.id;
    }
    projectId = (await admin.from('projects').insert({ title: `Harbor ${TAG}`, creator_id: owner.id, status: 'pre-production' }).select('id').single()).data!.id;
    await admin.from('project_crew').insert({ project_id: projectId, user_id: crew.id, craft: 'Gaffer', status: 'confirmed' });
    await admin.from('scripts').insert({ title: 'Harbor', content: SCRIPT, project_id: projectId, created_by: owner.id, last_edited_by: owner.id });
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('project_id', projectId);
    await admin.from('projects').delete().eq('id', projectId);
    for (const who of [owner, crew, outsider]) if (who.id) await admin.auth.admin.deleteUser(who.id);
  });

  test('issue → the crew’s own call → “Got it” → the owner sees it → a revision', async ({ browser }) => {
    test.setTimeout(150_000);
    const sam = await signIn(browser, owner);
    await sam.goto('/studio?tab=production&view=schedule');
    const picker = sam.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);

    await sam.getByRole('button', { name: /^DAY 1/ }).click({ timeout: 30_000 });
    await expect(sam.getByRole('status').filter({ hasText: 'Draft — the crew haven’t been sent this yet.' })).toBeVisible();
    await expect(sam.getByRole('button', { name: 'Issue to the crew' })).toBeDisabled();

    await sam.getByLabel('Date', { exact: true }).fill('2026-11-03');
    await sam.getByLabel('Date', { exact: true }).blur();
    await sam.getByLabel('Location address').fill('12 Harbor Rd');
    await sam.getByLabel('Location address').blur();
    await sam.getByLabel(`Call time for ${crew.name}`).fill('07:15');
    await sam.getByLabel(`Call time for ${crew.name}`).blur();
    await expect.poll(async () => (await admin.from('call_sheet_calls').select('call_time').eq('project_id', projectId).eq('crew_user_id', crew.id)).data?.[0]?.call_time).toBe('07:15:00');

    await sam.getByLabel('Note to the crew').fill('Wear boots.');
    await sam.getByRole('button', { name: 'Issue to the crew' }).click();
    await expect(sam.getByRole('status').filter({ hasText: /^Issued v1/ })).toBeVisible();
    const sheet = (await admin.from('call_sheets').select('id, version').eq('project_id', projectId).eq('shoot_day', 1).single()).data!;
    expect(sheet.version).toBe(1);
    const note = (await admin.from('notifications').select('title, body, link').eq('user_id', crew.id).eq('type', 'call_sheet').single()).data!;
    expect(note).toEqual({ title: `Harbor ${TAG} — call sheet · Day 1 · Tue 3 Nov`, body: 'Your call 07:15. At 12 Harbor Rd. Wear boots.', link: `/call/${sheet.id}` });
    await sam.screenshot({ path: 'test-results/call-sheet-issued.png', fullPage: true });

    // The crew member: their call first, then "Got it".
    const jordan = await signIn(browser, crew);
    await jordan.goto(`/call/${sheet.id}`);
    await expect(jordan.getByRole('heading', { name: 'Day 1' })).toBeVisible({ timeout: 20_000 });
    const mine = jordan.getByRole('region', { name: 'Your call' });
    await expect(mine).toContainText('07:15');
    await expect(jordan.getByText('12 Harbor Rd')).toBeVisible();
    await expect(jordan.getByText('INT. HARBOR - NIGHT')).toBeVisible();
    const violations = await axeViolations(jordan);
    expect(violations, violations.join('\n')).toEqual([]);
    await mine.getByRole('button', { name: 'Got it' }).click();
    await expect(jordan.getByText('You confirmed v1')).toBeVisible();
    await jordan.screenshot({ path: 'test-results/call-sheet-crew.png', fullPage: true });

    // The owner sees the confirmation live.
    await expect(sam.getByText(/Confirmed v1: 1 of 1/)).toBeVisible({ timeout: 20_000 });

    // A change makes it a revision.
    await sam.getByLabel('Location address').fill('40 Pier St');
    await sam.getByLabel('Location address').blur();
    await expect(sam.getByRole('status').filter({ hasText: 'Changed since v1: location' })).toBeVisible();
    await sam.getByRole('button', { name: 'Issue revision (v2)' }).click();
    await expect(sam.getByRole('status').filter({ hasText: /^Issued v2/ })).toBeVisible();
    await expect.poll(async () => (await admin.from('notifications').select('body').eq('user_id', crew.id).eq('type', 'call_sheet').order('created_at', { ascending: false }).limit(1)).data?.[0]?.body)
      .toBe('Changed: location. Your call 07:15. At 40 Pier St.');

    await jordan.reload();
    await expect(jordan.getByText('A revision (v2) went out since you confirmed v1.')).toBeVisible({ timeout: 20_000 });
    await expect(jordan.getByText('40 Pier St')).toBeVisible();

    // Someone not on the production gets "not found" and nothing of the sheet.
    const riley = await signIn(browser, outsider);
    await riley.goto(`/call/${sheet.id}`);
    await expect(riley.getByRole('heading', { name: 'Call sheet not found' })).toBeVisible({ timeout: 20_000 });
    await expect(riley.getByText('40 Pier St')).toHaveCount(0);
  });
});
