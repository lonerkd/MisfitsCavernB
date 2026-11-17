// Searching inside a record tool: a person types a few words and the tool's list narrows to the records that mention all of
// them. What counts as "mentions" is every human-readable value of the record (text and numbers), never its ids or links.

/** Keys that are plumbing, not words a person would search for. */
const SKIP = new Set(['id', 'scene_ids', 'character_id', 'user_id', 'created_by', 'createdAt', 'created_at', 'notified_at', 'notified_count']);

/** One lower-case string of everything a person can read in a record. */
export function recordText(record: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(record)) {
    if (SKIP.has(key) || key.endsWith('_id') || key.endsWith('_ids')) continue;
    if (typeof value === 'string' || typeof value === 'number') parts.push(String(value));
    else if (Array.isArray(value)) for (const v of value) if (typeof v === 'string' || typeof v === 'number') parts.push(String(v));
  }
  return parts.join(' ').toLowerCase();
}

/** The words of a query: lower-case, split on spaces, empty when there is nothing to find. */
export function queryWords(q: string): string[] {
  return q.toLowerCase().split(/\s+/).filter(Boolean);
}

/** The records that mention every word of the query; all of them when the query is empty. Order is kept. */
export function findRecords<T extends Record<string, unknown>>(items: readonly T[], q: string): T[] {
  const words = queryWords(q);
  if (words.length === 0) return [...items];
  return items.filter((item) => { const text = recordText(item); return words.every((w) => text.includes(w)); });
}
