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