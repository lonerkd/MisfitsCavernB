// The island's condition: the one thing it says about the connection and the
// outbox, the same on desk and phone. Online with nothing waiting says nothing.

export interface IslandCondition {
  kind: 'normal' | 'syncing' | 'offline';
  /** What the island says, or '' when there is nothing to say. */
  label: string;
}

export function islandCondition({ online, waiting }: { online: boolean; waiting: number }): IslandCondition {
  if (!online) {
    return { kind: 'offline', label: waiting > 0 ? `Offline · ${waiting} waiting` : 'Offline' };
  }
  if (waiting > 0) return { kind: 'syncing', label: `Sending ${waiting}` };
  return { kind: 'normal', label: '' };
}
