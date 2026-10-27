// Mentions: a task or note can point at a scene, character, place, day, task,
// document or media item. The text stores a token, `@[Label](entity-id)`; what
// is shown is the entity's CURRENT label, so a rename follows. Saving the text
// keeps the `mentions` links in step (lib/film/links.ts › syncMentions). Pure.

export const MENTION_KIND = 'mentions';

const TOKEN = /@\[([^\]\n]{1,200})\]\(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)/gi;

export type Segment = { type: 'text'; text: string } | { type: 'mention'; id: string; label: string };

/** The entity ids mentioned in some text, in order of first appearance, once each. */
export function mentionedIds(text: string): string[] {
  const seen = new Set<string>();
  for (const m of text.matchAll(TOKEN)) seen.add(m[2].toLowerCase());
  return [...seen];
}

/** The text split into plain runs and mentions, for drawing. */
export function segments(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ type: 'text', text: text.slice(last, at) });
    out.push({ type: 'mention', id: m[2].toLowerCase(), label: m[1] });
    last = at + m[0].length;
  }
  if (last < text.length) out.push({ type: 'text', text: text.slice(last) });
  return out;
}

/** The text a person would read: mentions as `@Label`, using current labels where known. */
export function plain(text: string, labelOf: (id: string) => string | undefined = () => undefined): string {
  return segments(text).map((s) => (s.type === 'text' ? s.text : `@${labelOf(s.id) ?? s.label}`)).join('');
}

/** A token for an entity. Brackets in a label would break it, so they become parentheses. */
export function token(id: string, label: string): string {
  return `@[${label.replace(/[\[\]\n]/g, (c) => (c === '[' ? '(' : c === ']' ? ')' : ' ')).slice(0, 200)}](${id})`;
}

/**
 * The `@query` being typed at the caret, if any: `@` at the start or after
 * whitespace, followed by up to 40 characters with no line break. Returns where
 * it starts and what to search for.
 */
export function activeQuery(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, caret);
  const at = before.lastIndexOf('@');
  if (at < 0) return null;
  if (at > 0 && !/\s/.test(before[at - 1])) return null;
  const query = before.slice(at + 1);
  if (query.length > 40 || query.includes('\n') || query.includes('[')) return null;
  // A trailing space ends the mention being typed (a finished pick leaves `@Label ` behind).
  if (/\s$/.test(query)) return null;
  return { start: at, query };
}

/** Replace the `@query` being typed with an entity's token (and a space). */
export function insertMention(text: string, caret: number, id: string, label: string): { text: string; caret: number } | null {
  const active = activeQuery(text, caret);
  if (!active) return null;
  const inserted = `${token(id, label)} `;
  return { text: text.slice(0, active.start) + inserted + text.slice(caret), caret: active.start + inserted.length };
}

/** What to add and what to remove so the stored mentions match the text. */
export function diffMentions(existing: string[], next: string[]): { add: string[]; remove: string[] } {
  const had = new Set(existing.map((x) => x.toLowerCase()));
  const want = new Set(next.map((x) => x.toLowerCase()));
  return { add: [...want].filter((x) => !had.has(x)), remove: [...had].filter((x) => !want.has(x)) };
}

/**
 * Turn what the person sees (`@Kitchen`) back into stored tokens, using the
 * entities they picked while typing. A pick whose `@Label` was edited away, or
 * continues into a longer word, is ignored; longer labels are matched first so `@Kitchen sink` beats `@Kitchen`.
 */
export function tokenize(display: string, picked: Array<{ id: string; label: string }>): string {
  const byLength = [...picked].sort((a, b) => b.label.length - a.label.length);
  let out = display;
  for (const p of byLength) {
    const needle = `@${p.label}`;
    let from = 0;
    for (;;) {
      const i = out.indexOf(needle, from);
      if (i < 0) break;
      // `@Roof` inside `@Rooftop` is a different word.
      if (/[\p{L}\p{N}_]/u.test(out[i + needle.length] ?? '')) { from = i + needle.length; continue; }
      const t = token(p.id, p.label);
      out = out.slice(0, i) + t + out.slice(i + needle.length);
      from = i + t.length;
    }
  }
  return out;
}
