// Every keyboard shortcut the suite has, in one list, for the shortcuts panel and for search (the command palette and the
// panel's own filter). The chords and the island's slot keys are read from the tables the handlers use, so what is listed
// is what is bound; the rest (the editor's own keys, the plot board) are written here.

import { CHORDS, chordText, type Chord } from './chords';
import { SLOT_KEYS, type PillSlot } from '@/lib/island/slots';

export interface Shortcut {
  group: string;
  /** How it is written for this person: `Ctrl K` or `⌘K`, `Caps Lock Q`. */
  keys: string;
  desc: string;
  /** Other words someone might type to find it (`cmd`, `command`). */
  aliases?: string;
}

const SLOT_WORDS: Record<PillSlot, string> = {
  create: 'Create something new on this page',
  jump: 'Jump to a scene, day, person or project',
  find: 'Find (search or filter) on this page',
  view: 'Change the view',
  share: 'Share or export',
  people: 'People: cast, crew, characters',
  note: 'Add a note',
  live: 'The live thing: table read, sprint, On set',
};

const chordShortcut = (c: Chord, mac: boolean): Shortcut => ({
  group: c.scope === 'editor' ? 'ScriptOS editor' : 'Global',
  keys: chordText(c, mac),
  desc: c.label,
  // Both spellings are searchable on every machine: Ctrl Z and ⌘Z, "cmd" and "control".
  aliases: `${chordText(c, !mac)} ${c.key.toUpperCase()} cmd command ctrl control${c.shift ? ' shift' : ''}`,
});

export function shortcuts(mac: boolean): Shortcut[] {
  const global = CHORDS.filter((c) => c.scope === 'global').map((c) => chordShortcut(c, mac));
  const editor = CHORDS.filter((c) => c.scope === 'editor').map((c) => chordShortcut(c, mac));
  return [
    ...global,
    { group: 'Global', keys: '?', desc: 'Show this shortcuts panel' },
    { group: 'Global', keys: 'Esc', desc: 'Close any dialog or palette', aliases: 'escape' },
    { group: 'The island (Caps Lock on)', keys: 'Caps Lock', desc: 'Hold the island open, with a key on every control', aliases: 'capslock' },
    { group: 'The island (Caps Lock on)', keys: '1  2  3 …', desc: 'Go to the app with that number in the island', aliases: 'number numbers app apps' },
    { group: 'The island (Caps Lock on)', keys: '/', desc: 'Search', aliases: 'slash' },
    { group: 'The island (Caps Lock on)', keys: '\\', desc: 'Split screen', aliases: 'backslash' },
    { group: 'The island (Caps Lock on)', keys: 'P', desc: 'Switch project' },
    { group: 'The island (Caps Lock on)', keys: '← →  ·  Enter', desc: 'Move between the page’s controls and run one', aliases: 'arrows' },
    { group: 'The island (Caps Lock on)', keys: 'Esc', desc: 'Put the island away until Caps Lock is next turned on', aliases: 'escape' },
    // The same key means the same thing on every page that has the action.
    ...(Object.keys(SLOT_KEYS) as PillSlot[]).map((s) => ({
      group: 'The island (Caps Lock on)', keys: `Caps Lock ${SLOT_KEYS[s].toUpperCase()}`, desc: `${SLOT_WORDS[s]} (on pages that have it)`, aliases: `${s} capslock`,
    })),
    ...editor,
    { group: 'ScriptOS editor', keys: 'Tab', desc: 'Smart element insert (scene / dialogue)' },
    { group: 'ScriptOS editor', keys: 'Escape, then Tab', desc: 'Leave the script (move to the next control)' },
    { group: 'ScriptOS editor', keys: 'Alt 1–9', desc: 'Tag the selection (tag mode)', aliases: 'option' },
    { group: 'ScriptOS editor', keys: 'Alt Enter  ·  Alt ⌫', desc: 'Accept / dismiss a suggestion', aliases: 'option backspace' },
    { group: 'ScriptOS editor', keys: '↑ ↓ · Enter', desc: 'Navigate & accept autocomplete', aliases: 'arrows' },
    { group: 'ScriptOS editor', keys: '(', desc: 'Auto-close parenthetical' },
    { group: 'ScriptOS editor', keys: 'Enter', desc: 'Auto-format a scene heading' },
    { group: 'Plot board', keys: 'Drag card', desc: 'Reorder the scene in the script' },
    { group: 'Plot board', keys: 'Click card  ·  Enter', desc: 'Jump to that scene (Enter on a focused card)' },
    { group: 'Plot board', keys: 'Alt ← → ↑ ↓  ·  Alt Home / End', desc: 'Move the focused scene card earlier or later, to the first or the last', aliases: 'option reorder arrows' },
    { group: 'Projects', keys: 'Alt ← →', desc: 'Move a project card to the previous or next phase', aliases: 'option arrows' },
  ];
}

const words = (s: string): string[] => s.toLowerCase().split(/[^a-z0-9⌘⇧←-↓\\/?(]+/).filter(Boolean);

/**
 * Whether a shortcut answers a typed query, by its keys or its name. Every word typed has to match a word of the shortcut:
 * a longer word as the start of one (`und` finds Undo), a single character only as a whole one (`z` finds Ctrl Z, not Zoom),
 * so `ctrl z`, `cmd z`, `caps q` and `undo` all land where you would expect. An empty query matches everything.
 */
export function matchesShortcut(query: string, s: Shortcut): boolean {
  // Nothing typed matches everything; something typed with no letter, digit or key in it (`+`, `…`) matches nothing.
  if (!query.trim()) return true;
  const q = words(query);
  if (q.length === 0) return false;
  const w = words(`${s.keys} ${s.desc} ${s.group} ${s.aliases ?? ''}`);
  // A chord written without a space (⌘Z) is also its parts: the glyph, then the key.
  const extra = w.flatMap((x) => (/^[⌘⇧]+./.test(x) ? [x.replace(/^[⌘⇧]+/, '')] : []));
  const all = [...w, ...extra];
  return q.every((t) => all.some((x) => (t.length === 1 ? x === t : x.startsWith(t))));
}

/** Whether a query is written like a key press (`ctrl z`, `cmd k`, `caps q`, `alt 1`, `⌘k`): shortcuts then lead the palette's results. */
export function looksLikeKeys(query: string): boolean {
  return words(query).some((t) => ['ctrl', 'control', 'cmd', 'command', 'caps', 'capslock', 'alt', 'option', 'shift', 'esc', 'escape'].includes(t) || /^[\u2318\u21e7]/.test(t));
}
