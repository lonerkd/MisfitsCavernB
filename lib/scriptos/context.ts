// What the rest of the suite knows, in the form the reader can use (L5 of the
// deep-brain plan). Kept to knowledge a person has put there, so a mistake in
// one read can never confirm itself in the next: the cast comes from castings
// someone made, and rejections from names someone said are not characters.
//
// Places are now here (B7 completion): headings recognised because the project
// knows the place are still bounded — they must NOT change where scenes begin
// (the context-b7 test pins this). Places are used as priors for heading
// confidence, not for scene-boundary decisions.
//
// Per-writer memory (L6) is private: confirmed names, rejected names, title-case
// cues, colon cues, extensions, transition patterns the writer has used.
// Line overrides (L6) are per-project, per-script: a person's correction on a
// specific line. Both feed the decoder as priors.

import type { ParseContext, WriterMemory } from './parser';

/** The characters people have cast (`character_castings.character_name`). */
export function contextFromCastings(castings: ReadonlyArray<{ character_name: string }>, rejectedNames: readonly string[] = []): ParseContext {
  const names = Array.from(new Set(castings.map((c) => c.character_name.trim().toUpperCase()).filter(Boolean)));
  return { characters: names, rejectedNames: rejectedNames.map((n) => n.trim().toUpperCase()).filter(Boolean) };
}

/**
 * Everything a person has told the project about its characters: the cast they
 * chose, the names they confirmed, the names they rejected.
 * Optionally merges per-writer memory and line overrides (B8).
 */
export function contextFromProject(
  castings: ReadonlyArray<{ character_name: string }>,
  corrections: ReadonlyArray<{ kind: string; name: string }>,
  writerMemory?: WriterMemory,
  lineOverrides?: ReadonlyArray<{ line_index: number; forced_type: string }>,
  places?: ReadonlyArray<{ name: string }>,
  previousDraftCues?: ReadonlyArray<{ line_index: number; name: string }>,
): ParseContext {
  const confirmed = corrections.filter((c) => c.kind === 'character').map((c) => ({ character_name: c.name }));
  const projectContext = contextFromCastings([...castings, ...confirmed], corrections.filter((c) => c.kind === 'not_character').map((c) => c.name));
  return contextWithMemory(projectContext, writerMemory, lineOverrides, places, previousDraftCues);
}

/** Places known to the project (`project_locations.name`). */
export function contextFromPlaces(places: ReadonlyArray<{ name: string }>): ParseContext {
  const names = Array.from(new Set(places.map((p) => p.name.trim().toUpperCase()).filter(Boolean)));
  return { places: names };
}

/**
 * Build a ParseContext from project context + per-writer memory + line overrides.
 * This is what the editor/Studio call to get the full context for the reader.
 */
export function contextWithMemory(
  projectContext: ParseContext,
  writerMemory: WriterMemory | undefined,
  lineOverrides: ReadonlyArray<{ line_index: number; forced_type: string }> | undefined,
  places: ReadonlyArray<{ name: string }> | undefined,
  previousDraftCues: ReadonlyArray<{ line_index: number; name: string }> | undefined,
): ParseContext {
  const characters = new Set([...(projectContext.characters ?? []), ...(writerMemory?.confirmedNames ?? [])]);
  const rejectedNames = new Set([...(projectContext.rejectedNames ?? []), ...(writerMemory?.rejectedNames ?? [])]);
  const placeNames = places ? Array.from(new Set(places.map((p) => p.name.trim().toUpperCase()).filter(Boolean))) : projectContext.places;
  return {
    characters: Array.from(characters),
    rejectedNames: Array.from(rejectedNames),
    places: placeNames,
    previousDraftCues: previousDraftCues ?? projectContext.previousDraftCues,
    writerMemory,
    lineOverrides,
  };
}

/** A stable key for a context, so a consumer can tell whether it changed. */
export function contextKey(context: ParseContext | undefined): string {
  if (!context) return '';
  return `${(context.characters ?? []).join('|')}#${(context.rejectedNames ?? []).join('|')}#${(context.places ?? []).join('|')}#${context.previousDraftCues?.length ?? 0}#${context.writerMemory ? 'mem' : ''}#${context.lineOverrides?.length ?? 0}`;
}
