// What the island says about the editor's offline queue: the scripts and deletes saved on this device
// that have not reached the server yet. Plain "you are offline" is the island's condition chip's job
// (lib/island/condition.ts); this is the part that has numbers, a countdown and a button.
import type { SyncStatus } from '@/lib/scriptos/storage';
import { formatWait } from '@/lib/scriptos/syncWording';
import type { Activity } from './activities';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function syncActivity(s: SyncStatus, now: number, syncNow: () => void): Activity | null {
  const queued = s.pending + s.deletes;
  if (queued === 0) return null;
  const what = [
    s.pending > 0 ? plural(s.pending, 'script', 'scripts') : '',
    s.deletes > 0 ? plural(s.deletes, 'delete', 'deletes') : '',
  ].filter(Boolean).join(' + ');
  const retry = s.nextRetryAt === null ? undefined : `Retry in ${formatWait(s.nextRetryAt - now)}`;
  const syncButton = [{ id: 'sync-now', label: 'Sync now', run: syncNow }];

  if (s.syncing) return { id: 'sync', kind: 'sync', tone: 'busy', title: `Syncing ${what}…` };
  if (!s.online) return { id: 'sync', kind: 'sync', tone: 'warn', title: `${what} saved on this device`, detail: 'Will sync when you reconnect' };
  if (s.attempts > 0) return { id: 'sync', kind: 'sync', tone: 'error', title: `Can’t reach the server — ${what} waiting`, detail: retry, controls: syncButton };
  return { id: 'sync', kind: 'sync', tone: 'warn', title: `${what} waiting to sync`, detail: retry, controls: syncButton };
}
