'use client';

// One place for the production views that keep a list in the project's settings (Camera reports, Costumes, Permits, ...).
// It reads the list by a typed key, saves through the atomic owner-only `patch_project_settings`, TELLS the person when a
// save fails (a crew member's save is refused by design: only the owner writes settings) and asks before deleting.
import { useCallback, useMemo, useRef, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';
import { patchProjectSettings } from '@/lib/supabase/progress';
import type { ProjectSettings } from '@/lib/types/settings';
import { useStudio } from '../StudioContext';

/** The settings keys that hold a list of records, each with an `id`. */
export type SettingsListKey =
  | 'safety' | 'comms' | 'gear' | 'wraps' | 'rehearsals' | 'scouts' | 'directorNotes' | 'risks'
  | 'cameraReports' | 'soundReports' | 'vfxShots' | 'costumes' | 'permits' | 'scriptNotes' | 'purchaseOrders'
  | 'mediaOffloads' | 'makeup';

export type SettingsListItem<K extends SettingsListKey> = NonNullable<ProjectSettings[K]> extends Array<infer T> ? T : never;

export function useSettingsList<K extends SettingsListKey>(key: K) {
  type Item = SettingsListItem<K> & { id: string };
  const { project } = useStudio();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);

  const items = useMemo<Item[]>(() => ((project.settings as ProjectSettings | null)?.[key] as Item[] | undefined) ?? [], [project.settings, key]);

  /** Saves the whole list. True when it was saved; false (with a message to the person) when it was not. */
  const save = useCallback(async (next: Item[]): Promise<boolean> => {
    if (busy.current) return false; // a second click while the first is still saving
    busy.current = true;
    setSaving(true);
    try {
      await patchProjectSettings(project.id, { [key]: next } as Partial<ProjectSettings>);
      return true;
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : 'Could not save. Check your connection and try again.', 'error');
      return false;
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }, [project.id, key, toast]);

  /** Asks first (this cannot be undone), then removes the record. */
  const remove = useCallback(async (id: string, what = 'this entry'): Promise<boolean> => {
    const ok = await confirm({ title: 'Delete?', message: `Delete ${what}? This cannot be undone.`, confirmLabel: 'DELETE', danger: true });
    if (!ok) return false;
    return save(items.filter((i) => i.id !== id));
  }, [confirm, save, items]);

  return { items, save, remove, saving };
}
