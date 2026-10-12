// What the rest of the suite knows, in the form the reader can use (L5 of the
// deep-brain plan). Kept to knowledge a person has put there, so a mistake in
// one read can never confirm itself in the next: the cast comes from castings
// someone made, and rejections from names someone said are not characters.
//
// Places are deliberately NOT here yet. A heading recognised only because the
// project knows the place would make the editor and the Studio disagree about
// where scenes begin, and scene identity hangs on that.

import type { ParseContext } from './parser';

/** The characters people have cast (`character_castings.character_name`). */
export function contextFromCastings(castings: ReadonlyArray<{ character_name: string }>, rejectedNames: readonly string[] = []): ParseContext {
  const names = Array.from(new Set(castings.map((c) => c.character_name.trim().toUpperCase()).filter(Boolean)));
  return { characters: names, rejectedNames: rejectedNames.map((n) => n.trim().toUpperCase()).filter(Boolean) };
}

/** A stable key for a context, so a consumer can tell whether it changed. */
export function contextKey(context: ParseContext | undefined): string {
  if (!context) return '';
  return `${(context.characters ?? []).join('|')}#${(context.rejectedNames ?? []).join('|')}`;
}
