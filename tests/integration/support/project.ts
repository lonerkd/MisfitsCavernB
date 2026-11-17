import type { Cast } from './personas';

/** Sam's project with Jordan confirmed as crew; Riley stays an outsider. */
export async function createCrewedProject(cast: Cast, title: string) {
  const project = await cast.sam.client
    .from('projects')
    .insert({ title, creator_id: cast.sam.id })
    .select('id, share_token')
    .single();
  if (project.error) throw project.error;

  const crew = await cast.sam.client
    .from('project_crew')
    .insert({ project_id: project.data.id, user_id: cast.jordan.id, craft: 'Production designer', status: 'confirmed' });
  if (crew.error) throw crew.error;

  return { projectId: project.data.id, shareToken: project.data.share_token };
}

export async function createScript(cast: Cast, projectId: string | null, content = '') {
  const script = await cast.sam.client
    .from('scripts')
    .insert({ title: 'Shooting Script', content, created_by: cast.sam.id, last_edited_by: cast.sam.id, project_id: projectId })
    .select('id')
    .single();
  if (script.error) throw script.error;
  return script.data.id;
}

export async function setVisibility(cast: Cast, projectId: string, visibility: 'private' | 'team' | 'link' | 'public') {
  const { error } = await cast.sam.client.from('projects').update({ visibility }).eq('id', projectId);
  if (error) throw error;
}

/** A 1×1 PNG, small enough to upload anywhere. */
export function tinyPng(): Blob {
  const bytes = Uint8Array.from(
    atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='),
    (c) => c.charCodeAt(0),
  );
  return new Blob([bytes], { type: 'image/png' });
}

/**
 * A scene's cast as the graph holds it: the characters (created when new) and the links from the scene to them, written as
 * the person (RLS applies). Names are upper-cased and de-duplicated, like the app's own cast cue. `names` replaces what was linked.
 */
export async function linkCast(client: Cast['sam']['client'], projectId: string, sceneId: string, names: string[]) {
  const want = Array.from(new Set(names.map((n) => n.trim().toUpperCase()).filter(Boolean)));
  if (want.length) {
    const made = await client.from('characters').upsert(want.map((name) => ({ project_id: projectId, name })), { onConflict: 'project_id,name', ignoreDuplicates: true });
    if (made.error) throw made.error;
  }
  const found = want.length ? await client.from('characters').select('id, name').eq('project_id', projectId).in('name', want) : { data: [], error: null };
  if (found.error) throw found.error;
  const keep = (found.data ?? []).map((c) => c.id);
  const drop = await client.from('scene_characters').delete().eq('scene_id', sceneId).not('character_id', 'in', `(${keep.length ? keep.join(',') : '00000000-0000-0000-0000-000000000000'})`);
  if (drop.error) throw drop.error;
  if (keep.length) {
    const link = await client.from('scene_characters').upsert(keep.map((character_id) => ({ scene_id: sceneId, character_id, project_id: projectId })), { onConflict: 'scene_id,character_id', ignoreDuplicates: true });
    if (link.error) throw link.error;
  }
}

/** Insert a scene and give it a cast (the names), in one go. */
export async function addSceneWithCast(client: Cast['sam']['client'], projectId: string, row: Record<string, unknown>, names: string[] = []) {
  const { data, error } = await client.from('scenes').insert({ project_id: projectId, ...row } as never).select('id').single();
  if (error) throw error;
  await linkCast(client, projectId, (data as { id: string }).id, names);
  return (data as { id: string }).id;
}
