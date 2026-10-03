// The island is one surface with six shapes. Which one it takes is decided
// here, from what the person is doing right now — not by a setting.

export type IslandMode =
  /** Typing: a dot, out of the way of the words. */
  | 'dot'
  /** Nothing going on: where you are, and the one number that matters there. */
  | 'rest'
  /** Something just happened (a save, a switch): says so, then goes back. */
  | 'live'
  /** The pointer is on something in the page that has its own controls. */
  | 'context'
  /** The pointer or keyboard focus is on the island: everything, in reach. */
  | 'open'
  /** Caps Lock: the same deck held open, every control on a key. */
  | 'caps';

export interface IslandSignals {
  /** Caps Lock is on. */
  caps: boolean;
  /** Caps layer put away with Escape (until Caps Lock is next turned on). */
  capsDismissed: boolean;
  /** Keys are going into a text field. */
  typing: boolean;
  /** Pointer over the island, focus inside it, a menu of its open, or pinned open. */
  engaged: boolean;
  /** A page zone under the pointer (or clicked) has controls to show. */
  zone: boolean;
  /** A live event is on show. */
  live: boolean;
}

export function islandMode(s: IslandSignals): IslandMode {
  if (s.engaged) return 'open';
  // Caps Lock while writing is for capitals, not for the island.
  if (s.typing) return 'dot';
  if (s.caps && !s.capsDismissed) return 'caps';
  if (s.live) return 'live';
  if (s.zone) return 'context';
  return 'rest';
}

/** True for the shapes that show the full deck (apps, tools and the page's controls). */
export const isDeck = (m: IslandMode) => m === 'open' || m === 'caps';

/** True when a key press is text going into a field, so the island should get out of the way. */
export function isTypingKey(e: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; target: unknown }): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  if (e.key.length !== 1 && e.key !== 'Backspace' && e.key !== 'Enter') return false;
  return isEditable(e.target);
}

export function isEditable(target: unknown): boolean {
  const t = target as { tagName?: string; isContentEditable?: boolean; type?: string } | null;
  if (!t || !t.tagName) return false;
  if (t.isContentEditable) return true;
  if (t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') return true;
  if (t.tagName !== 'INPUT') return false;
  return !['checkbox', 'radio', 'range', 'button', 'submit', 'color', 'file'].includes(t.type ?? 'text');
}
