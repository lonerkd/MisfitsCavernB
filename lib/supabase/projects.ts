import { supabase } from './client';
import { createChannel } from './channels';
import { logAuditAction } from './audit';
import { awaitOSUser } from '@/lib/os';

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
  created_at: string;
  updated_at: string;
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
  const { data, error } = await supabase
    .from('projects')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
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

