import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { test, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Keyboard-only audit: tabs through every page and reports what a person without a
// mouse cannot do. It writes e2e/keyboard-audit.json and prints a summary; it does
// not fail the run (a report, until the findings are fixed and it can gate).
// Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const MAX_TABS = 160;

interface Finding { route: string; kind: string; detail: string }

async function audit(page: Page, route: string): Promise<Finding[]> {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);
  const out: Finding[] = [];
  const add = (kind: string, detail: string) => out.push({ route, kind, detail });

  // Things that act on a click but a keyboard cannot reach: a pointer cursor on an element
  // that is not focusable, has no interactive role, and sits inside no focusable ancestor.
  const mouseOnly: string[] = await page.evaluate(() => {
    const focusable = 'a[href],button,input,select,textarea,summary,[tabindex],[role=button],[role=link],[role=tab],[role=menuitem],[role=checkbox],[role=switch],[role=radio],[role=option]';
    const seen: string[] = [];
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) {
      const r = el.getBoundingClientRect();
      if (r.width < 6 || r.height < 6) continue;
      const cs = getComputedStyle(el);
      if (cs.cursor !== 'pointer' || cs.visibility === 'hidden' || cs.display === 'none') continue;
      if (el.closest(focusable) || el.querySelector(focusable)) continue;
      if (el.closest('label')) continue;
      seen.push(`${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''} "${(el.textContent ?? '').trim().slice(0, 40)}"`);
      if (seen.length >= 8) break;
    }
    return seen;
  });
  for (const m of mouseOnly) add('mouse-only', m);

  // Tab through; note each stop's focus indicator, and whether focus gets stuck.
  await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur?.(); window.scrollTo(0, 0); });
  const stops = new Map<string, number>();
  let noRing = 0;
  const noRingList: string[] = [];
  let last = '';
  let stuck = 0;
  for (let i = 0; i < MAX_TABS; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none';
      const label = (el.getAttribute('aria-label') || el.textContent || (el as HTMLInputElement).placeholder || el.getAttribute('name') || '').trim().slice(0, 40);
      const path = `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}|${label}`;
      const r = el.getBoundingClientRect();
      return { path, ring, visible: r.width > 0 && r.height > 0, offscreen: r.bottom < 0 || r.top > innerHeight + 4000 };
    });
    if (!info) { if (++stuck > 3) break; continue; }
    stuck = 0;
    if (info.path === last) { add('trap', `focus stays on ${info.path}`); break; }
    last = info.path;
    stops.set(info.path, (stops.get(info.path) ?? 0) + 1);
    if (!info.ring && noRing++ < 6) noRingList.push(info.path);
    if (!info.visible) add('hidden-stop', `focus lands on an element with no size: ${info.path}`);
    if ((stops.get(info.path) ?? 0) > 2) break; // the order has looped round
  }
  for (const p of noRingList) add('no-focus-ring', p);

  // Everything focusable that the tabbing never reached (limited to the first loop).
  const reached = new Set(stops.keys());
  const total = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled])'))
    .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' && el.tabIndex >= 0; }).length);
  if (reached.size < Math.min(total, MAX_TABS) * 0.6) add('unreached', `${total} focusable controls on the page, tabbing reached ${reached.size}`);
  return out;
}

test.describe('Keyboard-only audit (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 with the app built against a local Supabase stack');
  test.setTimeout(600_000);

  test('report', async ({ browser }) => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    const admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const password = randomUUID();
    const email = `kbd.${Date.now()}@journey.test`;
    const { data: u } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { username: `kbd${Date.now().toString(36)}` } });
    const uid = u.user!.id;
    await admin.from('profiles').update({ is_admin: true, bio: 'Director' }).eq('id', uid);
    const { data: p } = await admin.from('projects').insert({ title: 'Night Shift', creator_id: uid, visibility: 'link' }).select('id, share_token').single();
    await admin.from('scripts').insert({ title: 'Night Shift', content: 'INT. CORRIDOR - NIGHT\n\nMaya pushes a cart.\n\nMAYA\nRoom 12.\n', project_id: p!.id, created_by: uid, last_edited_by: uid });
    const { data: job } = await admin.from('jobs').insert({ title: 'Gaffer', role: 'Gaffer', created_by: uid, project_id: p!.id, status: 'open', description: 'Two nights' }).select('id').single();

    const findings: Finding[] = [];
    const anon = await (await browser.newContext()).newPage();
    for (const r of ['/', '/auth', '/showcase', `/shared/${p!.share_token}`]) findings.push(...await audit(anon, r));

    const page = await (await browser.newContext()).newPage();
    await page.goto('/auth');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((x) => !x.pathname.startsWith('/auth'), { timeout: 30_000 });
    const routes = [
      '/welcome', '/projects', `/projects/${p!.id}`,
      ...['overview', 'library', 'scenes', 'production', 'post', 'promos', 'pitch', 'share'].map((t) => `/studio?tab=${t}`),
      '/studio?tab=production&view=schedule', '/studio?tab=production&view=breakdown', '/studio?tab=production&view=onset',
      '/editor', '/lounge', '/soundtrack', '/jobs', `/jobs/${job!.id}`, '/crew', '/portfolio', '/profile', '/settings', '/admin',
    ];
    for (const r of routes) findings.push(...await audit(page, r));

    writeFileSync('e2e/keyboard-audit.json', JSON.stringify(findings, null, 1));
    const byKind = new Map<string, number>();
    for (const f of findings) byKind.set(f.kind, (byKind.get(f.kind) ?? 0) + 1);
    console.log('KEYBOARD AUDIT', Object.fromEntries(byKind), `${findings.length} findings`);
  });
});
