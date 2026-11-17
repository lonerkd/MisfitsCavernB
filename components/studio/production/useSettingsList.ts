'use client';

// One place for the production views that keep a list of records (Camera reports, Costumes, Permits, ...). Each record is its
// own database row (`production_records`), so any crew member can save in their tool and two people never overwrite each other's
// list; the list refreshes when anyone changes it. A failed save TELLS the person; deleting asks first. Views keep their
// shape: `save(nextList)` writes only what changed.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';
import { pushUndo, undoOrigin } from '@/lib/os/undo';
import { undoPlan } from '@/lib/studio/record-undo';
import { enqueue, flushQueue, isNetworkFailure, readQueue } from '@/lib/studio/record-queue';
import { deleteRecords, listRecords, subscribeToRecords, upsertRecords, type RecordItem, type RecordKind } from '@/lib/supabase/productionRecords';
import type { ProjectSettings } from '@/lib/types/settings';
import { useStudio } from '../StudioContext';
import { useRecordFind } from '../toolFind';

/** The settings keys that hold a list of records, each with an `id`. */
export type SettingsListKey =
  | 'safety' | 'comms' | 'gear' | 'wraps' | 'rehearsals' | 'scouts' | 'directorNotes' | 'risks'
  | 'cameraReports' | 'soundReports' | 'vfxShots' | 'costumes' | 'permits' | 'scriptNotes' | 'purchaseOrders'
  | 'mediaOffloads' | 'makeup' | 'stills' | 'extras' | 'editorial' | 'claims';

export type SettingsListItem<K extends SettingsListKey> = NonNullable<ProjectSettings[K]> extends Array<infer T> ? T : never;

/** What to tell the person. The database's refusal is a plain object (not an Error): a permission refusal says so, never "check your connection". */
export function saveFailureMessage(e: unknown): string {
  const err = (e ?? {}) as { message?: unknown; code?: unknown };
  const message = typeof err.message === 'string' ? err.message : '';
  if (err.code === '42501' || /row-level security|permission denied/i.test(message)) {
    return 'You can read this tool, but only the owner and crew who shape the project can add to it or change it.';
  }
  return message || 'Could not save. Check your connection and try again.';
}

/** What the server has, with this device's not-yet-sent changes laid over it, so an offline save does not vanish on a refresh. */
function withQueued<T extends { id: string }>(rows: T[], projectId: string, kind: string): T[] {
  const mine = readQueue().filter((c) => c.projectId === projectId && c.kind === kind);
  if (mine.length === 0) return rows;
  const byId = new Map(rows.map((r) => [r.id, r]));
  for (const c of mine) { if (c.record) byId.set(c.id, c.record as unknown as T); else byId.delete(c.id); }
  return [...byId.values()];
}

/** `find: false` for a panel that only reads another tool's list (it must not become that tool's search). */
export function useSettingsList<K extends SettingsListKey>(key: K, opts: { find?: boolean } = {}) {
  type Item = SettingsListItem<K> & { id: string };
  const { project } = useStudio();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const [items, setItems] = useState<Item[]>([]);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let live = true;
    listRecords(project.id, key).then(
      (rows) => { if (live) setItems(withQueued(rows as Item[], project.id, key)); },
      (e) => { if (live) toast(saveFailureMessage(e) || 'Could not load this list.', 'error'); },
    );
    return () => { live = false; };
  }, [project.id, key, tick, toast]);

  // Send what was saved offline, now and whenever the connection comes back.
  useEffect(() => {
    let alive = true;
    const flush = () => {
      if (readQueue().length === 0) return;
      void flushQueue({ upsert: (p, k, r) => upsertRecords(p, k as RecordKind, r as unknown as RecordItem[]), remove: (p, k, ids) => deleteRecords(p, k as RecordKind, ids) }).then((r) => {
        if (!alive) return;
        if (r.sent > 0) { toast(r.sent === 1 ? 'Sent the change saved offline.' : `Sent ${r.sent} changes saved offline.`, 'success'); reload(); }
        for (const x of r.refused) toast(`A change saved offline was refused: ${saveFailureMessage({ message: x.message })}`, 'error');
      });
    };
    flush();
    window.addEventListener('online', flush);
    return () => { alive = false; window.removeEventListener('online', flush); };
  }, [toast, reload]);

  useEffect(() => subscribeToRecords(project.id, key, () => { if (!busy.current) reload(); }), [project.id, key, reload]);

  /** Saves the list: new and changed records are written, records missing from it are removed. True when saved. */
  /** `undoable: false` for a write that is itself an undo. */
  const save = useCallback(async (next: Item[], opts: { undoable?: boolean } = {}): Promise<boolean> => {
    if (busy.current) { toast('Still saving the last change. Try again in a moment.', 'info'); return false; }
    busy.current = true;
    setSaving(true);
    const origin = undoOrigin(); // where the save is made, taken before the first await
    try {
      const before = new Map(items.map((i) => [i.id, JSON.stringify(i)]));
      const changed = next.filter((i) => before.get(i.id) !== JSON.stringify(i)) as unknown as RecordItem[];
      const nextIds = new Set(next.map((i) => i.id));
      const gone = items.filter((i) => !nextIds.has(i.id)).map((i) => i.id);
      await upsertRecords(project.id, key, changed);
      await deleteRecords(project.id, key, gone);
      setItems(next);
      const plan = opts.undoable === false ? null : undoPlan(items, next);
      if (plan) {
        pushUndo(plan.label, async () => {
          await upsertRecords(project.id, key, plan.restore as unknown as RecordItem[]);
          await deleteRecords(project.id, key, plan.drop);
          reload();
        }, origin);
      }
      return true;
    } catch (e) {
      if (isNetworkFailure(e)) {
        // No connection: keep the change on this device and send it when it is back, as the script editor does.
        const was = new Map(items.map((i) => [i.id, JSON.stringify(i)]));
        const nextIds = new Set(next.map((i) => i.id));
        const queued = enqueue(project.id, key, next.filter((i) => was.get(i.id) !== JSON.stringify(i)) as unknown as Array<{ id: string } & Record<string, unknown>>, items.filter((i) => !nextIds.has(i.id)).map((i) => i.id));
        if (queued) { setItems(next); toast('No connection. Saved on this device; it will send when you are back online.', 'info'); return true; }
      }
      toast(saveFailureMessage(e), 'error');
      reload();
      return false;
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }, [project.id, key, items, toast, reload]);

  /** Asks first (this cannot be undone), then removes the record. */
  const remove = useCallback(async (id: string, what = 'this entry'): Promise<boolean> => {
    const ok = await confirm({ title: 'Delete?', message: `Delete ${what}? Ctrl/⌘ Z brings it back.`, confirmLabel: 'DELETE', danger: true });
    if (!ok) return false;
    return save(items.filter((i) => i.id !== id));
  }, [confirm, save, items]);

  // The records that match what the person typed in the tool's search box (all of them when it is empty); views draw this.
  const { shown } = useRecordFind(items as unknown as Array<Record<string, unknown>>, opts.find !== false);
  return { items, shown: shown as unknown as Item[], save, remove, saving };
}
