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
import type { PreviousDraft } from './previous-draft';
import { priorKey, type SuitePerson } from './suite-priors';

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
  lineOverrides?: ReadonlyArray<{ line_index: number; forced_type: string; line_text?: string | null }>,
  places?: ReadonlyArray<{ name: string }>,
  previousDraftCues?: ReadonlyArray<{ line_index: number; name: string }>,
  previousDraft?: PreviousDraft,
): ParseContext {
  const confirmed = corrections.filter((c) => c.kind === 'character').map((c) => ({ character_name: c.name }));
  const projectContext = contextFromCastings([...castings, ...confirmed], corrections.filter((c) => c.kind === 'not_character').map((c) => c.name));
  // Where each believed name came from, so an explanation can say it (suite-priors.ts adds the rest of the suite to this).
  const people: SuitePerson[] = [];
  const seen = new Set<string>();
  for (const [list, source] of [[castings, 'cast'], [confirmed, 'confirmed']] as const) {
    for (const c of list) { const name = priorKey(c.character_name); if (name && !seen.has(`${name}|${source}`)) { seen.add(`${name}|${source}`); people.push({ name, source }); } }
  }
  const withSources: ParseContext = people.length ? { ...projectContext, suite: { people, things: [], overruled: [] } } : projectContext;
  return contextWithMemory(withSources, writerMemory, lineOverrides, places, previousDraftCues, previousDraft);
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
  lineOverrides: ReadonlyArray<{ line_index: number; forced_type: string; line_text?: string | null }> | undefined,
  places: ReadonlyArray<{ name: string }> | undefined,
  previousDraftCues: ReadonlyArray<{ line_index: number; name: string }> | undefined,
  previousDraft?: PreviousDraft,
): ParseContext {
  const characters = new Set([...(projectContext.characters ?? []), ...(writerMemory?.confirmedNames ?? [])]);
  const rejectedNames = new Set([...(projectContext.rejectedNames ?? []), ...(writerMemory?.rejectedNames ?? [])]);
  const placeNames = places ? Array.from(new Set(places.map((p) => p.name.trim().toUpperCase()).filter(Boolean))) : projectContext.places;
  return {
    characters: Array.from(characters),
    rejectedNames: Array.from(rejectedNames),
    places: placeNames,
    previousDraftCues: previousDraftCues ?? projectContext.previousDraftCues,
    previousDraft: previousDraft ?? projectContext.previousDraft,
    writerMemory,
    lineOverrides,
    ...(projectContext.suite ? { suite: projectContext.suite } : {}),
  };
}

/** A stable key for a context, so a consumer can tell whether it changed. */
export function contextKey(context: ParseContext | undefined): string {
  if (!context) return '';
  const memKey = context.writerMemory
    ? JSON.stringify(context.writerMemory)
    : '';
  const overrideKey = (context.lineOverrides ?? []).map((o) => `${o.line_index}:${o.forced_type}`).join(',');
  // The previous draft and the places add to the key only when there are any, so a context without them keys as it always did.
  const draftKey = context.previousDraft ? `#d${context.previousDraft.lines.length}:${digest(context.previousDraft.lines.map((l) => `${l.type[0]}${l.text}`).join('\n'))}` : '';
  const placeKey = context.places?.length ? `#p${context.places.join('|')}` : '';
  // The suite's priors (suite-priors.ts): who vouched for each name, and the things. Only when there are any.
  const suite = context.suite;
  const suiteKey = suite && (suite.people.length || suite.things.length || suite.overruled.length)
    ? `#s${digest(`${suite.people.map((p) => `${p.name}:${p.source}:${p.aliasOf ?? ''}`).join('|')}/${suite.things.map((t) => `${t.name}:${t.category}`).join('|')}/${suite.overruled.map((o) => `${o.name}:${o.said}:${o.because}`).join('|')}`)}`
    : '';
  return `${(context.characters ?? []).join('|')}#${(context.rejectedNames ?? []).join('|')}#${context.previousDraftCues?.length ?? 0}#${memKey}#${overrideKey}${draftKey}${placeKey}${suiteKey}`;
}

/** A short fingerprint of some text (FNV-1a), for keys that only need to notice a change. */
export function digest(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36);
}
