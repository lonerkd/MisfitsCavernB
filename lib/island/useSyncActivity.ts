'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { getSyncStatus, refreshSyncStatus, subscribeSyncStatus, syncPendingScripts } from '@/lib/scriptos/storage';
import { useActivity } from './activities';
import { syncActivity } from './syncActivity';

/** Holds the editor's offline queue on the island while something is waiting, on every page. */
export function useSyncActivity(): void {
  const status = useSyncExternalStore(subscribeSyncStatus, getSyncStatus, getSyncStatus);
  const [now, setNow] = useState(() => Date.now());
  const counting = status.nextRetryAt !== null;

  // The queue is counted from the device store only after a save, delete or sync, so a page that has just loaded
  // (a reload, or any page but the editor) would not know about scripts already waiting there. Count them now.
  useEffect(() => { void refreshSyncStatus(); }, []);

  // A retry countdown ticks once a second, and only while one is on show.
  useEffect(() => {
    if (!counting) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [counting]);

  useActivity(syncActivity(status, now, () => { syncPendingScripts().catch(console.error); }));
}
