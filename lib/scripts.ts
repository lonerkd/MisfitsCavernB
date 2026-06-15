import { supabaseAdmin } from '@/lib/supabase/server';
import { parseScript } from './scriptos/parser';

export async function createScript(
  userId: string,
  title: string,
  content: string,
  projectId?: string
) {
  try {
    const parsed = parseScript(content);

    const { data: script, error } = await supabaseAdmin
      .from('scripts')
      .insert({
        creator_id: userId,
        title,
        content,
        project_id: projectId ?? null,
        format: 'fountain',
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, script };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateScript(
  scriptId: string,
  userId: string,
  data: {
    title?: string;
    content?: string;
    status?: string;
    visibility?: string;
  }
) {
  try {
    const { data: script, error: fetchError } = await supabaseAdmin
      .from('scripts')
      .select('creator_id')
      .eq('id', scriptId)
      .single();

    if (fetchError || !script || script.creator_id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const updatePayload: Record<string, any> = { ...data };

    if (data.content) {
      parseScript(data.content); // parse for side effects / validation
    }

    const { data: updated, error } = await supabaseAdmin
      .from('scripts')
      .update(updatePayload)
      .eq('id', scriptId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, script: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getScript(scriptId: string, userId?: string) {
  try {
    const { data: script, error } = await supabaseAdmin
      .from('scripts')
      .select('*')
      .eq('id', scriptId)
      .single();

    if (error || !script) {
      return { success: false, error: 'Script not found' };
    }

    return { success: true, script };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getUserScripts(userId: string) {
  try {
    const { data: scripts, error } = await supabaseAdmin
      .from('scripts')
      .select('*')
      .eq('creator_id', userId)
      .order('updated_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, scripts };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteScript(scriptId: string, userId: string) {
  try {
    const { data: script, error: fetchError } = await supabaseAdmin
      .from('scripts')
      .select('creator_id')
      .eq('id', scriptId)
      .single();

    if (fetchError || !script || script.creator_id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabaseAdmin
      .from('scripts')
      .delete()
      .eq('id', scriptId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
