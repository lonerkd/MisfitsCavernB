import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';
import type { Page, Browser } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';

// Credits against a local stack: a crew member's profile lists what they did
// (from the project's crew and casting), one click puts it in their portfolio,
// and the share page carries the cast & crew and festival laurels. Opt-in: E2E_LOCAL_STACK=1.
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

test.describe('Credits (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let admin: SupabaseClient;
  let owner: string;
  let crew: string;
  let crewEmail: string;
  let crewName: string;
  let projectId: string;
  let token: string;

  test.beforeAll(async ({ stack }) => {
    admin = stack.admin;
    owner = (await stack.createUser({ email: `cro.${TAG}@journey.test`, password: PASSWORD, username: `owner${TAG}` })).id;
    crewEmail = `crc.${TAG}@journey.test`;
    crewName = `gaffer${TAG}`;
    crew = (await stack.createUser({ email: crewEmail, password: PASSWORD, username: crewName })).id;
    const p = (await admin.from('projects').insert({ title: `Salt ${TAG}`, creator_id: owner, visibility: 'link', festival_submissions: [{ id: 'f1', name: 'Sundance', status: 'accepted' }] }).select('id, share_token').single()).data!;
    projectId = p.id; token = p.share_token;
    await admin.from('project_crew').insert({ project_id: projectId, user_id: crew, craft: 'Gaffer', status: 'confirmed' });
    await admin.from('character_castings').insert({ project_id: projectId, character_name: 'MAYA', crew_user_id: crew, created_by: owner });
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('portfolio_projects').delete().eq('user_id', crew);
    await admin.from('projects').delete().eq('id', projectId);
  });

  test('credits on the profile, into the portfolio, and on the press kit', async ({ page, browser }) => {
    await signInAs(page, { email: crewEmail, password: PASSWORD });

    await page.goto(`/crew/${crew}`);
    const credits = page.getByRole('region', { name: /^Credits/ });
    await expect(credits).toContainText(`Salt ${TAG}`, { timeout: 20_000 });
    await expect(credits).toContainText('Gaffer · Plays MAYA');
    await credits.getByRole('button', { name: `Add Salt ${TAG} to your portfolio` }).click();
    await expect(credits).toContainText('In your portfolio', { timeout: 10_000 });
    await expect.poll(async () => (await admin.from('portfolio_projects').select('role, source_project_id').eq('user_id', crew).maybeSingle()).data)
      .toMatchObject({ role: 'Gaffer · Plays MAYA', source_project_id: projectId });
    await page.waitForTimeout(400);
    expect(await axeViolations(page)).toEqual([]);

    // The press kit, signed out.
    const anon = await (browser as Browser).newContext();
    const kit = await anon.newPage();
    await kit.goto(`/shared/${token}`);
    await expect(kit.getByRole('list', { name: 'Festival selections' })).toContainText('Sundance', { timeout: 20_000 });
    const cc = kit.getByRole('region', { name: 'Cast & crew' });
    await expect(cc).toContainText('Gaffer');
    await expect(cc).toContainText(crewName);
    await expect(cc).toContainText('MAYA');
    expect(await axeViolations(kit)).toEqual([]);
    await anon.close();
  });
});
