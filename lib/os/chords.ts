// The suite's Ctrl/⌘ chords, in one table. A chord marked `global` means the same thing in every tool; a tool's own
// chords are added on top and may never reuse a global one (`chords.test.ts` fails if they do). The island, the shortcuts
// panel and the handlers read this table, so the keys cannot drift from what is shown. See
// `plans/2026-11-02-island-at-every-size.md` (the key model).

export type ChordScope = 'global' | 'editor' | 'split';

export interface Chord {
  id: string;
  /** The key as `KeyboardEvent.key` gives it, lower-cased. */
  key: string;
  shift?: boolean;
  scope: ChordScope;
  /** What it does, in the words the shortcuts panel shows. */
  label: string;
}

export const CHORDS: readonly Chord[] = [
  // Global: the same in every tool.
  { id: 'palette', key: 'k', scope: 'global', label: 'Search everything: the command palette' },
  { id: 'split', key: '\\', scope: 'global', label: 'Split screen: this page and another side by side' },
  { id: 'help', key: '/', scope: 'global', label: 'Show the keyboard shortcuts' },
  // The editor's own.
  { id: 'editor.save', key: 's', scope: 'editor', label: 'Save the script' },
  { id: 'editor.find', key: 'f', scope: 'editor', label: 'Find and replace' },
  { id: 'editor.focus', key: 'e', scope: 'editor', label: 'Focus mode' },
  { id: 'editor.goto', key: 'g', scope: 'editor', label: 'Go to a scene' },
  { id: 'editor.undo', key: 'z', scope: 'editor', label: 'Undo' },
  { id: 'editor.redo', key: 'z', shift: true, scope: 'editor', label: 'Redo' },
  { id: 'editor.tagmode', key: 'b', shift: true, scope: 'editor', label: 'Breakdown tag mode' },
  { id: 'editor.redo-y', key: 'y', scope: 'editor', label: 'Redo' },
];

export interface KeyLike { key?: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean }

/** The chord this key press is, among the global ones and those of `scope`; undefined when it is none (or has no Ctrl/⌘). */
export function matchChord(e: KeyLike, scope?: ChordScope): Chord | undefined {
  if (!(e.ctrlKey || e.metaKey) || e.altKey || !e.key) return undefined;
  const key = e.key.toLowerCase();
  return CHORDS.find((c) => (c.scope === 'global' || c.scope === scope) && c.key === key && !!c.shift === e.shiftKey);
}

/** How a chord is written for a person: ⌘K on a Mac, Ctrl K elsewhere. */
export function chordText(c: Chord, mac: boolean): string {
  const k = c.key.length === 1 ? c.key.toUpperCase() : c.key;
  return mac ? `⌘${c.shift ? '⇧' : ''}${k}` : `Ctrl ${c.shift ? 'Shift ' : ''}${k}`;
}

export const isMac = (): boolean => typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent || '');
