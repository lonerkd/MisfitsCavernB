// Renaming a character through the script (BACKLOG 3.18, editor rung E4): the cue lines that name the character are rewritten, so the
// text and the graph agree and the next scene sync does not bring the old name back. Only cues change: a name inside an action line
// or in dialogue is prose, and is left alone. Pure.

import type { ScriptLine } from './types';

/** The pieces of a cue line: the forced-character marker, the name, and what follows it ("(V.O.)", "(CONT'D)", a dual-dialogue caret). */
const CUE = /^(\s*[@^]?\s*)([^(^]*?)(\s*(?:\([^)]*\)\s*)*\^?\s*)$/;

/** The cue with its name replaced, or null when the line does not name `from`. */
export function renameCue(raw: string, from: string, to: string): string | null {
  const m = CUE.exec(raw);
  if (!m) return null;
  if (m[2].trim().toUpperCase() !== from.trim().toUpperCase()) return null;
  return `${m[1]}${to}${m[3]}`;
}

/** What a character may be renamed to: a short, single-line, non-empty name with no characters that break a cue. */
export function validCharacterName(name: string): string | null {
  const n = name.trim().replace(/\s+/g, ' ');
  if (!n) return 'Give the character a name.';
  if (n.length > 60) return 'A character name can be at most 60 characters.';
  if (/[()^@\n]/.test(n)) return 'A name cannot contain ( ) ^ or @.';
  return null;
}

export interface RenameResult { text: string; changed: number }

/**
 * Every cue line naming `from` (the parse's `character` and `dual` lines) rewritten to `to`, upper-cased as cues are written. Line
 * indexes are the parse's (`ScriptLine.index`), which are positions in the text split on newlines.
 */
export function renameCharacterInText(text: string, lines: ScriptLine[], from: string, to: string): RenameResult {
  const rows = text.split('\n');
  const name = to.trim().replace(/\s+/g, ' ').toUpperCase();
  let changed = 0;
  for (const line of lines) {
    if (line.type !== 'character' && line.type !== 'dual') continue;
    const raw = rows[line.index];
    if (raw === undefined) continue;
    const next = renameCue(raw, from, name);
    if (next !== null && next !== raw) { rows[line.index] = next; changed += 1; }
  }
  return { text: rows.join('\n'), changed };
}
