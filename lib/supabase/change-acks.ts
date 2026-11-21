import { supabase } from './client';

export interface ChangeAck { user_id: string; created_at: string; username?: string }

/** Say "seen" about a director's change, as yourself (once; saying it again is not an error). */
export async function acknowledgeChange(projectId: string, noteId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('change_acknowledgements').upsert({ project_id: projectId, note_id: noteId, user_id: userId }, { onConflict: 'project_id,note_id,user_id', ignoreDuplicates: true });
  if (error) throw error;
}

/** Take your "seen" back. */
export async function unacknowledgeChange(projectId: string, noteId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('change_acknowledgements').delete().eq('project_id', projectId).eq('note_id', noteId).eq('user_id', userId);
  if (error) throw error;
}

/** Who has said "seen": everyone's for the people who shape the project, only your own for anyone else (the database decides). */
export async function listChangeAcks(projectId: string, noteId: string): Promise<ChangeAck[]> {
  const { data, error } = await supabase.from('change_acknowledgements').select('user_id, created_at').eq('project_id', projectId).eq('note_id', noteId).order('created_at');
  if (error) throw error;
  const rows = (data ?? []) as ChangeAck[];
  if (!rows.length) return rows;
  const { data: people, error: pErr } = await supabase.from('profiles').select('id, username').in('id', rows.map((r) => r.user_id));
  if (pErr) throw pErr;
  const names = new Map((people ?? []).map((p) => [p.id as string, p.username as string | null]));
  return rows.map((r) => ({ ...r, username: names.get(r.user_id) ?? undefined }));
}
