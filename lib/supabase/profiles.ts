import { supabase } from './client';
import { logActivity } from './activity';

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

export { PUBLIC_PROFILE_COLUMNS } from './profile-columns';
import { PUBLIC_PROFILE_COLUMNS } from './profile-columns';

/** The signed-in user's private account fields. */
export async function getMyAccount(): Promise<{ is_admin: boolean; notification_prefs: unknown; discord_id: string | null } | null> {
  const { data, error } = await supabase.rpc('get_my_account');
  if (error || !data?.[0]) return null;
  return data[0];
}

export async function searchProfiles(query: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PUBLIC_PROFILE_COLUMNS)
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
    .select(PUBLIC_PROFILE_COLUMNS)
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
    void logActivity(`invited a crew member as ${role}`, 'project', projectId);
  } catch {  }
  return data;
}

