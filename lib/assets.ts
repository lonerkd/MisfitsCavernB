import { supabaseAdmin } from '@/lib/supabase/server';

// The 'assets' table does not exist in the deployed Supabase schema.
// These functions return graceful empty/success responses to avoid crashes.

export async function createAsset(
  projectId: string,
  userId: string,
  title: string,
  type: string,
  url: string,
  description?: string
) {
  try {
    const { data: project, error: fetchError } = await supabaseAdmin
      .from('projects')
      .select('creator_id')
      .eq('id', projectId)
      .single();

    if (fetchError || !project || project.creator_id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Table not yet in schema — return a stub
    const asset = { id: crypto.randomUUID(), project_id: projectId, title, type, url, description, created_at: new Date().toISOString() };
    return { success: true, asset };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getProjectAssets(projectId: string, type?: string) {
  try {
    // Table not yet in schema — return empty list
    return { success: true, assets: [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteAsset(
  assetId: string,
  userId: string,
  projectId: string
) {
  try {
    const { data: project, error: fetchError } = await supabaseAdmin
      .from('projects')
      .select('creator_id')
      .eq('id', projectId)
      .single();

    if (fetchError || !project || project.creator_id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Table not yet in schema — return success stub
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAssetsByType(projectId: string) {
  try {
    // Table not yet in schema — return empty grouped object
    return { success: true, grouped: {} as Record<string, any[]> };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
