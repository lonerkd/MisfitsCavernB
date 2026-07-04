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
  // Let the invited user know they've been added to a project's crew.
  try {
    const { data: proj } = await supabase.from('projects').select('title').eq('id', projectId).single();
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'crew',
      title: `You were added as ${role}`,
      body: proj?.title ? `On “${proj.title}”.` : 'You were invited to a project crew.',
      link: '/projects',
      read: false,
    });
  } catch { /* non-fatal: invite still succeeds */ }
  return data;
}

