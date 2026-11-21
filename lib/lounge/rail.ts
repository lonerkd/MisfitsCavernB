// The Lounge's rail, as three areas, and the decisions the page makes about
// them: what each area is for, what its unread badge adds up to, which
// empty state a pane shows, and whether the rail and a conversation fit
// side by side on a phone held sideways. Pure, so each is tested alone.

export type RailArea = 'productions' | 'community' | 'people';

export const RAIL_AREAS: { id: RailArea; label: string; purpose: string }[] = [
  { id: 'productions', label: 'Productions', purpose: 'The channels and the voice room of the production you are working on.' },
  { id: 'community', label: 'Community', purpose: 'Channels for everyone on The Cavern.' },
  { id: 'people', label: 'People', purpose: 'Direct messages, just between two people.' },
];

/** The least usable width (after the safe-area insets and the app rail) at which the rail and a conversation sit side by side. */
export const SPLIT_MIN_WIDTH = 700;

/**
 * Whether the rail and the conversation share the screen. The desk always does. A phone does only when held sideways
 * with room; otherwise the rail is the home screen and a conversation opens over it (a push).
 * `usableWidth` is the width of the Lounge itself, which the page's safe-area padding has already narrowed (0 until measured).
 */
export function loungeSplit(phone: boolean, landscape: boolean, usableWidth: number): boolean {
  return !phone || (landscape && usableWidth >= SPLIT_MIN_WIDTH);
}

/** The count a row or a section shows: 99+ at the top. */
export function unreadLabel(n: number): string {
  return n >= 100 ? '99+' : String(n);
}

export function sumUnread(ids: string[], of: (id: string) => number): number {
  return ids.reduce((n, id) => n + of(id), 0);
}

export type PaneEmpty = 'no-channel' | 'dm' | 'channel-managers' | 'channel-members' | 'channel-readers' | null;

/** Which empty state the message pane shows (null: there are messages). */
export function paneEmpty(o: { messageCount: number; hasDm: boolean; hasChannel: boolean; canPost: boolean; canManage: boolean }): PaneEmpty {
  if (o.messageCount > 0) return null;
  if (o.hasDm) return 'dm';
  if (!o.hasChannel) return 'no-channel';
  if (o.canManage) return 'channel-managers';
  return o.canPost ? 'channel-members' : 'channel-readers';
}
