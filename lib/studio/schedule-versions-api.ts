// Schedule versions in the database: list, save and remove. Restoring is not here: it writes through the ordinary scene and day
// updates (studio.updateScene, studio.setShootDayDate), so their guards and the film-graph sync run.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables } from '@/lib/supabase/database.types';
import { StudioError } from './api';
import type { ScheduleSnapshot } from './schedule-versions';

export type ScheduleVersion = Tables<'schedule_versions'>;

export const VERSION_LABEL_MAX = 80;

const clip = (label: string) => label.trim().slice(0, VERSION_LABEL_MAX);

export function createScheduleVersionsApi(db: SupabaseClient<Database>) {
  async function listVersions(projectId: string): Promise<ScheduleVersion[]> {
    const { data, error } = await db.from('schedule_versions').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
    if (error) throw new StudioError(error.message || 'Could not load the schedule versions', error.code);
    return data;
  }

  /** Saves the snapshot as a named version. `auto` marks one the app saved by itself (before a restore). */
  async function saveVersion(projectId: string, label: string, snapshot: ScheduleSnapshot, auto = false): Promise<ScheduleVersion> {
    const name = clip(label);
    if (!name) throw new StudioError('Give the version a name');
    const { data: auth } = await db.auth.getUser();
    if (!auth.user) throw new StudioError('Sign in to save a version');
    const { data, error } = await db.from('schedule_versions')
      .insert({ project_id: projectId, label: name, snapshot: snapshot as unknown as Database['public']['Tables']['schedule_versions']['Insert']['snapshot'], auto, created_by: auth.user.id })
      .select('*').single();
    if (error) throw new StudioError(error.message || 'Could not save the version', error.code);
    return data;
  }

  async function removeVersion(id: string): Promise<void> {
    const { error } = await db.from('schedule_versions').delete().eq('id', id);
    if (error) throw new StudioError(error.message || 'Could not remove the version', error.code);
  }

  return { listVersions, saveVersion, removeVersion };
}

export const autoVersionLabel = (restoring: string) => clip(`Auto-saved before restoring “${restoring}”`);
