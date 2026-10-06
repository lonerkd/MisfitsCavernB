#!/usr/bin/env node
// The generated half of the Cavern bible: every route, what it's built from,
// and what it touches. Rebuild after adding or moving a page:
//
//   npm run bible      → .cavern-intelligence/bible/inventory.md
//
// For each page and API route it follows the page's own imports (@/… and
// relative) through components/ and lib/, and records the tables it reads or
// writes (`.from('x')`, live rows `table: 'x'`), the database functions it
// calls (`.rpc('x')`), storage buckets, realtime channels, and the e2e specs
// that open it. The access tier comes from proxy.ts. Facts only — the written
// chapters (bible/*.md) say what each part is for.
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const ROOT = process.cwd();
const OUT = '.cavern-intelligence/bible/inventory.md';

const walk = (dir, keep) => readdirSync(dir).flatMap((name) => {
  const p = join(dir, name);
  return statSync(p).isDirectory() ? walk(p, keep) : keep(p) ? [p] : [];
});
const read = (p) => readFileSync(p, 'utf8');

// ── Known tables, from the committed schema ────────────────────────────────
const fingerprint = read('supabase/schema.fingerprint').split('\n');
const TABLES = new Set(fingerprint.filter((l) => l.startsWith('rls ')).map((l) => l.split(' ')[1]));
const FUNCTIONS = new Set(fingerprint.filter((l) => l.startsWith('function public.')).map((l) => l.slice(16, l.indexOf('('))));

// ── Access tiers (proxy.ts) ─────────────────────────────────────────────────
const proxy = read('proxy.ts');
const listOf = (name) => [...(proxy.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\]`))?.[1] ?? '').matchAll(/'([^']+)'/g)].map((m) => m[1]);
const PUBLIC = listOf('publicPaths');
const PROTECTED = listOf('protectedPaths');
const under = (path, p) => path === p || path.startsWith(p + '/');
function tier(route) {
  const path = route.replace(/\[[^\]]+\]/g, 'x');
  if (PUBLIC.some((p) => p === '/' ? path === '/' : under(path, p))) return 'public';
  if (path.startsWith('/admin')) return 'admin';
  if (PROTECTED.some((p) => under(path, p))) return 'signed in';
  return 'open (page checks)';
}

// ── Import graph ────────────────────────────────────────────────────────────
const EXT = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];
function resolve(spec, from) {
  let base;
  if (spec.startsWith('@/')) base = join(ROOT, spec.slice(2));
  else if (spec.startsWith('.')) base = join(dirname(from), spec);
  else return null;
  for (const e of EXT) { const p = base + e; if (existsSync(p) && statSync(p).isFile()) return p; }
  return null;
}
const importsCache = new Map();
function importsOf(file) {
  if (!importsCache.has(file)) {
    const src = read(file);
    const specs = [...src.matchAll(/(?:import|export)[^'"`]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1] ?? m[2]);
    importsCache.set(file, specs.map((s) => resolve(s, file)).filter((p) => p && /\.(ts|tsx)$/.test(p) && !/\.test\.tsx?$/.test(p)));
  }
  return importsCache.get(file);
}
function closure(entry) {
  const seen = new Set([entry]);
  const stack = [entry];
  while (stack.length) for (const dep of importsOf(stack.pop())) if (!seen.has(dep)) { seen.add(dep); stack.push(dep); }
  return [...seen];
}

// ── What a file touches ─────────────────────────────────────────────────────
const touchCache = new Map();
function touches(file) {
  if (!touchCache.has(file)) {
    const src = read(file);
    const grab = (re) => [...src.matchAll(re)].map((m) => m[1]);
    touchCache.set(file, {
      tables: [...grab(/\.from\(\s*['"]([a-z_]+)['"]/g), ...grab(/\btable:\s*['"]([a-z_]+)['"]/g)].filter((t) => TABLES.has(t)),
      rpcs: grab(/\.rpc\(\s*['"]([a-z_]+)['"]/g),
      buckets: grab(/storage\s*\.from\(\s*['"]([a-z0-9_-]+)['"]/g),
      channels: grab(/\.channel\(\s*[`'"]([^`'"$]+)/g).map((c) => c.replace(/[:_-]+$/, '')),
    });
  }
  return touchCache.get(file);
}
const union = (files, key) => [...new Set(files.flatMap((f) => touches(f)[key]))].sort();

// ── E2E coverage: which specs open which routes ─────────────────────────────
const specs = walk('e2e', (p) => p.endsWith('.spec.ts'));
const specRoutes = specs.map((p) => ({
  spec: p.replace(/^e2e\//, ''),
  // `/projects/${id}/pitch` → `/projects/*/pitch`; the query string is dropped.
  // Any quoted path in the spec — goto(…) and the route lists specs loop over.
  paths: [...read(p).matchAll(/([`'"])(\/(?:[a-z\[$][^`'"\s]*)?)\1/g)]
    .map((m) => m[2].replace(/\$\{[^}]*\}/g, '*').replace(/[?#].*$/, '').replace(/\/+$/, '') || '/')
    // …and pages reached by clicking, checked with waitForURL(/\/split\?/).
    .concat([...read(p).matchAll(/waitForURL\(\s*\/((?:\\\/[a-z-]+)+)/g)].map((m) => m[1].replace(/\\\//g, '/'))),
}));
function coveredBy(route) {
  const re = new RegExp('^' + route.replace(/\[[^\]]+\]/g, '[^/]+') + '$');
  return specRoutes.filter((s) => s.paths.some((p) => re.test(p))).map((s) => s.spec);
}

// ── Routes ──────────────────────────────────────────────────────────────────
const pages = walk('app', (p) => /\/(page|route)\.tsx?$/.test(p)).sort();
const routeOf = (p) => '/' + relative('app', dirname(p)).split('/').filter((s) => !/^\(.*\)$/.test(s)).join('/');
const rows = pages.map((file) => {
  const route = routeOf(file).replace(/^\/$/, '/') || '/';
  const files = closure(file);
  const own = files.filter((f) => !f.includes('/lib/supabase/client'));
  return {
    route: route === '' ? '/' : route,
    kind: file.endsWith('route.ts') ? 'api' : 'page',
    file: relative(ROOT, file),
    lines: read(file).split('\n').length,
    graph: files.length,
    components: [...new Set(files.map((f) => relative(ROOT, f)).filter((f) => f.startsWith('components/')).map((f) => f.split('/').slice(0, 2).join('/').replace(/\.tsx$/, '')))].sort(),
    lib: [...new Set(files.map((f) => relative(ROOT, f)).filter((f) => f.startsWith('lib/')).map((f) => f.split('/')[1].replace(/\.tsx?$/, '')))].sort(),
    tables: union(own, 'tables'),
    rpcs: union(own, 'rpcs'),
    buckets: union(own, 'buckets'),
    channels: union(own, 'channels'),
    tier: tier(routeOf(file)),
    e2e: coveredBy(routeOf(file)),
  };
});

// ── Reverse indexes ─────────────────────────────────────────────────────────
const byTable = new Map([...TABLES].sort().map((t) => [t, rows.filter((r) => r.tables.includes(t)).map((r) => r.route)]));
const calledRpcs = new Set(rows.flatMap((r) => r.rpcs));
const allSrc = ['app', 'components', 'lib'].flatMap((d) => walk(d, (p) => /\.(ts|tsx)$/.test(p) && !/\.test\./.test(p)));
const usedAnywhere = new Set(allSrc.flatMap((f) => touches(f).rpcs));

const code = (xs) => xs.length ? xs.map((x) => `\`${x}\``).join(', ') : '—';
const md = [];
md.push('# Inventory (generated)', '');
md.push('> Built by `npm run bible` from the code — don\'t edit by hand. What each part is *for* is in the chapters (see [README](README.md)).', '');
md.push(`**${rows.filter((r) => r.kind === 'page').length} pages · ${rows.filter((r) => r.kind === 'api').length} API routes · ${TABLES.size} tables · ${FUNCTIONS.size} database functions · ${specs.length} e2e specs**`, '');
md.push('## Routes', '', '| Route | Access | File (lines) | Built from | e2e |', '|---|---|---|---|---|');
for (const r of rows) md.push(`| \`${r.route}\`${r.kind === 'api' ? ' (api)' : ''} | ${r.tier} | \`${r.file}\` (${r.lines}) | ${r.graph} files · components: ${r.components.map((c) => c.replace('components/', '')).join(', ') || '—'} · lib: ${r.lib.join(', ') || '—'} | ${r.e2e.length ? r.e2e.map((s) => s.replace('.spec.ts', '')).join(', ') : '**none**'} |`);
md.push('', '## What each route touches', '');
for (const r of rows) {
  md.push(`### \`${r.route}\``, '');
  md.push(`- **Tables:** ${code(r.tables)}`);
  if (r.rpcs.length) md.push(`- **Functions:** ${code(r.rpcs)}`);
  if (r.buckets.length) md.push(`- **Storage:** ${code(r.buckets)}`);
  if (r.channels.length) md.push(`- **Realtime:** ${code(r.channels)}`);
  md.push('');
}
md.push('## Tables → routes', '', '| Table | Used by |', '|---|---|');
for (const [t, rs] of byTable) md.push(`| \`${t}\` | ${rs.length ? rs.map((r) => `\`${r}\``).join(', ') : '**no route** (server-side, triggers or functions only)'} |`);
md.push('', '## Database functions', '');
const fnRows = [...FUNCTIONS].sort().map((f) => `| \`${f}\` | ${calledRpcs.has(f) ? 'called from a route' : usedAnywhere.has(f) ? 'called (outside a route graph)' : 'internal (policies, triggers, other functions)'} |`);
md.push('| Function | Use |', '|---|---|', ...fnRows, '');
md.push('## e2e specs → routes', '', '| Spec | Opens |', '|---|---|');
for (const s of specRoutes) md.push(`| \`${s.spec}\` | ${[...new Set(s.paths)].sort().map((p) => `\`${p}\``).join(', ') || '—'} |`);
md.push('');
writeFileSync(OUT, md.join('\n'));
console.log(`${OUT}: ${rows.length} routes, ${TABLES.size} tables, ${FUNCTIONS.size} functions, ${specs.length} specs`);
