import { supabase } from './client';

export interface Profile {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
}

export async function searchProfiles(query: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', `%${query}%`)
    .limit(10);

  if (error) {
    console.error('Error searching profiles:', error);
    return [];
  }

  return data || [];
}

export async function getProfile(id: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

export async function inviteToCrew(projectId: string, userId: string, role: string) {
  const { data, error } = await supabase
    .from('project_crew')
    .insert([{
      project_id: projectId,
      user_id: userId,
      role: role,
      status: 'pending'
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getProjectCrew(projectId: string) {
  const { data, error } = await supabase
    .from('project_crew')
    .select(`
      *,
      profiles:user_id (
        username,
        full_name,
        avatar_url
      )
    `)
    .eq('project_id', projectId);

  if (error) {
    console.error('Error fetching crew:', error);
    return [];
  }

  return data || [];
}
