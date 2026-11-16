import { readFileSync } from 'node:fs';
import { type Page } from '@playwright/test';
import { test, expect, stackEnabled, stackSkipReason, type QaUser } from './support/stack';

// Role model, step 3b in a real browser against a local stack: a person who was invited to a project sees the invitation on
// Community › Your day (they cannot read the project yet), accepts it and joins with the craft and access they were offered,
// or declines it and stays out. Opt-in: E2E_LOCAL_STACK=1 (or the staging variables; see e2e/support/stack.ts).
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
  test.skip(!stackEnabled, stackSkipReason);

  let owner: QaUser;
  let guest: QaUser;
  const projects: { id: string; title: string }[] = [];

  test.beforeAll(async ({ stack }) => {
    owner = await stack.createUser({ label: 'invo' });
    guest = await stack.createUser({ label: 'invg' });
    for (const name of ['Accepted', 'Declined']) {
      const title = `${name} film ${stack.tag}`;
      const { id } = await stack.createProject(owner, { title, status: 'pre-production' });
      const crew = await stack.admin.from('project_crew').insert({ project_id: id, user_id: guest.id, role: 'contributor', craft: 'Gaffer', status: 'pending', invited_by: owner.id });
      expect(crew.error).toBeNull();
      // Registered after the project, so it runs first at teardown (the crew row goes before the project).
      stack.onCleanup(`crew ${id}`, async () => { await stack.admin.from('project_crew').delete().eq('project_id', id); });
      projects.push({ id, title });
    }
  });

  test('see an invitation, accept one and decline the other', async ({ page, stack }) => {
    const admin = stack.admin;
    test.setTimeout(120_000);
    await stack.signIn(page, guest);

    await page.goto('/community');
    const card = page.locator('[aria-labelledby="today-invites"]');
    await expect(card.getByRole('heading', { name: 'Invitations' })).toBeVisible({ timeout: 30_000 });
    const [yes, no] = projects;
    await expect(card.getByRole('article', { name: `Invitation to ${yes.title}` })).toContainText('invited you as Gaffer · crew access');
    // The invitation says in words what they would be able to do, before they accept.
    await expect(card.getByRole('article', { name: `Invitation to ${yes.title}` }).getByRole('note')).toContainText("Gaffer: You can add to and edit the project's tools", { timeout: 30_000 });
    await expect(card.getByRole('article', { name: `Invitation to ${yes.title}` }).getByRole('note')).toContainText('You cannot see');
    expect(await axeViolations(page)).toEqual([]);

    await card.getByRole('article', { name: `Invitation to ${yes.title}` }).getByRole('button', { name: 'Accept' }).click();
    await expect(page.getByText(`You joined “${yes.title}”`)).toBeVisible();
    await expect(card.getByRole('article', { name: `Invitation to ${yes.title}` })).toHaveCount(0);
    const joined = await admin.from('project_crew').select('status, role, craft').eq('project_id', yes.id).eq('user_id', guest.id).single();
    expect(joined.data).toEqual({ status: 'confirmed', role: 'contributor', craft: 'Gaffer' });

    // Joining puts the role on Your day: which project, the craft, and what it can and cannot do.
    const role = page.locator('[aria-labelledby="today-roles"]');
    await expect(role.getByRole('article', { name: `Your role on ${yes.title}` })).toContainText("Gaffer: You can add to and edit the project's tools", { timeout: 30_000 });
    await expect(role.getByRole('article', { name: `Your role on ${no.title}` })).toHaveCount(0);

    await card.getByRole('article', { name: `Invitation to ${no.title}` }).getByRole('button', { name: 'Decline' }).click();
    await expect(page.getByText('Invitation declined')).toBeVisible();
    await expect(card).toHaveCount(0);
    const declined = await admin.from('project_crew').select('status').eq('project_id', no.id).eq('user_id', guest.id).single();
    expect(declined.data!.status).toBe('declined');

    // The owner was told about both.
    const told = await admin.from('notifications').select('title').eq('user_id', owner.id).eq('type', 'crew');
    expect((told.data ?? []).map((n) => n.title).sort()).toEqual([`${guest.username} declined the invitation`, `${guest.username} joined the crew`]);
  });
});
