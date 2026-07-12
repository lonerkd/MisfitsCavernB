import { supabase } from './client';

export interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  role?: string;
  location?: string;
  status?: 'OPEN' | 'BUSY';
  discord_username?: string;
  created_at?: string;
  is_admin?: boolean;
}

export type PublicProfile = Pick<Profile, 'username' | 'role' | 'avatar_url'>;

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

  return (data as unknown as Profile[]) || [];
}

export async function getProfile(id: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as unknown as Profile;
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
  } catch {  }
  return data;
}

