// A phone audit of the running app (an iPhone 15 Pro, portrait and landscape) against the local stack. For every route it saves
// a screenshot and reports: anything wider than the screen, controls under a fixed bar, text too small to read, controls smaller
// than a thumb, and — with the keyboard up (a shortened screen) — whether the focused field and its action stay reachable.
// Chromium only imitates an iPhone: real Safari (the toolbar, safe areas, the keyboard) still needs a real device.
//   MC_LOCAL_CHROMIUM=/opt/pw-browsers/chromium PLAYWRIGHT_BASE_URL=http://localhost:3000 node scripts/mobile-audit.mjs [outDir]
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, devices } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const OUT = process.argv[2] || 'mobile-audit';
mkdirSync(OUT, { recursive: true });
const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
const admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const TAG = Date.now().toString(36), EMAIL = `phone.${TAG}@journey.test`, PASSWORD = randomUUID();
const user = (await admin.auth.admin.createUser({ email: EMAIL, password: PASSWORD, email_confirm: true, user_metadata: { username: `phone${TAG}` } })).data.user;
const project = (await admin.from('projects').insert({ title: `Phone ${TAG}`, creator_id: user.id }).select('id').single()).data;
const script = (await admin.from('scripts').insert({ title: 'Kitchen', content: 'INT. KITCHEN - NIGHT\n\nMAYA\nStill up.\n\nEXT. STREET - DAY\n\nJO\nGo.\n', project_id: project.id, created_by: user.id, last_edited_by: user.id }).select('id').single()).data;

const ROUTES = [
  '/community', '/projects', `/projects/${project.id}`, `/studio?project=${project.id}`,
  `/studio?project=${project.id}&tab=scenes`, `/studio?project=${project.id}&tab=production`, `/studio?project=${project.id}&tab=library`,
  `/studio?project=${project.id}&tab=post`, `/studio?project=${project.id}&tab=share`,
  `/editor?script=${script.id}`, '/lounge', '/crew', '/jobs', '/profile', '/settings', '/soundtrack', '/portfolio', '/welcome',
];

const base = devices['iPhone 15 Pro'];
const MODES = [
  { name: 'portrait', ctx: { ...base } },
  { name: 'landscape', ctx: { ...base, viewport: { width: 852, height: 393 }, screen: { width: 852, height: 393 } } },
];

const measure = () => {
  const vw = document.documentElement.clientWidth, vh = window.innerHeight;
  const visible = (el) => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0'; };
  const out = { wide: [], small: [], tiny: [], hiddenUnderBar: [], scrollsSideways: document.documentElement.scrollWidth > vw + 1 };
  const bars = [...document.querySelectorAll('*')].filter((el) => { const cs = getComputedStyle(el); return cs.position === 'fixed' && visible(el) && el.getBoundingClientRect().height > 30 && el.getBoundingClientRect().width > vw * 0.5 && cs.pointerEvents !== 'none'; });
  for (const el of document.body.querySelectorAll('*')) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    const label = `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${String(el.className).split(' ')[0]} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30)}"`;
    const interactive = el.matches('a[href],button,[role=button],input,select,textarea,[role=tab]');
    if (r.right > vw + 1 && r.left < vw) {
      let clipped = false;
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { if (['auto', 'scroll', 'hidden', 'clip'].includes(getComputedStyle(p).overflowX) && p.getBoundingClientRect().right <= vw + 1) { clipped = true; break; } }
      if (!clipped && getComputedStyle(el).position !== 'fixed') out.wide.push(`${label} +${Math.round(r.right - vw)}px`);
    }
    // A link's tappable area can reach past its text (a ::after with negative offsets): count it. Apple's target is 44 pt; a text link
    // may be narrower (24 pt, WCAG 2.5.8) because a sentence sets its width.
    let tall = r.height, wide = r.width;
    if (el.matches('a[href]')) { const a = getComputedStyle(el, '::after'); if (a.content !== 'none' && a.position === 'absolute') { tall = r.height - (parseFloat(a.top) || 0) - (parseFloat(a.bottom) || 0); wide = r.width - (parseFloat(a.left) || 0) - (parseFloat(a.right) || 0); } }
    const minWide = el.matches('a[href]') ? 24 : 44;
    if (interactive && (wide < minWide || tall < 44) && r.width > 0 && !el.closest('[aria-hidden=true]') && !(el.matches('a') && el.closest('p,li') && r.height >= 20)) out.small.push(`${label} ${Math.round(r.width)}×${Math.round(r.height)}`);
    if (el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 11) out.tiny.push(`${label} ${getComputedStyle(el).fontSize}`);
    if (interactive && r.top >= 0 && r.bottom <= vh) {
      for (const b of bars) { if (b.contains(el)) continue; const br = b.getBoundingClientRect(); if (r.bottom > br.top + 4 && r.top < br.bottom - 4 && r.left < br.right && r.right > br.left && getComputedStyle(b).zIndex !== 'auto') { out.hiddenUnderBar.push(`${label} under ${b.tagName.toLowerCase()}.${String(b.className).split(' ')[0]}`); break; } }
    }
  }
  const cut = (a) => [...new Set(a)].slice(0, 12);
  return { ...out, wide: cut(out.wide), small: cut(out.small), tiny: cut(out.tiny), hiddenUnderBar: cut(out.hiddenUnderBar), counts: { wide: out.wide.length, small: out.small.length, tiny: out.tiny.length, hiddenUnderBar: out.hiddenUnderBar.length } };
};

const report = [];
let browser;
try {
browser = await chromium.launch(process.env.MC_LOCAL_CHROMIUM ? { executablePath: process.env.MC_LOCAL_CHROMIUM } : {});
for (const mode of MODES) {
  const ctx = await browser.newContext(mode.ctx);
  // Chromium cannot raise an iOS keyboard: fake the only thing the app reads for it, `visualViewport`.
  await ctx.addInitScript(() => {
    window.__kb = 0;
    Object.defineProperty(window, 'visualViewport', { configurable: true, get: () => ({ get height() { return window.innerHeight - window.__kb; }, offsetTop: 0, addEventListener() {}, removeEventListener() {} }) });
    window.__setKb = (n) => { window.__kb = n; window.dispatchEvent(new Event('resize')); };
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/auth`);
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30000 }).catch(() => {});
  for (const route of ROUTES) {
    const slug = `${mode.name}-${route.replace(/[^a-z0-9]+/gi, '_').slice(0, 60)}`;
    const entry = { mode: mode.name, route };
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2500);
      Object.assign(entry, await page.evaluate(measure));
      await page.screenshot({ path: `${OUT}/${slug}.png` });
      // The keyboard: shorten the screen the way iOS does, focus the first text field, and see whether it, and the nearest button, are on screen.
      const field = page.locator('textarea:visible, input[type=text]:visible, input:not([type]):visible, input[type=search]:visible, input[type=email]:visible').first();
      if (await field.count()) {
        await field.scrollIntoViewIfNeeded().catch(() => {});
        await field.focus({ timeout: 3000 }).catch(() => {});
        const kb = mode.name === 'portrait' ? 336 : 200;
        await page.evaluate((n) => window.__setKb(n), kb);
        await page.waitForTimeout(1200);
        entry.keyboard = await page.evaluate(() => {
          const el = document.activeElement; if (!el || el === document.body) return { focused: false };
          const r = el.getBoundingClientRect(), vh = window.innerHeight - window.__kb;
          const form = el.closest('form') || el.closest('[role=dialog]') || el.parentElement?.parentElement;
          const act = form ? [...form.querySelectorAll('button[type=submit],button:not([type])')].find((b) => b.offsetParent) : null;
          const ar = act ? act.getBoundingClientRect() : null;
          return { focused: true, inView: r.top >= 0 && r.bottom <= vh, actionInView: ar ? ar.top >= 0 && ar.bottom <= vh : null, action: act ? (act.getAttribute('aria-label') || act.textContent || '').trim().slice(0, 24) : null, top: Math.round(r.top), bottom: Math.round(r.bottom), screen: vh, name: `${el.tagName.toLowerCase()} ${(el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').slice(0, 30)}` };
        });
        await page.screenshot({ path: `${OUT}/${slug}-keyboard.png` });
        await page.evaluate(() => window.__setKb(0));
      }
    } catch (e) { entry.error = String(e).slice(0, 200); }
    report.push(entry);
  }
  await ctx.close();
}
} finally {
  await browser?.close();
  await admin.from('scripts').delete().eq('id', script.id); await admin.from('projects').delete().eq('id', project.id); await admin.auth.admin.deleteUser(user.id);
}
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1));
for (const r of report) {
  const c = r.counts || {};
  console.log(`${r.mode.padEnd(9)} ${r.route.slice(0, 52).padEnd(52)} ${r.error ? 'ERROR ' + r.error : `wide ${c.wide} small ${c.small} tiny ${c.tiny} underBar ${c.hiddenUnderBar}${r.scrollsSideways ? ' SIDEWAYS' : ''}${r.keyboard && r.keyboard.focused && !r.keyboard.inView ? ' KEYBOARD-HIDES-FIELD' : ''}${r.keyboard && r.keyboard.actionInView === false ? ` KEYBOARD-HIDES-ACTION(${r.keyboard.action})` : ''}`}`);
}
