import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Every page, signed out and signed in, against WCAG 2.0/2.1/2.2 A + AA (the
// standard Lighthouse and Google's accessibility audits apply), with real data
// from a local stack. Any violation fails. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function violations(page: Page, route: string | null) {
  if (route) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
  }
  await page.addScriptTag({ content: AXE });
  const result = await page.evaluate(async (tags) => {
    const r = await (window as any).axe.run(document, { runOnly: { type: 'tag', values: tags }, resultTypes: ['violations'] });
    return r.violations.map((v: any) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.slice(0, 3).map((n: any) => `${n.target.join(' ')} ${n.html.slice(0, 140)} ${n.any?.[0]?.message ?? ''}`).join(' | ')}`);
  }, TAGS);
  return result as string[];
}

test.describe('Accessibility (WCAG 2.2 AA, local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 with the app built against a local Supabase stack');
  test.setTimeout(240_000);

  test('every page passes', async ({ browser }) => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    const admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const password = randomUUID();
    const email = `a11y.${Date.now()}@journey.test`;
    const { data: u } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { username: `a11y${Date.now().toString(36)}` } });
    const uid = u.user!.id;
    await admin.from('profiles').update({ is_admin: true, bio: 'Director' }).eq('id', uid);
    const { data: p } = await admin.from('projects').insert({ title: 'Night Shift', creator_id: uid, visibility: 'link' }).select('id, share_token').single();
    await admin.from('scripts').insert({ title: 'Night Shift', content: 'INT. CORRIDOR - NIGHT\n\nMaya pushes a cart.\n\nMAYA\nRoom 12.\n', project_id: p!.id, created_by: uid, last_edited_by: uid });
    const { data: job } = await admin.from('jobs').insert({ title: 'Gaffer', role: 'Gaffer', created_by: uid, project_id: p!.id, status: 'open', description: 'Two nights' }).select('id').single();
    const { data: pf } = await admin.from('portfolio_projects').insert({ user_id: uid, title: 'Night Shift', year: 2026, role: 'Director', category: 'Short Film' }).select('id, share_token').single();
    await admin.from('portfolio_media').insert({ project_id: pf!.id, url: 'https://youtu.be/dQw4w9WgXcQ', media_type: 'youtube', title: 'Trailer' });

    const found: string[] = [];
    const check = async (page: Page, route: string, label = route) => {
      for (const v of await violations(page, route)) found.push(`${label}: ${v}`);
    };

    const anon = await (await browser.newContext()).newPage();
    for (const r of ['/', '/auth', '/showcase', `/shared/${p!.share_token}`, `/p/${pf!.share_token}`, '/does-not-exist']) await check(anon, r, `signed out ${r}`);

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('/auth');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((x) => !x.pathname.startsWith('/auth'), { timeout: 30_000 });
    await page.goto('/studio');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== p!.id) await picker.selectOption(p!.id);

    const routes = [
      '/', '/projects', `/projects/${p!.id}`, `/projects/${p!.id}/pitch`,
      ...['overview', 'library', 'scenes', 'production', 'post', 'promos', 'pitch', 'share'].map((t) => `/studio?tab=${t}`),
      '/editor', '/lounge', '/soundtrack', '/jobs', `/jobs/${job!.id}`, '/crew', `/crew/${uid}`,
      '/portfolio', '/portfolio/manage', '/profile', '/settings', '/admin', '/admin/users', '/admin/analytics', '/admin/audit-logs',
    ];
    for (const r of routes) await check(page, r);

    // The craft picker, open (Crew directory filter).
    await page.goto('/crew', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /^Filter by craft/ }).click();
    await page.getByRole('dialog', { name: 'Filter by craft' }).waitFor();
    for (const v of await violations(page, null)) found.push(`craft picker: ${v}`);

    // The format picker: starting a project, and changing one's format.
    await page.goto('/projects', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /new project/i }).first().click();
    await page.getByRole('radiogroup', { name: 'Format' }).waitFor();
    await page.waitForTimeout(1000); // the modal fades in
    for (const v of await violations(page, null)) found.push(`new project: ${v}`);
    await page.goto(`/projects/${p!.id}`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Change format' }).click();
    await page.getByRole('radiogroup', { name: 'Project format' }).waitFor();
    await page.waitForTimeout(500);
    for (const v of await violations(page, null)) found.push(`change format: ${v}`);

    // A new project keeps later tools locked (checked above); once it reaches
    // delivery every tool is open, and the project page celebrates the phase.
    await admin.from('projects').update({ status: 'completed' }).eq('id', p!.id);
    for (const r of [`/projects/${p!.id}`, '/studio?tab=post', '/studio?tab=promos', '/studio?tab=production&view=breakdown', '/studio?tab=production&view=schedule', '/studio?tab=production&view=crew']) {
      await check(page, r, `delivery ${r}`);
    }

    const mobile = await (await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: await ctx.storageState() })).newPage();
    for (const r of ['/', '/projects', '/studio?tab=scenes', '/editor']) await check(mobile, r, `mobile ${r}`);

    expect(found, found.join('\n')).toEqual([]);
  });
});
