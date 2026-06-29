import { supabase } from './client';

export interface ProjectTask {
  id: string;
  project_id: string;
  title: string;
  completed: boolean;
  created_at: string;
}

export interface ProjectNote {
  id: string;
  project_id: string;
  content: string;
  type: 'text' | 'list' | 'code';
  created_at: string;
}

export interface StorageProject {
  id: string;
  user_id: string;
  title: string;
  status: 'concept' | 'pre-prod' | 'production' | 'post' | 'released';
  description: string;
  accent_color: string;
  wiki: string;
  created_at: string;
  updated_at: string;
}

export async function getUserProjects(userId: string): Promise<StorageProject[]> {
  const { data, error } = await supabase
    .from('project_storage')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getProject(id: string): Promise<StorageProject | null> {
  const { data, error } = await supabase
    .from('project_storage')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
  return data || null;
}

export async function createProject(userId: string, title: string): Promise<StorageProject> {
  const { data, error } = await supabase
    .from('project_storage')
    .insert({
      user_id: userId,
      title,
      status: 'concept',
      description: '',
      accent_color: '#' + Math.floor(Math.random() * 16777215).toString(16),
      wiki: '',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProject(
  id: string,
  updates: Partial<StorageProject>
): Promise<StorageProject> {
  const { data, error } = await supabase
    .from('project_storage')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProject(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('project_storage')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

export async function getProjectTasks(projectId: string): Promise<ProjectTask[]> {
  const { data, error } = await supabase
    .from('project_tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function addTask(projectId: string, title: string): Promise<ProjectTask> {
  const { data, error } = await supabase
    .from('project_tasks')
    .insert({
      project_id: projectId,
      title,
      completed: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function toggleTask(taskId: string, completed: boolean): Promise<ProjectTask> {
  const { data, error } = await supabase
    .from('project_tasks')
    .update({ completed })
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTask(taskId: string): Promise<boolean> {
  const { error } = await supabase
    .from('project_tasks')
    .delete()
    .eq('id', taskId);

  if (error) throw error;
  return true;
}

export async function getProjectNotes(projectId: string): Promise<ProjectNote[]> {
  const { data, error } = await supabase
    .from('project_notes')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function addNote(
  projectId: string,
  content: string,
  type: 'text' | 'list' | 'code' = 'text'
): Promise<ProjectNote> {
  const { data, error } = await supabase
    .from('project_notes')
    .insert({
      project_id: projectId,
      content,
      type,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteNote(noteId: string): Promise<boolean> {
  const { error } = await supabase
    .from('project_notes')
    .delete()
    .eq('id', noteId);

  if (error) throw error;
  return true;
}
