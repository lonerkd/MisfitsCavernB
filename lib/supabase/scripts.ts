import { supabase } from './client';

export interface DBScript {
  id: string;
  project_id: string;
  title: string;
  content: string;
  format: 'screenplay' | 'teleplay' | 'stage-play';
  version: number;
  last_edited_by?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export async function createScript(projectId: string, title: string, format: 'screenplay' | 'teleplay' | 'stage-play' = 'screenplay') {
  const { data, error } = await supabase
    .from('scripts')
    .insert({
      project_id: projectId,
      title,
      format,
      content: '',
      status: 'draft'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getProjectScripts(projectId: string) {
  const { data, error } = await supabase
    .from('scripts')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getScript(scriptId: string) {
  const { data, error } = await supabase
    .from('scripts')
    .select('*')
    .eq('id', scriptId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateScript(scriptId: string, content: string, userId: string) {
  const script = await getScript(scriptId);
  
  // Create version backup
  await supabase
    .from('script_versions')
    .insert({
      script_id: scriptId,
      content: script.content,
      version: script.version,
      edited_by: userId
    });

  // Update script
  const { data, error } = await supabase
    .from('scripts')
    .update({
      content,
      version: script.version + 1,
      last_edited_by: userId,
      updated_at: new Date().toISOString()
    })
    .eq('id', scriptId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getScriptVersions(scriptId: string) {
  const { data, error } = await supabase
    .from('script_versions')
    .select('*')
    .eq('script_id', scriptId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function restoreScriptVersion(scriptId: string, versionId: string, userId: string) {
  const { data: version, error: versionError } = await supabase
    .from('script_versions')
    .select('content')
    .eq('id', versionId)
    .single();

  if (versionError) throw versionError;

  return updateScript(scriptId, version.content, userId);
}

export function subscribeToScript(scriptId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`script:${scriptId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'scripts', filter: `id=eq.${scriptId}` },
      callback
    )
    .subscribe();
}

export async function addScriptCollaborator(scriptId: string, userId: string, permissions: 'view' | 'comment' | 'edit' = 'view') {
  const { data, error } = await supabase
    .from('script_collaborators')
    .insert({
      script_id: scriptId,
      user_id: userId,
      permissions
    })
    .select();

  if (error) throw error;
  return data;
}
