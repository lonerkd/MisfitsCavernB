// What the editor highlights in breakdown mode: each tagged element where it
// appears in its scene's action, in its category's colour, and each
// suggestion underlined. Pure — the editor passes its parsed lines.

import { findMentions, suggestForScene, type BreakdownCategory, type BreakdownElement, type BreakdownMemory, type SceneElementTag, type Suggestion } from './core';

export interface EditorLine {
  text: string;
  type: string;
}

export interface SceneRange {
  /** Line index of the heading. */
  start: number;
  /** Last line index of the scene (inclusive). */
  end: number;
  /** The stored scene, once the scene index has saved it. */
  sceneId: string | null;
  characters: string[];
}

export interface Mark {
  start: number;
  end: number;
  kind: 'tag' | 'suggestion';
  color: string;
  name: string;
  categoryId: string;
  elementId?: string;
}

/** Lines whose text is breakdown material: action (and shots), as in a paper breakdown. */
export const BREAKDOWN_LINE_TYPES = new Set(['action', 'shot']);

/** Scene ranges from the parsed lines: each heading to the line before the next. */
export function sceneRanges(lines: EditorLine[], sceneIds: Array<string | null>, characters: string[][]): SceneRange[] {
  const starts: number[] = [];
  lines.forEach((l, i) => { if (l.type === 'slug') starts.push(i); });
  return starts.map((start, n) => ({
    start,
    end: (starts[n + 1] ?? lines.length) - 1,
    sceneId: sceneIds[n] ?? null,
    characters: characters[n] ?? [],
  }));
}

export function actionTextOf(lines: EditorLine[], range: SceneRange): string {
  return lines.slice(range.start + 1, range.end + 1).filter((l) => BREAKDOWN_LINE_TYPES.has(l.type)).map((l) => l.text).join('\n');
}

export interface BreakdownView {
  marks: Map<number, Mark[]>;
  suggestions: Map<number, Suggestion[]>;
}

/**
 * Marks per line and suggestions per scene (by scene index). Tags win over
 * suggestions where they overlap.
 */
export function buildBreakdownView(input: {
  lines: EditorLine[];
  ranges: SceneRange[];
  tags: SceneElementTag[];
  elements: BreakdownElement[];
  categories: BreakdownCategory[];
  dismissed: Set<string>;
  memory?: BreakdownMemory;
}): BreakdownView {
  const { lines, ranges, tags, elements, categories, dismissed, memory } = input;
  const marks = new Map<number, Mark[]>();
  const suggestions = new Map<number, Suggestion[]>();
  const colorOf = new Map(categories.map((c) => [c.id, c.color]));
  const byId = new Map(elements.map((e) => [e.id, e]));

  ranges.forEach((range, n) => {
    const taggedIds = new Set(range.sceneId ? tags.filter((t) => t.scene_id === range.sceneId).map((t) => t.element_id) : []);
    const tagged = Array.from(taggedIds).map((id) => byId.get(id)).filter(Boolean) as BreakdownElement[];
    const sceneSuggestions = range.sceneId
      ? suggestForScene({ actionText: actionTextOf(lines, range), characters: range.characters, taggedElementIds: taggedIds, elements, categories, dismissed, memory })
      : [];
    suggestions.set(n, sceneSuggestions);

    const tagByKey = new Map(tagged.map((e) => [e.name, e]));
    const sugByName = new Map(sceneSuggestions.map((s) => [s.name, s]));
    for (let i = range.start + 1; i <= range.end; i++) {
      const line = lines[i];
      if (!line || !BREAKDOWN_LINE_TYPES.has(line.type)) continue;
      const found = findMentions(line.text, [...tagByKey.keys(), ...sugByName.keys()]);
      const lineMarks: Mark[] = [];
      for (const m of found) {
        const el = tagByKey.get(m.name);
        if (el) {
          lineMarks.push({ start: m.start, end: m.end, kind: 'tag', color: colorOf.get(el.category_id) ?? '#888888', name: el.name, categoryId: el.category_id, elementId: el.id });
          continue;
        }
        const s = sugByName.get(m.name);
        if (s) lineMarks.push({ start: m.start, end: m.end, kind: 'suggestion', color: colorOf.get(s.categoryId) ?? '#888888', name: s.name, categoryId: s.categoryId, elementId: s.elementId });
      }
      if (lineMarks.length) marks.set(i, lineMarks);
    }
  });
  return { marks, suggestions };
}

/** Splits a line into plain and marked runs, for rendering. */
export function segments(text: string, marks: Mark[] | undefined): Array<{ text: string; mark?: Mark }> {
  if (!marks?.length) return [{ text }];
  const out: Array<{ text: string; mark?: Mark }> = [];
  let at = 0;
  for (const m of marks) {
    if (m.start < at) continue;
    if (m.start > at) out.push({ text: text.slice(at, m.start) });
    out.push({ text: text.slice(m.start, m.end), mark: m });
    at = m.end;
  }
  if (at < text.length) out.push({ text: text.slice(at) });
  return out;
}
