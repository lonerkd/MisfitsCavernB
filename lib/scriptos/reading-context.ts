// One context for reading a script, built once (B7b of the deep-brain plan). The reader takes what the project knows: the
// cast, the names that are not characters, the places, a person's line overrides and, since this rung, the script's
// previous saved draft. `contextFromProject` (context.ts) assembles the first four; this adds the previous draft, which
// has to be READ before it can be evidence, and caches that reading so a re-read of the later draft (every keystroke in the
// editor, every sync in the Studio) never reads the earlier one again. Pure: where the earlier text comes from (the
// script's locked revisions, which RLS already limits to people who can open the script) is the caller's business.

import { contextKey, digest } from './context';
import { parseScript, type ParseContext } from './parser';
import { previousDraftFromReading, type PreviousDraft } from './previous-draft';
import { readingFormat } from './reading-format';

const CACHE_SIZE = 4;
const cache = new Map<string, PreviousDraft>();

/**
 * The earlier text, read the way this script is read (its format, the project's context and the person's line overrides, which
 * find their lines in the earlier text by what the lines say) and kept to what the decoder can use. Cached by the text, the
 * format and the context, so it is read again only when one of them changes.
 */
export function readPreviousDraft(snapshot: string, format: string | null | undefined, context: ParseContext | undefined): PreviousDraft {
  const base: ParseContext = { ...context, previousDraft: undefined };
  const key = `${format ?? ''}|${contextKey(base)}|${snapshot.length}:${digest(snapshot)}`;
  const hit = cache.get(key);
  if (hit) { cache.delete(key); cache.set(key, hit); return hit; }
  const read = previousDraftFromReading(parseScript(snapshot, readingFormat(format), undefined, { context: base }).lines);
  cache.set(key, read);
  if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value as string);
  return read;
}

/** The context with the previous draft in it, or the context as it was when there is no earlier text. */
export function withPreviousDraft(context: ParseContext, snapshot: string | null | undefined, format: string | null | undefined): ParseContext {
  if (!snapshot?.trim()) return context;
  return { ...context, previousDraft: readPreviousDraft(snapshot, format, context) };
}

/** The most recent of a script's locked revisions (by date), or null. Revisions may arrive in any order. */
export function latestRevision<T extends { date: string }>(revisions: ReadonlyArray<T>): T | null {
  let best: T | null = null;
  for (const r of revisions) if (!best || Date.parse(r.date) >= Date.parse(best.date) || Number.isNaN(Date.parse(best.date))) best = r;
  return best;
}
