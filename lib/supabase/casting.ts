import { supabase } from './client';

export interface Casting {
  id: string;
  project_id: string;
  character_name: string;
  crew_user_id: string;
  created_at: string | null;
  username?: string;
  avatar_url?: string;
}

export interface CastingWithProject extends Casting {
  project_title?: string;
}

export async function getCastingsForProject(projectId: string): Promise<Record<string, Casting>> {
  const { data, error } = await supabase
    .from('character_castings')
    .select('id, project_id, character_name, crew_user_id, created_at, profiles:crew_user_id(username, avatar_url)')
    .eq('project_id', projectId);
  if (error) throw error;
  const byName: Record<string, Casting> = {};
  for (const row of data ?? []) {
    byName[row.character_name.toUpperCase()] = {
      ...row,
      username: row.profiles?.username ?? undefined,
      avatar_url: row.profiles?.avatar_url ?? undefined,
    };
  }
  return byName;
}

export async function getCastingsForUser(userId: string): Promise<CastingWithProject[]> {
  const { data, error } = await supabase
    .from('character_castings')
    .select('id, project_id, character_name, crew_user_id, created_at, projects:project_id(title)')
    .eq('crew_user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    project_title: row.projects?.title ?? undefined,
  }));
}

export async function setCasting(projectId: string, characterName: string, crewUserId: string, createdBy: string) {
  const { data, error } = await supabase
    .from('character_castings')
    .upsert(
      { project_id: projectId, character_name: characterName.toUpperCase(), crew_user_id: crewUserId, created_by: createdBy },
      { onConflict: 'project_id,character_name' },
    )
    .select()
    .single();
  if (error) throw error;
  await logCastingHistory(projectId, characterName, 'cast', createdBy);
  return data;
}

export async function removeCasting(projectId: string, characterName: string, actorId?: string) {
  const { error } = await supabase
    .from('character_castings')
    .delete()
    .eq('project_id', projectId)
    .eq('character_name', characterName.toUpperCase());
  if (error) throw error;
  await logCastingHistory(projectId, characterName, 'released', actorId);
}

export interface CastingHistoryEntry { id: string; character_name: string; action: string; created_at: string | null }

export async function logCastingHistory(projectId: string, characterName: string, action: string, actorId?: string) {
  const { error } = await supabase
    .from('casting_history').insert({ project_id: projectId, character_name: characterName.toUpperCase(), action, actor_id: actorId ?? null });
  if (error) throw error;
}

export async function listCastingHistory(projectId: string): Promise<CastingHistoryEntry[]> {
  const { data, error } = await supabase
    .from('casting_history').select('id, character_name, action, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export interface CastingNote { id: string; note: string; created_at: string | null }

export async function listCastingNotes(projectId: string, characterName: string): Promise<CastingNote[]> {
  const { data, error } = await supabase
    .from('casting_notes').select('id, note, created_at')
    .eq('project_id', projectId).eq('character_name', characterName.toUpperCase())
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listAllCastingNotes(projectId: string): Promise<(CastingNote & { character_name: string })[]> {
  const { data, error } = await supabase
    .from('casting_notes').select('id, note, created_at, character_name')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addCastingNote(projectId: string, characterName: string, note: string, userId: string) {
  const { error } = await supabase
    .from('casting_notes').insert({ project_id: projectId, character_name: characterName.toUpperCase(), note, created_by: userId });
  if (error) throw error;
}

export async function deleteCastingNote(id: string) {
  const { error } = await supabase.from('casting_notes').delete().eq('id', id);
  if (error) throw error;
}

export interface CastingAudition { id: string; crew_user_id: string; scheduled_at: string; notes: string | null }

export async function listAuditions(projectId: string, characterName: string): Promise<CastingAudition[]> {
  const { data, error } = await supabase
    .from('casting_auditions').select('id, crew_user_id, scheduled_at, notes')
    .eq('project_id', projectId).eq('character_name', characterName.toUpperCase())
    .order('scheduled_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function scheduleAudition(projectId: string, characterName: string, crewUserId: string, scheduledAt: string, userId: string, notes?: string) {
  const { error } = await supabase
    .from('casting_auditions').insert({ project_id: projectId, character_name: characterName.toUpperCase(), crew_user_id: crewUserId, scheduled_at: scheduledAt, notes: notes || null, created_by: userId });
  if (error) throw error;
}

export async function cancelAudition(id: string) {
  const { error } = await supabase.from('casting_auditions').delete().eq('id', id);
  if (error) throw error;
}
