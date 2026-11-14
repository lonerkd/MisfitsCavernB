import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Role model, step 3b in a real browser against a local stack: a person who was invited to a project sees the invitation on
// Community › Your day (they cannot read the project yet), accepts it and joins with the craft and access they were offered,
// or declines it and stays out. Opt-in: E2E_LOCAL_STACK=1.
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
    const r = await (window as any).axe.run(document.querySelector('[aria-labelledby="today-invites"]'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] });
    return r.violations.map((v: any) => `${v.id}: ${v.nodes.slice(0, 3).map((n: any) => `${n.target.join(' ')} ${n.html.slice(0, 140)}`).join(' | ')}`);
  });
}

test.describe('Crew invitations (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const owner = { id: '' };
  const guest = { id: '', email: `invg.${TAG}@journey.test` };
  const projects: { id: string; title: string }[] = [];

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    owner.id = (await admin.auth.admin.createUser({ email: `invo.${TAG}@journey.test`, password: PASSWORD, email_confirm: true, user_metadata: { username: `invo${TAG}` } })).data.user!.id;
    guest.id = (await admin.auth.admin.createUser({ email: guest.email, password: PASSWORD, email_confirm: true, user_metadata: { username: `invg${TAG}` } })).data.user!.id;
    for (const name of ['Accepted', 'Declined']) {
      const title = `${name} film ${TAG}`;
      const id = (await admin.from('projects').insert({ title, creator_id: owner.id, status: 'pre-production' }).select('id').single()).data!.id;
      await admin.from('project_crew').insert({ project_id: id, user_id: guest.id, role: 'contributor', craft: 'Gaffer', status: 'pending', invited_by: owner.id });
      projects.push({ id, title });
    }
  });

  test.afterAll(async () => {
    if (!admin) return;
    for (const p of projects) {
      await admin.from('project_crew').delete().eq('project_id', p.id);
      await admin.from('projects').delete().eq('id', p.id);
    }
    for (const id of [owner.id, guest.id]) if (id) await admin.auth.admin.deleteUser(id);
  });

  test('see an invitation, accept one and decline the other', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/auth');
    await page.fill('input[name="email"]', guest.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });

    await page.goto('/community');
    const card = page.locator('[aria-labelledby="today-invites"]');
    await expect(card.getByRole('heading', { name: 'Invitations' })).toBeVisible({ timeout: 30_000 });
    const [yes, no] = projects;
    await expect(card.getByRole('article', { name: `Invitation to ${yes.title}` })).toContainText('invited you as Gaffer · crew access');
    expect(await axeViolations(page)).toEqual([]);

    await card.getByRole('article', { name: `Invitation to ${yes.title}` }).getByRole('button', { name: 'Accept' }).click();
    await expect(page.getByText(`You joined “${yes.title}”`)).toBeVisible();
    await expect(card.getByRole('article', { name: `Invitation to ${yes.title}` })).toHaveCount(0);
    const joined = await admin.from('project_crew').select('status, role, craft').eq('project_id', yes.id).eq('user_id', guest.id).single();
    expect(joined.data).toEqual({ status: 'confirmed', role: 'contributor', craft: 'Gaffer' });

    await card.getByRole('article', { name: `Invitation to ${no.title}` }).getByRole('button', { name: 'Decline' }).click();
    await expect(page.getByText('Invitation declined')).toBeVisible();
    await expect(card).toHaveCount(0);
    const declined = await admin.from('project_crew').select('status').eq('project_id', no.id).eq('user_id', guest.id).single();
    expect(declined.data!.status).toBe('declined');

    // The owner was told about both.
    const told = await admin.from('notifications').select('title').eq('user_id', owner.id).eq('type', 'crew');
    expect((told.data ?? []).map((n) => n.title).sort()).toEqual([`invg${TAG} declined the invitation`, `invg${TAG} joined the crew`]);
  });
});
