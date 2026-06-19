import { supabase } from './client';
import { logActivity } from './activity';

export interface SceneLink {
  id: string;
  script_id: string;
  scene_number: string;
  asset_id: string;
  created_by: string | null;
  created_at: string;
}

export async function linkAssetToScene(
  scriptId: string,
  sceneNumber: string,
  assetId: string,
  userId: string,
  projectId: string
) {
  const { data, error } = await supabase
    .from('scene_links')
    .insert({ script_id: scriptId, scene_number: sceneNumber, asset_id: assetId, created_by: userId })
    .select()
    .single();

  if (error) throw error;
  await logActivity(userId, 'linked_reference_to_scene', 'scene_link', data.id, {
    project_id: projectId,
    script_id: scriptId,
    scene_number: sceneNumber,
  });
  return data as SceneLink;
}

export async function unlinkAssetFromScene(linkId: string) {
  const { error } = await supabase.from('scene_links').delete().eq('id', linkId);
  if (error) throw error;
  return true;
}

export async function getSceneLinksForScript(scriptId: string) {
  if (!scriptId || scriptId === 'demo') return [];
  const { data, error } = await supabase.from('scene_links').select('*').eq('script_id', scriptId);
  if (error) throw error;
  return (data || []) as SceneLink[];
}

export async function getSceneLinksForAssets(assetIds: string[]) {
  if (assetIds.length === 0) return [];
  const { data, error } = await supabase.from('scene_links').select('*').in('asset_id', assetIds);
  if (error) throw error;
  return (data || []) as SceneLink[];
}
