// What the rest of the suite knows, in the form the reader can use (L5 of the
// deep-brain plan). Kept to knowledge a person has put there, so a mistake in
// one read can never confirm itself in the next: the cast comes from castings
// someone made, and rejections from names someone said are not characters.
//
// Places are deliberately NOT here yet. A heading recognised only because the
// project knows the place would make the editor and the Studio disagree about
// where scenes begin, and scene identity hangs on that.

import { parseScript, type ParseContext } from './parser';

/** The characters people have cast (`character_castings.character_name`). */
export function contextFromCastings(castings: ReadonlyArray<{ character_name: string }>, rejectedNames: readonly string[] = []): ParseContext {
  const names = Array.from(new Set(castings.map((c) => c.character_name.trim().toUpperCase()).filter(Boolean)));
  return { characters: names, rejectedNames: rejectedNames.map((n) => n.trim().toUpperCase()).filter(Boolean) };
}

/**
 * Everything a person has told the project about its characters: the cast they
 * chose, the names they confirmed, the names they rejected.
 */
export function contextFromProject(
  castings: ReadonlyArray<{ character_name: string }>,
  corrections: ReadonlyArray<{ kind: string; name: string }>,
  locations: ReadonlyArray<{ name: string }> = [],
  previousDraft?: string,
): ParseContext {
  const confirmed = corrections.filter((c) => c.kind === 'character').map((c) => ({ character_name: c.name }));
  const characters = contextFromCastings([...castings, ...confirmed], corrections.filter((c) => c.kind === 'not_character').map((c) => c.name));
  const previous = previousDraft ? parseScript(previousDraft).lines : [];
  const priorCounts = new Map<string, number>();
  for (const line of previous) {
    if (line.type !== 'character' || line.confidence < 75) continue;
    const name = String(line.meta?.characterName ?? line.text).trim().toUpperCase();
    if (name) priorCounts.set(name, (priorCounts.get(name) ?? 0) + 1);
  }
  const previousCharacters = [...priorCounts].filter(([, count]) => count >= 2).map(([name]) => name);
  const places = [...new Set(locations.map((location) => location.name.trim()).filter(Boolean))];
  return { ...characters, previousCharacters, places };
}

/** A stable key for a context, so a consumer can tell whether it changed. */
export function contextKey(context: ParseContext | undefined): string {
  if (!context) return '';
  let key = `${(context.characters ?? []).join('|')}#${(context.rejectedNames ?? []).join('|')}`;
  if (context.previousCharacters?.length) key += `#P:${context.previousCharacters.join('|')}`;
  if (context.places?.length) key += `#L:${context.places.join('|')}`;
  return key;
}
