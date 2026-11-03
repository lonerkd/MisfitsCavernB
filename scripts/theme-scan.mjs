#!/usr/bin/env node
// Looks for text that does not read in a theme: walks the suite's screens as the demo account, and for every piece of text
// works out its colour against what is really behind it (stacked translucent backgrounds included) and lists the ones under
// 3:1. A pass over a light theme finds what was only ever right in the dark ones (white on a pale surface, a hard-coded
// brand colour as text). Skips text over an image or gradient (media stages are dark on purpose).
//
//   npm run theme:scan                       the default theme, desktop
//   THEME=slate npm run theme:scan           another theme (an id from lib/themes/themes.ts)
//   PHONE=1 npm run theme:scan               at phone width
//   npm run theme:scan -- /jobs /today       only these routes
//
// Needs the local stack and the demo account (npm run stack:up -- build, then npm run bible:shots once). Local only.
import { chromium } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
if (!/localhost|127\.0\.0\.1/.test(BASE)) { console.error('theme:scan runs against the local stack only.'); process.exit(1); }
const EMAIL = 'bible@cavern.local';
const PASSWORD = 'bible-local-only-1';
const THEME = process.env.THEME;
const PHONE = !!process.env.PHONE;
const MIN = Number(process.env.MIN_CONTRAST || 3);
const DEFAULT_ROUTES = [
  '/today', '/projects', '/jobs', '/lounge', '/settings', '/profile', '/crew', '/hub', '/portfolio', '/editor',
  '/admin', '/admin/users', '/admin/audit-logs',
  '/studio?tab=overview', '/studio?tab=library', '/studio?tab=scenes', '/studio?tab=post', '/studio?tab=pitch', '/studio?tab=share',
  ...['story', 'breakdown', 'readiness', 'locations', 'continuity', 'money', 'paperwork', 'schedule', 'onset', 'crew'].map((v) => `/studio?tab=production&view=${v}`),
];
const routes = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_ROUTES;

const browser = await chromium.launch(process.env.MC_LOCAL_CHROMIUM ? { executablePath: process.env.MC_LOCAL_CHROMIUM } : {});
const ctx = await browser.newContext({ viewport: PHONE ? { width: 390, height: 844 } : { width: 1440, height: 900 }, hasTouch: PHONE, isMobile: PHONE });
if (THEME) await ctx.addInitScript((t) => { try { localStorage.setItem('mc_theme', JSON.stringify({ id: t })); } catch { /* private mode */ } }, THEME);
const page = await ctx.newPage();
await page.goto(`${BASE}/auth`, { waitUntil: 'networkidle' });
await page.fill('input[name="email"]', EMAIL);
await page.fill('input[name="password"]', PASSWORD);
await page.locator('button[type="submit"]').click();
await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });

let total = 0;
for (const route of routes) {
  await page.goto(BASE + route, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(1800);
  const found = await page.evaluate((min) => {
    const out = [];
    const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] }; };
    const over = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
    const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
    const page = parse(getComputedStyle(document.body).backgroundColor) ?? { r: 255, g: 255, b: 255, a: 1 };
    const root = page.a > 0 ? over(page, { r: 255, g: 255, b: 255, a: 1 }) : { r: 255, g: 255, b: 255, a: 1 };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    while (walker.nextNode()) {
      const txt = (walker.currentNode.nodeValue || '').trim();
      const el = walker.currentNode.parentElement;
      if (txt.length < 2 || !el || seen.has(el)) continue;
      seen.add(el);
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > 2400) continue;
      const layers = []; let skip = false;
      for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
        const s = getComputedStyle(n);
        if (s.backgroundImage && s.backgroundImage !== 'none') { skip = true; break; }
        const c = parse(s.backgroundColor);
        if (c && c.a > 0) { layers.push(c); if (c.a >= 0.99) break; }
      }
      if (skip) continue;
      let base = root;
      for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
      let fg = parse(cs.color); if (!fg) continue;
      if (fg.a < 1) fg = over(fg, base);
      const [l1, l2] = [lum(fg), lum(base)];
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      if (ratio < min) out.push({ ratio: +ratio.toFixed(2), size: parseFloat(cs.fontSize), text: txt.slice(0, 40), cls: typeof el.className === 'string' && el.className ? el.className.split(' ')[0] : el.tagName.toLowerCase(), fg: cs.color, bg: `rgb(${Math.round(base.r)},${Math.round(base.g)},${Math.round(base.b)})` });
    }
    return out;
  }, MIN);
  const kinds = new Map();
  for (const f of found) { const k = `${f.cls}|${f.fg}|${f.bg}`; if (!kinds.has(k)) kinds.set(k, f); }
  total += kinds.size;
  if (kinds.size) {
    console.log(`\n${route}: ${kinds.size} kind${kinds.size === 1 ? '' : 's'} under ${MIN}:1`);
    for (const f of [...kinds.values()].slice(0, 10)) console.log(`  ${f.ratio}:1  .${f.cls}  "${f.text}"  ${f.fg} on ${f.bg}  ${f.size}px`);
  }
}
await browser.close();
console.log(`\n${routes.length} screens, ${THEME || "default theme"}${PHONE ? ', phone' : ''}: ${total ? `${total} low-contrast kind${total === 1 ? '' : 's'}` : 'every piece of text reads'}.`);
process.exit(total ? 1 : 0);
