import { supabase } from './client';
import { logActivity } from './activity';
import type { TablesInsert } from './database.types';
import type { Session } from '@supabase/supabase-js';

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
    .eq('is_sample', false)
    .limit(10);

  if (error) {
    console.error('Error searching profiles:', error);
    return [];
  }

  return (data as unknown as Profile[]) || [];
}

/** Someone's public profile; null when there is none. Throws when the query fails. */
export async function getProfile(id: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as Profile | null;
}

export interface DirectoryFilter {
  /** Matched against username and bio. */
  search: string;
  /** A craft, or 'All'. */
  role: string;
  availability: 'all' | 'OPEN' | 'BUSY';
}

/** The crew directory: real people (no samples), newest first, filtered. */
export async function listDirectory(f: DirectoryFilter): Promise<Profile[]> {
  let query = supabase.from('profiles').select(PUBLIC_PROFILE_COLUMNS).eq('is_sample', false).order('created_at', { ascending: false });
  // Characters that would break out of the PostgREST or() filter become spaces.
  const clean = f.search.replace(/[(),.:\\]/g, ' ').trim();
  if (clean) query = query.or(`username.ilike.%${clean}%,bio.ilike.%${clean}%`);
  if (f.role && f.role !== 'All') query = query.eq('role', f.role);
  if (f.availability !== 'all') query = query.eq('status', f.availability);
  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown as Profile[]) ?? [];
}

/** Saves the signed-in person's own profile fields. */
export async function saveMyProfile(userId: string, fields: Omit<TablesInsert<'profiles'>, 'id' | 'updated_at'>): Promise<void> {
  const { error } = await supabase.from('profiles').upsert({
    ...fields,
    id: userId,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export interface MyWork {
  scripts: { id: string; title: string; updated_at: string | null }[];
  projects: { id: string; title: string; status: string | null; accent_color: string | null }[];
  jobs: { id: string; title: string; role: string; status: string | null; created_at: string | null }[];
}

/** What someone has made, for their profile: scripts they wrote or edited, projects they own, jobs they posted. */
export async function getMyWork(userId: string): Promise<MyWork> {
  const [scripts, projects, jobs] = await Promise.all([
    supabase.from('scripts').select('id, title, updated_at').or(`created_by.eq.${userId},last_edited_by.eq.${userId}`).order('updated_at', { ascending: false }),
    supabase.from('projects').select('id, title, status, accent_color').eq('creator_id', userId).order('updated_at', { ascending: false }),
    supabase.from('jobs').select('id, title, role, status, created_at').eq('created_by', userId).order('created_at', { ascending: false }),
  ]);
  for (const r of [scripts, projects, jobs]) if (r.error) throw r.error;
  return {
    scripts: (scripts.data ?? []) as MyWork['scripts'],
    projects: (projects.data ?? []) as MyWork['projects'],
    jobs: (jobs.data ?? []) as MyWork['jobs'],
  };
}

/**
 * Everything Settings › Export puts in the file. Throws if any part fails to
 * load, so an export is never quietly missing a section.
 */
export async function collectMyData(userId: string) {
  const [profile, account, projects, scripts, jobs] = await Promise.all([
    supabase.from('profiles').select(PUBLIC_PROFILE_COLUMNS).eq('id', userId).maybeSingle(),
    supabase.rpc('get_my_account'),
    supabase.from('projects').select('*').eq('creator_id', userId),
    supabase.from('scripts').select('*').eq('last_edited_by', userId),
    supabase.from('jobs').select('*').eq('created_by', userId),
  ]);
  for (const r of [profile, account, projects, scripts, jobs]) if (r.error) throw r.error;
  return {
    profile: profile.data ? { ...(profile.data as object), ...(account.data?.[0] ?? {}) } : null,
    projects: projects.data ?? [],
    scripts: scripts.data ?? [],
    jobs: jobs.data ?? [],
  };
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


/** Real people (no samples) whose username contains the text, for pickers. */
export async function findPeopleByName(text: string, limit = 8): Promise<{ id: string; username: string }[]> {
  const { data, error } = await supabase.from('profiles').select('id, username').ilike('username', `%${text}%`).eq('is_sample', false).limit(limit);
  if (error) throw error;
  return data ?? [];
}

/** Sets the signed-in person's craft (profiles.role). */
export async function setMyCraft(userId: string, craft: string | null): Promise<void> {
  const { error } = await supabase.from('profiles').update({ role: craft }).eq('id', userId);
  if (error) throw error;
}

interface DiscordIdentityData {
  id?: string;
  username?: string;
  global_name?: string;
  full_name?: string;
  avatar_url?: string;
  picture?: string;
}

/** The profile a new account starts with, from its sign-in identity (Discord's name and avatar first). */
export function buildProfileFields(session: Session) {
  const user = session.user;
  const discordIdentity = user.identities?.find(i => i.provider === 'discord');
  const discordData = discordIdentity?.identity_data as DiscordIdentityData | undefined;

  return {
    id: user.id,
    username: discordData?.global_name || discordData?.full_name ||
      user.user_metadata?.full_name || user.user_metadata?.name ||
      discordData?.username || user.email?.split('@')[0] || 'user',
    avatar_url: discordData?.avatar_url || discordData?.picture || user.user_metadata?.avatar_url || null,
    discord_id: discordData?.id || null,
    discord_username: discordData?.username || null,
    discord_avatar: discordData?.avatar_url || discordData?.picture || null,
    status: 'OPEN' as const,
  };
}

/** Makes the profile on first sign-in; on a later one, adds Discord details it was missing. */
export async function ensureProfile(session: Session): Promise<void> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, discord_username')
    .eq('id', session.user.id)
    .single();

  const fields = buildProfileFields(session);

  if (!profile) {
    await supabase.from('profiles').insert(fields);
  } else if (fields.discord_id && !profile.discord_username) {
    await supabase.from('profiles').update({
      discord_id: fields.discord_id,
      discord_username: fields.discord_username,
      discord_avatar: fields.discord_avatar,
    }).eq('id', session.user.id);
  }
}
