'use client';

// One place for the production views that keep a list of records (Camera reports, Costumes, Permits, ...). Each record is its
// own database row (`production_records`), so any crew member can save in their tool and two people never overwrite each other's
// list; the list refreshes when anyone changes it. A failed save TELLS the person; deleting asks first. Views keep their
// shape: `save(nextList)` writes only what changed.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';
import { deleteRecords, listRecords, subscribeToRecords, upsertRecords, type RecordItem } from '@/lib/supabase/productionRecords';
import type { ProjectSettings } from '@/lib/types/settings';
import { useStudio } from '../StudioContext';

/** The settings keys that hold a list of records, each with an `id`. */
export type SettingsListKey =
  | 'safety' | 'comms' | 'gear' | 'wraps' | 'rehearsals' | 'scouts' | 'directorNotes' | 'risks'
  | 'cameraReports' | 'soundReports' | 'vfxShots' | 'costumes' | 'permits' | 'scriptNotes' | 'purchaseOrders'
  | 'mediaOffloads' | 'makeup' | 'stills' | 'extras';

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

export function useSettingsList<K extends SettingsListKey>(key: K) {
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
      (rows) => { if (live) setItems(rows as Item[]); },
      (e) => { if (live) toast(saveFailureMessage(e) || 'Could not load this list.', 'error'); },
    );
    return () => { live = false; };
  }, [project.id, key, tick, toast]);

  useEffect(() => subscribeToRecords(project.id, key, () => { if (!busy.current) reload(); }), [project.id, key, reload]);

  /** Saves the list: new and changed records are written, records missing from it are removed. True when saved. */
  const save = useCallback(async (next: Item[]): Promise<boolean> => {
    if (busy.current) { toast('Still saving the last change. Try again in a moment.', 'info'); return false; }
    busy.current = true;
    setSaving(true);
    try {
      const before = new Map(items.map((i) => [i.id, JSON.stringify(i)]));
      const changed = next.filter((i) => before.get(i.id) !== JSON.stringify(i)) as unknown as RecordItem[];
      const nextIds = new Set(next.map((i) => i.id));
      const gone = items.filter((i) => !nextIds.has(i.id)).map((i) => i.id);
      await upsertRecords(project.id, key, changed);
      await deleteRecords(project.id, key, gone);
      setItems(next);
      return true;
    } catch (e) {
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
    const ok = await confirm({ title: 'Delete?', message: `Delete ${what}? This cannot be undone.`, confirmLabel: 'DELETE', danger: true });
    if (!ok) return false;
    return save(items.filter((i) => i.id !== id));
  }, [confirm, save, items]);

  return { items, save, remove, saving };
}
