// Checks the demo content against what the database actually allows, before any SQL is generated or run:
//   DB_URL=postgresql://... npm run demo:validate
// (the local stack's DB_URL is in `npx supabase status -o env`). It reads the crafts, the brief questions' options and the post
// departments from the database, then fails on a craft, job role, brief answer or department the database would reject, and on duplicate keys.
// Written after a first rehearsal found these one error at a time: "Colourist" (the app says Colorist), a tone of "wry", "tiktok" as a platform.
import { execFileSync } from 'node:child_process';
import { PERSONAS, PROJECTS } from './all';

const url = process.env.DB_URL;
if (!url) { console.error('set DB_URL to the database to read the allowed values from'); process.exit(1); }
const rows = (sql: string): string[][] => execFileSync('psql', [url, '-At', '-F', '|', '-c', sql], { encoding: 'utf8' }).split('\n').filter(Boolean).map((l) => l.split('|'));

const crafts = new Set(rows('select name from public.crafts').map((r) => r[0]));
const brief = new Map(rows("select key, kind, coalesce((select string_agg(o->>'id', ',') from jsonb_array_elements(options) o), ''), coalesce(min_value::text, ''), coalesce(max_value::text, '') from public.brief_questions")
  .map(([k, kind, ids, min, max]) => [k, { kind, ids: ids ? ids.split(',') : [], min: Number(min), max: Number(max) }] as const));
const depts = new Set(rows("select unnest(array['edit','sound','music','color','vfx','titles','general'])").map((r) => r[0]));

const errs: string[] = [];
const personaKeys = new Set<string>();
const personaNames = new Set<string>();
for (const p of PERSONAS) {
  if (personaKeys.has(p.key)) errs.push(`duplicate persona key ${p.key}`);
  if (personaNames.has(p.username)) errs.push(`duplicate persona username ${p.username}`);
  personaKeys.add(p.key); personaNames.add(p.username);
  if (!crafts.has(p.craft)) errs.push(`persona ${p.key}: craft "${p.craft}"`);
}
const projectKeys = new Set<string>();
for (const p of PROJECTS) {
  if (projectKeys.has(p.key)) errs.push(`duplicate project key ${p.key}`);
  projectKeys.add(p.key);
  for (const c of p.crew ?? []) if (!crafts.has(c.craft)) errs.push(`${p.key}: crew craft "${c.craft}"`);
  for (const j of p.jobs ?? []) if (!crafts.has(j.role)) errs.push(`${p.key}: job role "${j.role}"`);
  for (const it of p.post ?? []) if (it.dept != null && !depts.has(it.dept)) errs.push(`${p.key}: post department "${it.dept}" (${it.title})`);
  for (const [q, v] of Object.entries(p.brief ?? {})) {
    const d = brief.get(q);
    if (!d) { errs.push(`${p.key}: unknown brief question "${q}"`); continue; }
    if (d.kind === 'one' && !(typeof v === 'string' && d.ids.includes(v))) errs.push(`${p.key}: brief ${q}=${JSON.stringify(v)} is not one of ${d.ids.join('/')}`);
    if (d.kind === 'many') { const a = Array.isArray(v) ? v : []; if (!a.length || a.some((x) => !d.ids.includes(String(x))) || new Set(a).size !== a.length) errs.push(`${p.key}: brief ${q}=${JSON.stringify(v)} is not a non-empty list of distinct options from ${d.ids.join('/')}`); }
    if (d.kind === 'number' && !(typeof v === 'number' && v >= d.min && v <= d.max)) errs.push(`${p.key}: brief ${q}=${JSON.stringify(v)} is not a number from ${d.min} to ${d.max}`);
  }
}
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
console.log(`demo content is valid: ${PERSONAS.length} people, ${PROJECTS.length} projects`);
