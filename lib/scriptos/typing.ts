// The editor's typing rules as pure text edits: each takes the script text and
// the caret, and returns the new text and where the caret goes. The editor page
// applies the result to its textarea; nothing here touches the DOM.

import type { LineType } from './types';

export interface Edit { next: string; caret: number }

const lineBounds = (content: string, cursor: number) => {
  const start = content.lastIndexOf('\n', cursor - 1) + 1;
  const nl = content.indexOf('\n', cursor);
  return { start, end: nl === -1 ? content.length : nl };
};

const SNIPPETS: Record<string, string> = {
  scene: '\n\nINT. LOCATION - DAY\n\n',
  action: '\n\nAction description here.\n\n',
  character: '\n\nCHARACTER NAME\n',
  dialogue: '(parenthetical)\nDialogue goes here.\n\n',
  transition: '\n\nCUT TO:\n\n',
  note: '\n\n[[Note: ]]',
};

/** Put an element's template at the selection; the caret lands before its last character. */
export function insertSnippet(content: string, start: number, end: number, type: string): Edit {
  const snippet = SNIPPETS[type] || '';
  return { next: content.substring(0, start) + snippet + content.substring(end), caret: start + snippet.length - 1 };
}

/** Replace [start, end) with a suggestion; the caret lands after it. */
export function acceptCompletion(content: string, range: { start: number; end: number }, item: string): Edit {
  return { next: content.substring(0, range.start) + item + content.substring(range.end), caret: range.start + item.length };
}

/** Typing "(" wraps the selection in a pair. */
export function wrapInParens(content: string, start: number, end: number): Edit {
  const sel = content.substring(start, end);
  return { next: content.substring(0, start) + '(' + sel + ')' + content.substring(end), caret: start + 1 + sel.length };
}

/** Enter in a lower-case scene heading ("int. kitchen") capitalises it and breaks the line; null if the line is not one. */
export function enterInHeading(content: string, cursor: number): Edit | null {
  const { start, end } = lineBounds(content, cursor);
  const line = content.substring(start, end);
  if (!(/^\s*(int|ext|int\.\/ext|i\/e)\b/i.test(line) && line !== line.toUpperCase())) return null;
  const upper = line.toUpperCase();
  const col = cursor - start;
  return { next: content.substring(0, start) + upper.substring(0, col) + '\n' + upper.substring(col) + content.substring(end), caret: cursor + 1 };
}

/** Tab on an empty line is "new scene"; on a line it cycles the element type (Shift reverses). */
export function cycleLine(
  content: string,
  cursor: number,
  currentType: LineType | undefined,
  reverse: boolean,
  cycle: LineType[],
  transform: (text: string, type: LineType) => string,
): Edit | 'empty' {
  const { start, end } = lineBounds(content, cursor);
  const line = content.substring(start, end);
  if (!line.trim()) return 'empty';
  const at = currentType ? cycle.indexOf(currentType) : -1;
  const base = at === -1 ? 0 : at;
  const nextType = cycle[(base + (reverse ? -1 : 1) + cycle.length) % cycle.length];
  const transformed = transform(line, nextType);
  return { next: content.substring(0, start) + transformed + content.substring(end), caret: start + transformed.length };
}

export interface Suggestions { items: string[]; start: number; end: number }

/**
 * What to offer as the writer types: known places after "INT." / "EXT.", or
 * known characters and transitions after a few capital letters. null = nothing.
 */
export function suggestionsAt(
  text: string,
  cursor: number,
  known: { slugs: string[]; characters: string[]; transitions: string[] },
): Suggestions | null {
  const lineStart = text.lastIndexOf('\n', cursor - 1) + 1;
  const currentLine = text.substring(lineStart, cursor);
  const trimmed = currentLine.trim();

  if (/^(INT\.|EXT\.)\s/.test(currentLine)) {
    const afterPrefix = currentLine.replace(/^(INT\.|EXT\.)\s*/, '');
    const typed = afterPrefix.trim().toUpperCase();
    const places = [...new Set(known.slugs.map((s) => s.split('-')[0].replace(/^(INT\.|EXT\.)\s/, '').trim()).filter(Boolean))];
    const matches = places.filter((p) => p.toUpperCase().startsWith(typed) && p.toUpperCase() !== typed);
    return matches.length ? { items: matches, start: lineStart + (currentLine.length - afterPrefix.length), end: cursor } : null;
  }
  if (trimmed.length >= 2 && trimmed === trimmed.toUpperCase() && !trimmed.includes('.') && !trimmed.includes(':')) {
    const chars = known.characters.filter((c) => c.toUpperCase().startsWith(trimmed) && c.toUpperCase() !== trimmed);
    const trans = known.transitions.filter((t) => t.startsWith(trimmed) && t !== trimmed);
    const items = [...chars, ...trans];
    return items.length ? { items, start: lineStart + (currentLine.length - currentLine.trimStart().length), end: cursor } : null;
  }
  return null;
}
