#!/usr/bin/env node
// The visual half of the Cavern bible: every page and state, desktop and
// phone, on the demo world. Needs the local stack (npm run stack:up -- build).
//
//   npm run bible:shots   → .cavern-intelligence/bible/screens/*.webp + screens.md
//
// It makes (or reuses) a local account, seeds the demo world into it with
// scripts/demo (projects at every stage, a crew, a shoot, a cut), makes it an
// admin for the admin pages, signs in for real and photographs each route.
// Local only: it refuses to run against anything but the local stack.
import { execSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import sharp from 'sharp';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const OUT = '.cavern-intelligence/bible/screens';
const EMAIL = 'bible@cavern.local';
const PASSWORD = 'bible-local-only-1';
const ONLY = process.argv.slice(2); // optional: slugs to (re)take

const status = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
if (!/127\.0\.0\.1|localhost/.test(status.API_URL) || !/localhost/.test(BASE)) {
  console.error('bible:shots runs against the local stack only.');
  process.exit(1);
}
const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const db = new pg.Client({ connectionString: status.DB_URL });
await db.connect();

// ── The account and its demo world ─────────────────────────────────────────
const existing = (await db.query('select id from auth.users where email = $1', [EMAIL])).rows[0]?.id;
let userId = existing;
if (existing) {
  await admin.auth.admin.updateUserById(existing, { password: PASSWORD });
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL, password: PASSWORD, email_confirm: true, user_metadata: { username: 'cavern' },
  });
  if (error) throw error;
  userId = data.user.id;
}
const demoSql = execSync(`node_modules/.bin/jiti scripts/demo/build.ts ${EMAIL} America/Edmonton`, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
await db.query(demoSql);
await db.query(`update profiles set is_admin = true where id = $1`, [userId]);

// The project deepest into production (call sheets, then crew, then scenes)
// shows the Studio at its fullest.
const one = async (sql, args = []) => (await db.query(sql, args)).rows[0] ?? {};
const project = await one(`
  select p.id, p.title, p.share_token from projects p
  where p.creator_id = $1
  order by (select count(*) from call_sheets cs where cs.project_id = p.id) * 100
         + (select count(*) from project_crew pc where pc.project_id = p.id) * 10
         + (select count(*) from scenes s join scripts sc on sc.id = s.script_id where sc.project_id = p.id) desc,
           p.created_at
  limit 1`, [userId]);
const script = await one(`select id from scripts where project_id = $1 order by updated_at desc nulls last limit 1`, [project.id]);
const sheet = await one(`select id from call_sheets where project_id = $1 order by shoot_date desc nulls last limit 1`, [project.id]);
const job = await one(`select id from jobs where created_by = $1 order by created_at limit 1`, [userId]);
const person = await one(`select user_id as id from project_crew where project_id = $1 and user_id <> $2 limit 1`, [project.id, userId]);
const portfolio = await one(`select share_token from portfolio_projects where user_id = $1 and share_token is not null limit 1`, [userId]).catch(() => ({}));
const sharedScript = await one(`select share_token from scripts where project_id = $1 and share_token is not null limit 1`, [project.id]);
await db.end();

// ── What to photograph ──────────────────────────────────────────────────────
const studio = (tab, view) => `/studio?tab=${tab}${view ? `&view=${view}` : ''}`;
const SIGNED_OUT = [
  ['landing', '/'],
  ['auth', '/auth'],
  ['showcase', '/showcase'],
  ['privacy', '/privacy'],
  ['terms', '/terms'],
  project.share_token && ['shared-project', `/shared/${project.share_token}`],
  portfolio.share_token && ['press-kit', `/p/${portfolio.share_token}`],
  sharedScript.share_token && ['shared-script', `/s/${sharedScript.share_token}`],
].filter(Boolean);
const SIGNED_IN = [
  ['home', '/'],
  ['today', '/today'],
  ['welcome', '/welcome'],
  ['projects', '/projects'],
  ['project-hub', `/projects/${project.id}`],
  ['project-pitch', `/projects/${project.id}/pitch`],
  ['studio-overview', studio('overview')],
  ['studio-library', studio('library')],
  ['studio-scenes', studio('scenes')],
  ['studio-pitch', studio('pitch')],
  ...['story', 'breakdown', 'readiness', 'schedule', 'onset', 'crew', 'locations', 'money', 'paperwork']
    .map((v) => [`studio-production-${v}`, studio('production', v)]),
  ['studio-post', studio('post')],
  ['studio-promos', studio('promos')],
  ['studio-share', studio('share')],
  script.id && ['editor', `/editor?script=${script.id}`],
  sheet.id && ['call-sheet', `/call/${sheet.id}`],
  ['split', '/split'],
  ['lounge', '/lounge'],
  ['crew', '/crew'],
  person.id && ['crew-profile', `/crew/${person.id}`],
  ['jobs', '/jobs'],
  job.id && ['job', `/jobs/${job.id}`],
  ['portfolio', '/portfolio'],
  ['portfolio-manage', '/portfolio/manage'],
  ['soundtrack', '/soundtrack'],
  ['profile', '/profile'],
  ['settings', '/settings'],
  ['admin', '/admin'],
  ['admin-users', '/admin/users'],
  ['admin-analytics', '/admin/analytics'],
  ['admin-errors', '/admin/errors'],
  ['admin-audit-logs', '/admin/audit-logs'],
].filter(Boolean);

const SIZES = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  { name: 'phone', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
];
const MAX_HEIGHT = { desktop: 2400, phone: 3200 }; // long pages are cut, not shrunk

mkdirSync(OUT, { recursive: true });
if (!ONLY.length) for (const f of readdirSync(OUT)) rmSync(`${OUT}/${f}`);

const browser = await chromium.launch(process.env.MC_LOCAL_CHROMIUM ? { executablePath: process.env.MC_LOCAL_CHROMIUM } : {});
const shot = async (page, slug, size) => {
  const png = await page.screenshot({ fullPage: true, animations: 'disabled', caret: 'hide' });
  const img = sharp(png);
  const { width, height } = await img.metadata();
  const cut = Math.min(height, MAX_HEIGHT[size] * (size === 'phone' ? 2 : 1));
  await img.extract({ left: 0, top: 0, width, height: cut })
    .resize({ width: size === 'phone' ? 390 : 1440 })
    .webp({ quality: 58 })
    .toFile(`${OUT}/${slug}--${size}.webp`);
};
const settle = async (page) => {
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  // Sections that reveal on scroll only render once seen: walk down the page,
  // then back to the top before the shot.
  await page.evaluate(async () => {
    const step = Math.max(400, window.innerHeight * 0.8);
    for (let y = 0; y < document.documentElement.scrollHeight && y < 12_000; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(900);
};

const taken = [];
for (const size of SIZES) {
  for (const signedIn of [false, true]) {
    const ctx = await browser.newContext({ ...size, colorScheme: 'dark', reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    if (signedIn) {
      await page.goto(`${BASE}/auth`);
      await page.fill('input[name="email"]', EMAIL);
      await page.fill('input[name="password"]', PASSWORD);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
      await page.evaluate((id) => localStorage.setItem('mc_active_project', id), project.id);
    }
    for (const [slug0, path] of signedIn ? SIGNED_IN : SIGNED_OUT) {
      const slug = signedIn || slug0 === 'auth' ? slug0 : `public-${slug0}`;
      if (ONLY.length && !ONLY.includes(slug)) continue;
      try {
        await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await settle(page);
        await shot(page, slug, size.name);
        taken.push({ slug, path, size: size.name, landed: new URL(page.url()).pathname });
        console.log(`${size.name.padEnd(7)} ${slug}`);
      } catch (e) {
        console.warn(`${size.name.padEnd(7)} ${slug} FAILED: ${e.message.split('\n')[0]}`);
      }
    }
    await ctx.close();
  }
}
await browser.close();

// ── Index ───────────────────────────────────────────────────────────────────
if (!ONLY.length) {
  const slugs = [...new Set(taken.map((t) => t.slug))];
  const md = ['# Screens (generated)', '',
    `> Taken by \`npm run bible:shots\` on the demo world (project "${project.title}"), dark theme, ${new Date().toISOString().slice(0, 10)}. Desktop 1440 wide, phone 390; long pages are cut at ${MAX_HEIGHT.desktop}/${MAX_HEIGHT.phone}px. What each screen is for is in the chapters.`, '',
    '| Screen | Path | Desktop | Phone |', '|---|---|---|---|'];
  for (const slug of slugs) {
    const t = taken.find((x) => x.slug === slug);
    const redirected = t.landed !== t.path.split('?')[0] ? ` → \`${t.landed}\`` : '';
    const img = (s) => taken.some((x) => x.slug === slug && x.size === s) ? `<img src="${slug}--${s}.webp" width="${s === 'phone' ? 120 : 320}">` : '—';
    md.push(`| **${slug}** | \`${t.path.replace(/[0-9a-f-]{36}|[0-9a-f]{32}/g, '…')}\`${redirected} | ${img('desktop')} | ${img('phone')} |`);
  }
  writeFileSync(`${OUT}/README.md`, md.join('\n') + '\n');
  console.log(`${OUT}: ${taken.length} images, ${slugs.length} screens`);
}
