import { supabase } from './client';

export async function getStudioBoards(userId: string) {
  const { data, error } = await supabase.from('studio_boards').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getProjectBoards(projectId: string) {
  const { data, error } = await supabase.from('studio_boards').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createStudioBoard(board: any) {
  const { data, error } = await supabase.from('studio_boards').insert(board).select().single();
  if (error) throw error;
  return data;
}

export async function getStudioAssets(boardId: string) {
  const { data, error } = await supabase.from('studio_assets').select('*').eq('board_id', boardId);
  if (error) throw error;
  return data;
}

export async function addStudioAsset(asset: any) {
  const { data, error } = await supabase.from('studio_assets').insert(asset).select().single();
  if (error) throw error;
  return data;
}

export async function uploadStudioFile(path: string, file: File) {
  const { data, error } = await supabase.storage
    .from('studio-assets')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });
  
  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from('studio-assets')
    .getPublicUrl(data.path);
    
  return publicUrl;
}

export async function updateStudioAsset(assetId: string, updates: any) {
  const { data, error } = await supabase.from('studio_assets').update(updates).eq('id', assetId).select().single();
  if (error) throw error;
  return data;
}

export async function deleteStudioAsset(assetId: string) {
  const { error } = await supabase.from('studio_assets').delete().eq('id', assetId);
  if (error) throw error;
  return true;
}

export async function getAllStudioAssets(userId: string) {
  const { data, error } = await supabase.from('studio_assets').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getProjectBeats(projectId: string) {
  const { data, error } = await supabase.from('project_beats').select('*').eq('project_id', projectId).order('order_index', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createProjectBeat(beat: any) {
  const { data, error } = await supabase.from('project_beats').insert(beat).select().single();
  if (error) throw error;
  return data;
}

export async function updateProjectBeat(beatId: string, updates: any) {
  const { data, error } = await supabase.from('project_beats').update(updates).eq('id', beatId).select().single();
  if (error) throw error;
  return data;
}

export async function deleteProjectBeat(beatId: string) {
  const { error } = await supabase.from('project_beats').delete().eq('id', beatId);
  if (error) throw error;
  return true;
}

export async function getMarketingCampaigns(projectId: string) {
  const { data, error } = await supabase.from('marketing_campaigns').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createMarketingCampaign(campaign: any) {
  const { data, error } = await supabase.from('marketing_campaigns').insert(campaign).select().single();
  if (error) throw error;
  return data;
}

export async function deleteMarketingCampaign(campaignId: string) {
  const { error } = await supabase.from('marketing_campaigns').delete().eq('id', campaignId);
  if (error) throw error;
  return true;
}