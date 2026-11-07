#!/usr/bin/env node
// The merge gate: deterministic checks on what a pull request changes, the same for every author (a person, Claude, Copilot,
// another agent). It exists because the rules in RULES.md were an honour system: tests with code, docs with code, a session
// note, never editing a merged migration. A rule nothing enforces is a rule a weaker model (or a tired person) skips.
//
//   node scripts/pr-gate.mjs --base <sha> --head <sha> [--title "..."] [--body-file path]   run on a pull request
//   node scripts/pr-gate.mjs --replay <sha>                                                 run on a merged commit vs its parent
//
// Exit 1 and a list of what to fix when any check fails. Each check says how to satisfy it. A check can be waived only by
// an explicit line in the pull request description (so the waiver is visible in review): `No tests needed: <reason>`,
// `Large change: <reason>`. The script that runs in CI is read from the BASE branch, so a pull request cannot weaken it.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Source: the app, the engine, the auth gate, edge functions and the scripts CI itself runs.
const SRC = /^((app|components|lib|scripts|supabase\/functions)\/.+\.(ts|tsx|js|mjs|jsx)|proxy\.ts)$/;
const TEST = /(\.test\.(ts|tsx)$|^tests\/|^e2e\/)/;
const GENERATED = /^(lib\/supabase\/database\.types\.ts|supabase\/schema\.fingerprint|\.cavern-intelligence\/|package-lock\.json|eslint-suppressions\.json|performance-budget\.json)/;
const SESSIONS = /^\.cavern-intelligence\/sessions\/[^/]+\.md$/;
const MIGRATION = /^supabase\/migrations\/[^/]+\.sql$/;

export const LIMITS = { testsFromAddedLines: 60, newComponentLines: 60, largeAddedLines: 1200, largeFiles: 40 };

// Only a row of the §2.D allowlist table counts, not a mention elsewhere in the document.
const allowlisted = (doc, name) => {
  const m = /(^|\n)#+\s*[^\n]*definer-function allowlist[^\n]*\n([\s\S]*?)(?=\n#{1,3}\s|$)/i.exec(doc ?? '');
  const section = m ? m[2] : '';
  return section.split('\n').some((l) => l.trim().startsWith('|') && new RegExp(`\\b${name}\\b`).test(l));
};

const waiver = (body, label) => {
  const m = new RegExp(`^\\s*${label}:\\s*(.{20,})`, 'im').exec(body ?? '');
  return m ? m[1].trim() : null;
};

/** ctx: { title, body, files: [{ path, status: 'A'|'M'|'D'|'R', added: string[] }], tracked: (path)=>string|null, grep: (word)=>boolean,
 *         definerDoc: string, definedTokens: Set<string> } */
export function evaluate(ctx) {
  const out = [];
  const add = (id, ok, message) => out.push({ id, ok, message });
  const files = ctx.files;
  const body = ctx.body ?? '';
  // A dependency bump is exempt only when a dependency bot opened it: the title alone is the author's to choose.
  const isDeps = /^chore\(deps/.test(ctx.title ?? '') && /^(dependabot|renovate)(\[bot\])?$/i.test(ctx.author ?? '');

  // 1. A merged migration is never edited: production has it applied, so an edit is drift. New files only.
  const edited = files.filter((f) => MIGRATION.test(f.path) && f.status !== 'A');
  add('migrations-append-only', edited.length === 0,
    edited.length ? `A merged migration was ${edited.map((f) => `${f.status === 'D' ? 'deleted' : 'edited'}: ${f.path}`).join('; ')}. Production has it applied; never edit one. Put the change in a new migration file.` : '');

  // 2. A new SECURITY DEFINER function in public is on the allowlist in the same PR (database-and-security.md §2.D).
  const missing = [];
  for (const f of files.filter((x) => MIGRATION.test(x.path) && x.status === 'A')) {
    const sql = f.added.join('\n');
    // The whole statement: any dollar tag ($$, $fn1$), quoted names, and attributes before or after the body.
    for (const m of sql.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+"?public"?\."?([a-z0-9_]+)"?([\s\S]*?)(\$[A-Za-z0-9_]*\$)[\s\S]*?\3([^;]*);/gi)) {
      if (/SECURITY\s+DEFINER/i.test(m[2] + m[4]) && !allowlisted(ctx.definerDoc, m[1])) missing.push(`${m[1]} (${f.path})`);
    }
    for (const m of sql.matchAll(/ALTER\s+FUNCTION\s+"?public"?\."?([a-z0-9_]+)"?[^;]*?SECURITY\s+DEFINER/gi)) {
      if (!allowlisted(ctx.definerDoc, m[1])) missing.push(`${m[1]} (${f.path})`);
    }
  }
  add('definer-allowlist', missing.length === 0,
    missing.length ? `New SECURITY DEFINER function(s) callable through the API are not on the allowlist: ${missing.join(', ')}. Add each, with its gate, to .cavern-intelligence/database-and-security.md §2.D.` : '');

  // 3. A new table has row level security from birth.
  const noRls = [];
  for (const f of files.filter((x) => MIGRATION.test(x.path) && x.status === 'A')) {
    const sql = f.added.join('\n');
    for (const m of sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?public"?\.)?"?([a-z0-9_]+)"?/gi)) {
      if (!new RegExp(`ALTER\\s+TABLE\\s+(?:ONLY\\s+)?(?:"?public"?\\.)?"?${m[1]}"?\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, 'i').test(sql)) noRls.push(`${m[1]} (${f.path})`);
    }
  }
  add('rls-from-birth', noRls.length === 0, noRls.length ? `New table(s) without ENABLE ROW LEVEL SECURITY in the same migration: ${noRls.join(', ')}.` : '');

  // 4. Tests move with code.
  const src = files.filter((f) => SRC.test(f.path) && !TEST.test(f.path) && !GENERATED.test(f.path) && f.status !== 'D');
  const srcAdded = src.reduce((n, f) => n + f.added.length, 0);
  // A changed test counts only if it adds an assertion or a case (a test whose assertions were only removed is not coverage).
  const touchedTests = files.filter((f) => TEST.test(f.path) && f.status !== 'D' && f.added.some((l) => /\b(expect|assert|it|test)(\.(?!skip|todo|fixme)\w+)*\s*\(/.test(l)));
  const noTests = waiver(body, 'No tests needed');
  add('tests-with-code', isDeps || srcAdded < LIMITS.testsFromAddedLines || touchedTests.length > 0 || !!noTests,
    `This PR adds ${srcAdded} lines of source and changes no test (unit, tests/integration or e2e). Add one that fails without the change, or put a line "No tests needed: <why, 20+ characters>" in the description.`);

  // 5. New components come with new tests in proportion: one new test file (unit, integration or e2e spec) per five new
  // components that no existing test names. (An e2e spec drives the UI by text and rarely names the component.)
  const untested = [];
  for (const f of files.filter((x) => x.status === 'A' && /^components\/.+\.tsx$/.test(x.path) && !TEST.test(x.path) && x.added.length >= LIMITS.newComponentLines)) {
    const name = f.path.split('/').pop().replace(/\.tsx$/, '');
    if (!ctx.grep(name)) untested.push(name);
  }
  const newTestFiles = files.filter((f) => TEST.test(f.path) && f.status === 'A').length;
  const needed = Math.ceil(untested.length / 5);
  add('new-components-tested', untested.length === 0 || newTestFiles >= needed || !!noTests,
    `${untested.length} new component(s) no test names (${untested.slice(0, 8).join(', ')}${untested.length > 8 ? ', …' : ''}) and only ${newTestFiles} new test file(s) (need ${needed}). Add tests that render or drive them, or waive with "No tests needed: <why>".`);

  // 6. A session note per source change (RULES.md rule 8): a new file in .cavern-intelligence/sessions/.
  const touchesSource = files.some((f) => (SRC.test(f.path) || MIGRATION.test(f.path)) && !TEST.test(f.path) && !GENERATED.test(f.path));
  const note = files.some((f) => SESSIONS.test(f.path) && f.status === 'A');
  add('session-note', isDeps || !touchesSource || note, 'Source changed but no new note in .cavern-intelligence/sessions/ (YYYY-MM-DD-slug.md): what it does, what was verified, what is left.');

  // 7. The size of the change matches a reviewable change (a 3,000-line PR titled for four things cannot be reviewed).
  const counted = files.filter((f) => !GENERATED.test(f.path) && !TEST.test(f.path));
  const lines = counted.reduce((n, f) => n + f.added.length, 0);
  const large = waiver(body, 'Large change');
  add('reviewable-size', isDeps || (lines <= LIMITS.largeAddedLines && counted.length <= LIMITS.largeFiles) || !!large,
    `${lines} added lines in ${counted.length} files (generated files and tests not counted) is more than can be reviewed under one title (limit ${LIMITS.largeAddedLines} lines / ${LIMITS.largeFiles} files). Split it, or put "Large change: <what it contains and why it is one change>" in the description.`);

  // 8. Every theme token used in new code is defined (var(--warning, #b45309) used one that was not, so it followed no theme).
  const used = new Set();
  for (const f of files.filter((x) => /\.(tsx?|css)$/.test(x.path) && !TEST.test(x.path) && !/^app\/globals\.css$/.test(x.path))) {
    for (const line of f.added) for (const m of line.matchAll(/var\(\s*(--[a-z0-9-]+)/gi)) used.add(m[1]);
  }
  const undefinedTokens = [...used].filter((t) => !ctx.definedTokens.has(t));
  add('tokens-defined', undefinedTokens.length === 0, `Token(s) used but defined nowhere: ${undefinedTokens.join(', ')}. Use one from app/globals.css (design-tokens.md).`);

  // 9. The lint baseline only shrinks: a new violation is fixed, not recorded.
  // (Skipped when the base has no baseline yet: the PR that creates it is the baseline.)
  if (ctx.suppressions?.base) {
    const grew = [];
    const { base, head } = ctx.suppressions;
    for (const [file, rules] of Object.entries(head ?? {})) for (const [rule, v] of Object.entries(rules)) {
      const before = base?.[file]?.[rule]?.count ?? 0;
      if ((v?.count ?? 0) > before) grew.push(`${file} › ${rule} (${before} → ${v.count})`);
    }
    add('lint-baseline-shrinks', grew.length === 0,
      `eslint-suppressions.json grew: ${grew.slice(0, 6).join('; ')}${grew.length > 6 ? '; …' : ''}. Fix the new violation instead of recording it. (An owner-approved baseline change is not a thing an author can grant.)`);
  }

  return out;
}

// ── git plumbing ────────────────────────────────────────────────────────────
const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });

export function contextFromGit(base, head, title, body) {
  const names = git('diff', '--name-status', '-M', `${base}...${head}`).split('\n').filter(Boolean).map((l) => {
    const p = l.split('\t');
    return { status: p[0][0], path: p[p.length - 1] };
  });
  const files = names.map(({ status, path }) => {
    let added = [];
    if (status !== 'D') {
      const d = git('diff', '-U0', '-M', `${base}...${head}`, '--', path);
      added = d.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).map((l) => l.slice(1));
    }
    return { path, status, added };
  });
  const show = (ref, p) => { try { return git('show', `${ref}:${p}`); } catch { return ''; } };
  const css = git('ls-tree', '-r', '--name-only', head).split('\n').filter((p) => /\.(css|tsx?)$/.test(p) && /^(app|components|lib)\//.test(p));
  const definedTokens = new Set();
  for (const p of css) {
    const s = show(head, p);
    for (const m of s.matchAll(/(--[a-z0-9-]+)\s*:/gi)) definedTokens.add(m[1]);
    for (const m of s.matchAll(/['"`](--[a-z0-9-]+)['"`]\s*[:,)]/g)) definedTokens.add(m[1]); // set from code (setProperty / style objects)
  }
  const tests = git('ls-tree', '-r', '--name-only', head).split('\n').filter((p) => TEST.test(p));
  const testText = tests.map((p) => show(head, p)).join('\n');
  const parse = (ref) => { try { return JSON.parse(show(ref, 'eslint-suppressions.json') || 'null'); } catch { return null; } };
  return {
    title, body, files, definedTokens,
    suppressions: { base: parse(base), head: parse(head) },
    definerDoc: show(head, '.cavern-intelligence/database-and-security.md'),
    grep: (word) => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(testText),
  };
}

export function render(results) {
  const failed = results.filter((r) => !r.ok);
  const lines = results.map((r) => `${r.ok ? 'ok  ' : 'FAIL'}  ${r.id}${r.ok ? '' : `\n      ${r.message}`}`);
  return { text: lines.join('\n'), failed };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = process.argv.slice(2);
  const arg = (n) => { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : undefined; };
  let base = arg('--base'), head = arg('--head');
  const replay = arg('--replay');
  if (replay) { head = replay; base = `${replay}^`; }
  if (!base || !head) { console.error('usage: pr-gate.mjs --base <sha> --head <sha> [--title t] [--body-file f] | --replay <sha>'); process.exit(2); }
  const body = arg('--body-file') ? readFileSync(arg('--body-file'), 'utf8') : (process.env.PR_BODY ?? '');
  const title = arg('--title') ?? process.env.PR_TITLE ?? '';
  const author = arg('--author') ?? process.env.PR_AUTHOR ?? '';
  const { text, failed } = render(evaluate({ ...contextFromGit(base, head, title, body), author }));
  console.log(text);
  if (failed.length) { console.error(`\n${failed.length} check(s) failed.`); process.exit(1); }
  console.log('\nThe gate passes.');
}
