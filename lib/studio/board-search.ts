// Searching within a mood board: the pure parts. A card matches when every word of the query is found somewhere on it
// (a note card's text; a library item's title, its notes (where a credit is kept), its tag (`board`), where it
// is from (the link's host) and what it is). Case and accents do not matter.

export type CardField = 'note' | 'title' | 'notes' | 'tag' | 'source' | 'kind';

export interface SearchableCard {
  id: string;
  x: number;
  y: number;
  note: string | null;
  media: { title: string; kind: string; notes: string | null; board: string | null; external_url: string | null } | null;
}

export interface CardMatch { id: string; fields: Array<{ field: CardField; text: string }> }

const fold = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** The words of a query: folded, at most eight, none empty. */
export function queryWords(query: string): string[] {
  return fold(query).split(/\s+/).filter(Boolean).slice(0, 8);
}

function hostOf(url: string | null): string {
  try { return url ? new URL(url).hostname.replace(/^www\./, '') : ''; } catch { return ''; }
}

/** Every searchable piece of text a card has, with what it is. */
export function cardFields(card: SearchableCard): Array<{ field: CardField; text: string }> {
  const out: Array<{ field: CardField; text: string }> = [];
  if (card.note) out.push({ field: 'note', text: card.note });
  const m = card.media;
  if (m) {
    if (m.title) out.push({ field: 'title', text: m.title });
    if (m.notes) out.push({ field: 'notes', text: m.notes });
    if (m.board) out.push({ field: 'tag', text: m.board });
    const host = hostOf(m.external_url);
    if (host) out.push({ field: 'source', text: host });
    if (m.kind) out.push({ field: 'kind', text: m.kind });
  }
  return out;
}

/** Top to bottom, then left to right: the order a person reads a board (and the order a slideshow goes in). */
export function readingOrder<T extends { x: number; y: number; id: string }>(cards: readonly T[]): T[] {
  return [...cards].sort((a, b) => Math.round(a.y / 8) - Math.round(b.y / 8) || a.x - b.x || a.id.localeCompare(b.id));
}

/** The cards that match, in reading order. An empty query matches nothing and `active` is false. */
export function matchCards(cards: readonly SearchableCard[], query: string): { active: boolean; matches: CardMatch[] } {
  const words = queryWords(query);
  if (!words.length) return { active: false, matches: [] };
  const matches: CardMatch[] = [];
  for (const card of readingOrder(cards)) {
    const fields = cardFields(card);
    const folded = fields.map((f) => fold(f.text));
    if (!words.every((w) => folded.some((t) => t.includes(w)))) continue;
    matches.push({ id: card.id, fields: fields.filter((_, i) => words.some((w) => folded[i].includes(w))) });
  }
  return { active: true, matches };
}

/** `text` cut into pieces, the ones that match a word of the query marked. The pieces join back into `text`. */
export function highlightSegments(text: string, query: string): Array<{ text: string; hit: boolean }> {
  const words = queryWords(query);
  const folded = fold(text);
  // Folding can change a string's length (a decomposed accent); then positions would not line up, so mark nothing.
  if (!words.length || !text || folded.length !== text.length) return text ? [{ text, hit: false }] : [];
  const hit = new Array<boolean>(text.length).fill(false);
  for (const w of words) {
    for (let at = folded.indexOf(w); at !== -1; at = folded.indexOf(w, at + 1)) for (let i = at; i < at + w.length; i++) hit[i] = true;
  }
  const out: Array<{ text: string; hit: boolean }> = [];
  let start = 0;
  for (let i = 1; i <= text.length; i++) {
    if (i === text.length || hit[i] !== hit[start]) { out.push({ text: text.slice(start, i), hit: hit[start] }); start = i; }
  }
  return out;
}

/** The match to go to when a person steps with next / previous: wraps around. */
export function stepMatch(current: number, count: number, dir: 1 | -1): number {
  if (count <= 0) return -1;
  if (current < 0) return dir === 1 ? 0 : count - 1;
  return (current + dir + count) % count;
}

export const matchLabel = (query: string, count: number, current: number): string => {
  if (!queryWords(query).length) return '';
  if (count === 0) return 'No matches';
  return current >= 0 ? `${current + 1} of ${count} ${count === 1 ? 'match' : 'matches'}` : `${count} ${count === 1 ? 'match' : 'matches'}`;
};
