// What each part of the suite tells the island, read from the source (not remembered): which pages register a stage
// (`usePillStage`), which areas register a hover/focus zone (`usePillZone`), and the fields, toggles and actions each
// descriptor offers. The island is only as deep as this. Pure: file contents in, a reference out; the test and
// `npm run island:coverage` read the files. See `plans/2026-11-02-island-at-every-size.md` (step 0).

export interface Registration {
  /** Path as given (app/(suite)/jobs/page.tsx). */
  file: string;
  kind: 'stage' | 'zone';
  module: string;
  title: string;
  fields: string[];
  toggles: string[];
  actions: Array<{ id: string; label: string; slot?: PillSlot }>;
}

import { assignKeys, SLOT_KEYS, type PillSlot } from './slots';

const CALL = /\b(usePillStage|usePillZone)\(/g;

/** The `{ ... }` that starts at or after `from`, balanced, ignoring braces inside strings and template literals. */
function objectAfter(src: string, from: number): string | null {
  const start = src.indexOf('{', from);
  if (start < 0) return null;
  let depth = 0;
  let quote: string | null = null;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return src.slice(start, i + 1);
  }
  return null;
}

/** Split `src` on commas that are not inside brackets, strings or template literals. */
function splitTop(src: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let last = 0;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') quote = c;
    else if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (c === ',' && depth === 0) { parts.push(src.slice(last, i)); last = i + 1; }
  }
  parts.push(src.slice(last));
  return parts.map((p) => p.trim()).filter(Boolean);
}

/** The top-level `key: value` pairs of an object or array-element source (`{ ... }`). */
function props(obj: string): Record<string, string> {
  const out: Record<string, string> = {};
  const inner = obj.trim().replace(/^\{/, '').replace(/\}$/, '');
  for (const part of splitTop(inner)) {
    const m = /^([A-Za-z_$][\w$]*)\s*:\s*([\s\S]*)$/.exec(part);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

/** A value that is exactly one string literal gives its text; anything else is worked out at run time. */
const text = (raw: string | undefined): string => {
  if (!raw) return '(none)';
  const m = /^(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`)$/.exec(raw.trim());
  return m ? (m[1] ?? m[2] ?? m[3] ?? '').replace(/\$\{[^}]*\}/g, '…') : '(computed)';
};

/** Every outermost `{ ... }` in `src`, strings respected. */
function objectsIn(src: string): string[] {
  const out: string[] = [];
  let at = 0;
  for (;;) {
    const o = objectAfter(src, at);
    if (!o) return out;
    const i = src.indexOf(o, at);
    out.push(o);
    at = i + o.length;
  }
}

/** The elements of the array literal under `key` — each element's own props. A conditional array (`x ? [..] : []`) is read too. */
function entries(obj: Record<string, string>, key: string): Array<{ id: string; label: string; slot?: PillSlot }> {
  const raw = obj[key];
  if (!raw) return [];
  // Every array literal at the top of the value: a plain `[..]`, or each branch of `cond ? [] : [{..}]`. Objects found in a
  // branch are offered only sometimes, so they are marked conditional.
  const plain = raw.trim().startsWith('[');
  const arrays: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = -1;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'" || c === '`') quote = c;
    else if (c === '[') { if (depth === 0) start = i; depth++; }
    else if (c === ']' && --depth === 0 && start >= 0) { arrays.push(raw.slice(start + 1, i)); start = -1; }
    else if (c === '(' || c === '{') depth++;
    else if (c === ')' || c === '}') depth--;
  }
  const out: Array<{ id: string; label: string; slot?: PillSlot }> = [];
  const add = (el: string, conditional: boolean) => {
    const p = props(el);
    if (p.label === undefined) return;
    const slot = p.slot ? text(p.slot.replace(/\s+as\s+const\s*$/, '')) : undefined;
    out.push({ id: p.id ? text(p.id) : '', label: text(p.label) + (conditional ? ' (conditional)' : ''), ...(slot && slot in SLOT_KEYS ? { slot: slot as PillSlot } : {}) });
  };
  for (const inner of arrays) {
    for (const el of splitTop(inner)) {
      if (el.startsWith('{')) add(el, !plain);
      // A spread such as `...(user ? [{ label: 'Mine' }] : [])`: its objects are offered only sometimes.
      else if (el.startsWith('...')) for (const o of objectsIn(el)) add(o, true);
    }
  }
  return out;
}

/**
 * The Caps Lock deck key each control of a descriptor gets, by the island's own rule (`assignKeys`): an action with a
 * `slot` has that slot's key on every page; the rest fill the free keys, toggles first, then actions, then the route's
 * links. A `~` means a conditional control comes before an unslotted one, so its key moves with what the page shows.
 */
export function deckKeys(r: Pick<Registration, 'toggles' | 'actions'>): { toggles: string[]; actions: string[] } {
  const items = [...r.toggles.map((): { slot?: PillSlot } => ({})), ...r.actions.map((a) => ({ slot: a.slot }))];
  const labels = [...r.toggles, ...r.actions.map((a) => a.label)];
  const keys = assignKeys(items);
  const keyAt = (i: number): string => {
    const k = keys[i];
    if (!k) return '–';
    const moves = !items[i].slot && labels.slice(0, i).some((l) => l.endsWith('(conditional)'));
    return (moves ? '~' : '') + k.toUpperCase();
  };
  return { toggles: r.toggles.map((_, i) => keyAt(i)), actions: r.actions.map((_, i) => keyAt(r.toggles.length + i)) };
}

export function registrationsIn(file: string, src: string): Registration[] {
  const out: Registration[] = [];
  CALL.lastIndex = 0;
  for (let m = CALL.exec(src); m; m = CALL.exec(src)) {
    // Skip the hook's own definition and imports: a real call is followed by an object (or a conditional that has one).
    const after = src.slice(m.index + m[0].length, m.index + m[0].length + 600);
    if (/^\s*(descriptor|d)\b/.test(after) && !after.includes('{')) continue;
    const obj = objectAfter(src, m.index + m[0].length);
    if (!obj || !/\bmodule\s*:/.test(obj)) continue;
    const p = props(obj);
    out.push({
      file,
      kind: m[1] === 'usePillStage' ? 'stage' : 'zone',
      module: text(p.module),
      title: text(p.title),
      fields: entries(p, 'fields').map((e) => e.label),
      toggles: entries(p, 'toggles').map((e) => e.label),
      actions: entries(p, 'actions'),
    });
  }
  return out;
}

/** Route areas: the first segment under app/(suite) that has a page.tsx anywhere beneath it. */
export function areasOf(pageFiles: string[]): string[] {
  const areas = new Set<string>();
  for (const f of pageFiles) {
    const m = /^app\/\(suite\)\/([^/]+)\//.exec(f);
    if (m && !m[1].startsWith('(') && !m[1].startsWith('[')) areas.add(m[1]);
  }
  return [...areas].sort();
}

/** The route area a registration belongs to: its own folder under app/(suite), or the area whose files import the component that registers it. */
export function areaOfRegistration(file: string, appSources: Record<string, string>): string | undefined {
  const own = /^app\/\(suite\)\/([^/]+)\//.exec(file)?.[1];
  if (own) return own;
  const base = file.replace(/^.*\//, '').replace(/\.(tsx|ts)$/, '');
  for (const [f, src] of Object.entries(appSources)) {
    if (!new RegExp(`from\\s+['"][^'"]*/${base}['"]`).test(src)) continue;
    const a = /^app\/\(suite\)\/([^/]+)\//.exec(f)?.[1];
    if (a) return a;
  }
  return undefined;
}

export function buildCoverage(input: { files: Record<string, string>; pageFiles: string[]; appSources?: Record<string, string> }): string {
  const regs = Object.entries(input.files).flatMap(([file, src]) => registrationsIn(file, src)).sort((a, b) => a.file.localeCompare(b.file) || a.title.localeCompare(b.title));
  const stageAreas = new Set(regs.filter((r) => r.kind === 'stage').map((r) => areaOfRegistration(r.file, input.appSources ?? {})).filter(Boolean));
  const areas = areasOf(input.pageFiles);
  const list = (items: string[]) => (items.length ? items.map((i) => `\`${i}\``).join(' · ') : '—');

  const out: string[] = [];
  out.push('# The island coverage reference');
  out.push('');
  out.push('> **Generated** by `npm run island:coverage` from the source — never edit by hand. `lib/island/coverage.test.ts` fails when this file is stale. It is step 0 of [the island plan](plans/2026-11-02-island-at-every-size.md): the island is only as deep as what pages tell it, so this is what the design is argued from.');
  out.push('');
  out.push(`**${regs.filter((r) => r.kind === 'stage').length} stages** (a page describing itself to the island) and **${regs.filter((r) => r.kind === 'zone').length} zones** (a hover or focus area with its own controls) are registered. Areas with no stage get only a fallback name and next places from \`lib/island/routes.ts\`.`);
  out.push('');
  out.push('## Areas with no stage');
  out.push('');
  const bare = areas.filter((a) => !stageAreas.has(a));
  out.push(bare.length ? bare.map((a) => `\`/${a}\``).join(' · ') : 'None.');
  out.push('');
  out.push('## Registrations');
  out.push('');
  out.push('| Where | Kind | Title | Fields | Toggles | Actions |');
  out.push('| --- | --- | --- | --- | --- | --- |');
  for (const r of regs) {
    const k = deckKeys(r);
    out.push(`| \`${r.file}\` | ${r.kind} | ${r.title} | ${list(r.fields)} | ${r.toggles.length ? r.toggles.map((t, i) => `**${k.toggles[i]}** \`${t}\``).join(' · ') : '—'} | ${r.actions.length ? r.actions.map((a, i) => `**${k.actions[i]}** \`${a.id || '?'}\` ${a.label}`).join(' · ') : '—'} |`);
  }
  out.push('');
  out.push('**Deck keys** (bold) are the Caps Lock keys the island gives each control. An action with a slot (`lib/island/slots.ts`) has the same key on every page; the other controls fill the free keys, toggles first, then actions, then the route\'s links from `lib/island/routes.ts`, which this table does not list. A `~` means a conditional control comes before an unslotted one, so its key can move. Actions still without a slot are the ones whose key moves from page to page.');
  out.push('');
  out.push('Titles and labels shown as `…` or `(computed)` are built at run time (a count, a name); the table lists what the source says.');
  out.push('');
  return out.join('\n');
}
