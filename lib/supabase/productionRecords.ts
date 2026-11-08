import { supabase } from './client';

// The Production tab's role tools (camera reports, costumes, permits, ...): one row per record in `production_records`.
// Row-level security decides who may read, add, edit and delete (the project's people; delete: the maker or those who shape it).
export type RecordKind =
  | 'safety' | 'comms' | 'gear' | 'wraps' | 'rehearsals' | 'scouts' | 'directorNotes' | 'risks'
  | 'cameraReports' | 'soundReports' | 'vfxShots' | 'costumes' | 'permits' | 'scriptNotes' | 'purchaseOrders'
  | 'mediaOffloads' | 'makeup' | 'stills';

/** A record as a view sees it: its own fields, plus the links to the film graph that live in real columns. */
export type RecordItem = { id: string; scene_ids?: string[]; character_id?: string | null } & Record<string, unknown>;

export async function listRecords(projectId: string, kind: RecordKind): Promise<RecordItem[]> {
  const { data, error } = await supabase.from('production_records').select('item_id, data, scene_ids, character_id, created_at')
    .eq('project_id', projectId).eq('kind', kind).order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...(r.data as Record<string, unknown>), id: r.item_id, scene_ids: r.scene_ids ?? [], character_id: r.character_id }));
}

/** Adds or changes these records (matched by their id). */
export async function upsertRecords(projectId: string, kind: RecordKind, items: RecordItem[]): Promise<void> {
  if (!items.length) return;
  // The links are real columns (so the database can check them); everything else is the record's own data.
  const rows = items.map(({ id, scene_ids, character_id, ...data }) => ({
    project_id: projectId, kind, item_id: id, data: data as never, scene_ids: scene_ids ?? [], character_id: character_id ?? null,
  }));
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

/** Which scenes each record of the project is linked to (for the scene cards: only records that link a scene). */
export type RecordLinkRow = { id: string; kind: string; scene_ids: string[] };
export async function listRecordLinks(projectId: string): Promise<RecordLinkRow[]> {
  const { data, error } = await supabase.from('production_records').select('id, kind, scene_ids')
    .eq('project_id', projectId).not('scene_ids', 'eq', '{}');
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: r.id, kind: r.kind, scene_ids: r.scene_ids ?? [] }));
}
