import { supabase } from './client';
import { createChannel } from './channels';
import { logAuditAction } from './audit';
import { awaitOSUser } from '@/lib/os';

export type ProjectVisibility = 'private' | 'team' | 'link' | 'public';

export const PROJECT_VISIBILITY: { id: ProjectVisibility; label: string; hint: string }[] = [
  { id: 'private', label: 'Private', hint: 'Only you can see this project.' },
  { id: 'team', label: 'Team', hint: 'Confirmed crew can see and work on it.' },
  { id: 'link', label: 'Anyone with the link', hint: 'Anybody holding the share URL can view the lookbook.' },
  { id: 'public', label: 'Public', hint: 'Like a link share, and its published media is featured in the Showcase.' },
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
  const { data, error } = await supabase
    .from('projects')
    .update({ visibility })
    .eq('id', projectId)
    .select('share_token')
    .single();
  if (error) throw error;
  const token = data?.share_token || '';
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

/** Real per-project facts for the project cards: who's on it and how far the tasks are. */
export async function getProjectCardFacts(projects: { id: string; creator_id: string }[]) {
  const ids = projects.map((p) => p.id);
  const facts: Record<string, { team: string[]; tasksDone: number; tasksTotal: number }> = {};
  for (const id of ids) facts[id] = { team: [], tasksDone: 0, tasksTotal: 0 };
  if (!ids.length) return facts;
  const creatorIds = Array.from(new Set(projects.map((p) => p.creator_id)));
  const [crew, owners, tasks] = await Promise.all([
    supabase.from('project_crew').select('project_id, profiles!project_crew_user_id_fkey(username)').in('project_id', ids),
    supabase.from('profiles').select('id, username').in('id', creatorIds),
    supabase.from('project_tasks').select('project_id, completed').in('project_id', ids),
  ]);
  const ownerName = new Map((owners.data ?? []).map((o) => [o.id, o.username]));
  for (const p of projects) {
    const owner = ownerName.get(p.creator_id);
    if (owner) facts[p.id].team.push(owner);
  }
  for (const c of crew.data ?? []) {
    const name = c.profiles?.username;
    if (name && !facts[c.project_id].team.includes(name)) facts[c.project_id].team.push(name);
  }
  for (const t of tasks.data ?? []) {
    facts[t.project_id].tasksTotal++;
    if (t.completed) facts[t.project_id].tasksDone++;
  }
  return facts;
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

