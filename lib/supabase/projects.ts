import { supabase } from './client';
import { createChannel } from './channels';
import { logAuditAction } from './audit';
import { awaitOSUser } from '@/lib/os';

export type ProjectVisibility = 'private' | 'team' | 'link' | 'public';

export const PROJECT_VISIBILITY: { id: ProjectVisibility; label: string; hint: string }[] = [
  { id: 'private', label: 'Private', hint: 'Only you can see this project.' },
  { id: 'team', label: 'Team', hint: 'Confirmed crew can see and work on it.' },
  { id: 'link', label: 'Anyone with the link', hint: 'Anybody holding the share URL can view it.' },
  { id: 'public', label: 'Public', hint: 'Anyone can find and view it.' },
];

export interface DBProject {
  id: string;
  title: string;
  description?: string;
  creator_id: string;
  status: 'concept' | 'pre-production' | 'in-production' | 'post-production' | 'completed';
  accent_color?: string;
  budget?: number;
  start_date?: string;
  end_date?: string;
  settings?: any;
  festival_submissions?: any[];
  visibility?: ProjectVisibility;
  share_token?: string | null;
  created_at: string;
  updated_at: string;
}

export async function shareUrlFor(token: string | null | undefined): Promise<string> {
  if (!token) return '';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/shared/${token}`;
}

export async function updateProjectVisibility(projectId: string, visibility: ProjectVisibility): Promise<string> {
  // `visibility` is cast pending the generated-type regen.
  const { data, error } = await supabase
    .from('projects')
    .update({ visibility } as any)
    .eq('id', projectId)
    .select('share_token')
    .single();
  if (error) throw error;
  const token = ((data as any)?.share_token as string) || '';
  if (visibility === 'link' || visibility === 'public') {
    const user = await awaitOSUser();
    if (user?.id) await logAuditAction(user.id, 'project_updated', 'project', projectId, { visibility });
  }
  return shareUrlFor(token);
}

export async function createProject(userId: string, title: string, description = '', projectType?: string) {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      title,
      description,
      creator_id: userId,
      status: 'concept',
      ...(projectType ? { project_type: projectType } : {}),
    })
    .select()
    .single();

  if (error) throw error;

  try {
    await createChannel({ project_id: data.id, name: 'general', topic: `${title} — general discussion` });
  } catch (channelError) {
    console.error('Failed to auto-create default channel for new project:', channelError);
  }

  logAuditAction(userId, 'project_created', 'project', data.id, { title });

  return data;
}

export async function getUserProjects(_userId?: string) {

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateProject(projectId: string, updates: Partial<DBProject>) {
  // Cast while visibility/share_token await the migration + generated-type regen.
  const { data, error } = await supabase
    .from('projects')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    } as any)
    .eq('id', projectId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProject(projectId: string) {
  const { data: existing } = await supabase.from('projects').select('title').eq('id', projectId).single();

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) throw error;

  const user = await awaitOSUser();
  if (user) logAuditAction(user.id, 'project_deleted', 'project', projectId, { title: existing?.title });

  return true;
}

