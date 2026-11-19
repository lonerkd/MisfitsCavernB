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

// ── Locations ────────────────────────────────────────────────────────────────────────────────────────

/** A scene heading's pieces: the INT./EXT. prefix, the place, and what follows it (" - NIGHT"). */
const SLUG = /^(\s*\.?\s*(?:INT\.?\s*\/\s*EXT\.?|EXT\.?\s*\/\s*INT\.?|I\s*\/\s*E\.?|INT\.?|EXT\.?)\s+)(.+?)(\s+-\s+.*|\s*)$/i;

/** The place a scene heading names ("KITCHEN" for "INT. KITCHEN - NIGHT"), or null when the line is not a heading of this shape. */
export function slugPlace(raw: string): string | null {
  const m = SLUG.exec(raw);
  return m ? m[2].trim() : null;
}

/** The heading with its place replaced, or null when it does not name `from`. */
export function renameSlug(raw: string, from: string, to: string): string | null {
  const m = SLUG.exec(raw);
  if (!m) return null;
  if (m[2].trim().toUpperCase() !== from.trim().toUpperCase()) return null;
  return `${m[1]}${to}${m[3]}`;
}

/** What a place may be renamed to: short, single line, no dash separators that would read as the time of day. */
export function validPlaceName(name: string): string | null {
  const n = name.trim().replace(/\s+/g, ' ');
  if (!n) return 'Give the place a name.';
  if (n.length > 80) return 'A place name can be at most 80 characters.';
  if (/\s-\s/.test(n)) return 'A place name cannot contain " - " (it separates the time of day).';
  return null;
}

/** Every scene heading naming `from` rewritten to `to`, upper-cased. Only headings (the parse's `slug` and `scene` lines) change. */
export function renamePlaceInText(text: string, lines: ScriptLine[], from: string, to: string): RenameResult {
  const rows = text.split('\n');
  const name = to.trim().replace(/\s+/g, ' ').toUpperCase();
  let changed = 0;
  for (const line of lines) {
    if (line.type !== 'slug' && line.type !== 'scene') continue;
    const raw = rows[line.index];
    if (raw === undefined) continue;
    const next = renameSlug(raw, from, name);
    if (next !== null && next !== raw) { rows[line.index] = next; changed += 1; }
  }
  return { text: rows.join('\n'), changed };
}
