import { supabase } from './client';

// The Production tab's role tools (camera reports, costumes, permits, ...): one row per record in `production_records`.
// Row-level security decides who may read, add, edit and delete (the project's people; delete: the maker or those who shape it).
export type RecordKind =
  | 'safety' | 'comms' | 'gear' | 'wraps' | 'rehearsals' | 'scouts' | 'directorNotes' | 'risks'
  | 'cameraReports' | 'soundReports' | 'vfxShots' | 'costumes' | 'permits' | 'scriptNotes' | 'purchaseOrders'
  | 'mediaOffloads' | 'makeup';

export type RecordItem = { id: string } & Record<string, unknown>;

export async function listRecords(projectId: string, kind: RecordKind): Promise<RecordItem[]> {
  const { data, error } = await supabase.from('production_records').select('item_id, data, created_at')
    .eq('project_id', projectId).eq('kind', kind).order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...(r.data as Record<string, unknown>), id: r.item_id }));
}

/** Adds or changes these records (matched by their id). */
export async function upsertRecords(projectId: string, kind: RecordKind, items: RecordItem[]): Promise<void> {
  if (!items.length) return;
  const rows = items.map(({ id, ...data }) => ({ project_id: projectId, kind, item_id: id, data: data as never }));
  const { error } = await supabase.from('production_records').upsert(rows, { onConflict: 'project_id,kind,item_id', ignoreDuplicates: false });
  if (error) throw error;
}

/** Removes records; says so when the database refused (nothing was removed). */
export async function deleteRecords(projectId: string, kind: RecordKind, ids: string[]): Promise<void> {
  if (!ids.length) return;
  const { error, count } = await supabase.from('production_records').delete({ count: 'exact' })
    .eq('project_id', projectId).eq('kind', kind).in('item_id', ids);
  if (error) throw error;
  if ((count ?? 0) < ids.length) throw new Error('You do not have permission to delete that');
}

/** Calls back whenever anyone changes this kind of record on the project. Returns the way to stop listening. */
export function subscribeToRecords(projectId: string, kind: RecordKind, onChange: () => void): () => void {
  const channel = supabase.channel(`prod-records:${projectId}:${kind}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'production_records', filter: `project_id=eq.${projectId}` }, onChange)
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}
