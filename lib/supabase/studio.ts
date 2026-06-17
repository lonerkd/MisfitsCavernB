import { supabase } from './client';

export async function getStudioBoards(userId: string) {
  const { data, error } = await supabase.from('studio_boards').select('*').eq('user_id', userId).order('created_at', { ascending: false });
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

export async function getAssetComments(assetId: string) {
  const { data, error } = await supabase
    .from('asset_comments')
    .select('*, profiles(username, avatar_url)')
    .eq('asset_id', assetId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function addAssetComment(assetId: string, userId: string, content: string, timecode?: string) {
  const { data, error } = await supabase
    .from('asset_comments')
    .insert({ asset_id: assetId, user_id: userId, content, timecode: timecode || null })
    .select('*, profiles(username, avatar_url)')
    .single();
  if (error) throw error;
  return data;
}

export async function getAssetCommentCounts(assetIds: string[]): Promise<Record<string, number>> {
  if (assetIds.length === 0) return {};
  const { data, error } = await supabase.from('asset_comments').select('asset_id').in('asset_id', assetIds);
  if (error) throw error;
  return (data || []).reduce((acc: Record<string, number>, row: any) => {
    acc[row.asset_id] = (acc[row.asset_id] || 0) + 1;
    return acc;
  }, {});
}

// Each project gets exactly one moodboard, keyed by storing the project id in the board's `name`.
export async function getOrCreateBoardForProject(userId: string, projectId: string) {
  const { data: existing, error: findErr } = await supabase
    .from('studio_boards').select('*').eq('user_id', userId).eq('name', projectId).maybeSingle();
  if (findErr) throw findErr;
  if (existing) return existing;

  const { data: created, error: createErr } = await supabase
    .from('studio_boards').insert({ user_id: userId, name: projectId, description: 'Concept board' }).select().single();
  if (createErr) throw createErr;
  return created;
}