#!/usr/bin/env node
// Page-weight budget. After `npm run build`, adds up the JavaScript each page
// ships on first load (the root layout's chunks plus the page's own, gzipped —
// the figure `next build` prints as "First Load JS") and compares it with
// performance-budget.json. Fails when a page goes over, so a heavy import that
// sneaks into Studio or the editor is caught in the PR, not by a phone on set.
//
//   npm run budget            check against the budget
//   npm run budget -- --update rewrite the budget from this build (+10% headroom)
//
// Reads the per-page client manifests (Next 16, webpack or Turbopack), or
// webpack's app-build-manifest.json from older builds.
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const next = path.join(root, '.next');
const budgetPath = path.join(root, 'performance-budget.json');

/** route → the JS files a first visit loads (relative to .next). */
function pageChunks() {
  const webpack = path.join(next, 'app-build-manifest.json');
  if (existsSync(webpack)) {
    const pages = JSON.parse(readFileSync(webpack, 'utf8')).pages;
    const layout = pages['/layout'] ?? [];
    return Object.entries(pages)
      .filter(([key]) => key.endsWith('/page'))
      .map(([key, chunks]) => [key.slice(0, -'/page'.length) || '/', [...layout, ...chunks]]);
  }

  const appDir = path.join(next, 'server', 'app');
  const buildManifest = path.join(next, 'build-manifest.json');
  if (!existsSync(appDir) || !existsSync(buildManifest)) return null;
  const rootMain = JSON.parse(readFileSync(buildManifest, 'utf8')).rootMainFiles ?? [];
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) { walk(full); continue; }
      if (name !== 'page_client-reference-manifest.js') continue;
      const sandbox = { globalThis: {} };
      sandbox.globalThis = sandbox;
      vm.runInNewContext(readFileSync(full, 'utf8'), sandbox);
      for (const [key, manifest] of Object.entries(sandbox.__RSC_MANIFEST ?? {})) {
        if (!key.endsWith('/page')) continue;
        const route = key.slice(0, -'/page'.length).replace(/\/\([^)]+\)/g, '') || '/';
        // Turbopack lists a page's chunks under entryJSFiles; webpack (Next 16)
        // under each client module's chunks, as [id, file, id, file…].
        const entry = Object.values(manifest.entryJSFiles ?? {}).flat();
        const modules = Object.values(manifest.clientModules ?? {})
          .flatMap((m) => m.chunks ?? [])
          .filter((c) => typeof c === 'string' && c.endsWith('.js'))
          .map((c) => decodeURIComponent(c.replace(/^\/_next\//, '')));
        out.push([route, [...rootMain, ...entry, ...modules]]);
      }
    }
  };
  walk(appDir);
  return out;
}

const pages = pageChunks();
if (!pages?.length) {
  console.error('No build found in .next — run `npm run build` first.');
  process.exit(1);
}

const gz = new Map();
const size = (chunk) => {
  if (!gz.has(chunk)) gz.set(chunk, gzipSync(readFileSync(path.join(next, chunk))).length);
  return gz.get(chunk);
};
const kb = (bytes) => Math.round(bytes / 102.4) / 10;

const measured = pages
  .map(([route, chunks]) => {
    const files = [...new Set(chunks)].filter((c) => c.endsWith('.js'));
    return { route, kb: kb(files.reduce((sum, c) => sum + size(c), 0)) };
  })
  .sort((a, b) => b.kb - a.kb);

if (process.argv.includes('--update')) {
  const routes = Object.fromEntries(measured.map((m) => [m.route, Math.ceil(m.kb * 1.1)]));
  writeFileSync(budgetPath, JSON.stringify({ note: 'First-load JS per page, kB gzipped. Raise a number only on purpose.', routes }, null, 2) + '\n');
  console.log(`Wrote budgets for ${measured.length} pages to performance-budget.json`);
  process.exit(0);
}

const budget = existsSync(budgetPath) ? JSON.parse(readFileSync(budgetPath, 'utf8')).routes : {};
const DEFAULT = Math.max(0, ...Object.values(budget)) || Infinity; // a new page may not exceed the heaviest known one
let over = 0;
for (const m of measured) {
  const limit = budget[m.route] ?? DEFAULT;
  const bad = m.kb > limit;
  if (bad) over++;
  console.log(`${bad ? 'OVER' : 'ok  '} ${String(m.kb).padStart(7)} kB / ${String(limit).padStart(4)} kB  ${m.route}`);
}
if (over) {
  console.error(`\n${over} page(s) over budget. Trim the import (lazy-load it) or, if the weight is intended, raise the number in performance-budget.json.`);
  process.exit(1);
}
console.log(`\nAll ${measured.length} pages within budget.`);
