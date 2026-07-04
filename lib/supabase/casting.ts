import { supabase } from './client';

export interface Casting {
  id: string;
  project_id: string;
  character_name: string;
  crew_user_id: string;
  created_at: string;
  username?: string;
  avatar_url?: string;
}

export interface CastingWithProject extends Casting {
  project_title?: string;
}

// All castings for a project's Character Bible — keyed by uppercased
// character name so lookups match the parser's character-name casing.
export async function getCastingsForProject(projectId: string): Promise<Record<string, Casting>> {
  const { data, error } = await supabase
    .from('character_castings')
    .select('id, project_id, character_name, crew_user_id, created_at, profiles:crew_user_id(username, avatar_url)')
    .eq('project_id', projectId);
  if (error) throw error;
  const byName: Record<string, Casting> = {};
  for (const row of (data || []) as any[]) {
    byName[row.character_name.toUpperCase()] = {
      ...row,
      username: row.profiles?.username,
      avatar_url: row.profiles?.avatar_url,
    };
  }
  return byName;
}

// Reverse lookup for a Crew profile: every character this person is cast as,
// across every project — "Playing: MARA in Neon Ghosts".
export async function getCastingsForUser(userId: string): Promise<CastingWithProject[]> {
  const { data, error } = await supabase
    .from('character_castings')
    .select('id, project_id, character_name, crew_user_id, created_at, projects:project_id(title)')
    .eq('crew_user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any) => ({
    ...row,
    project_title: row.projects?.title,
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
  return data;
}

export async function removeCasting(projectId: string, characterName: string) {
  const { error } = await supabase
    .from('character_castings')
    .delete()
    .eq('project_id', projectId)
    .eq('character_name', characterName.toUpperCase());
  if (error) throw error;
}
