import type { SupabaseClient } from '@supabase/supabase-js';

// A scene's cast as the graph holds it (characters and links; the scenes table keeps no cast text since 2026-11-17).
// For specs that seed scenes straight into the database with the service key.

/** Give a scene a cast: the characters are created when new, the links replace what was there. Names are upper-cased. */
export async function linkCast(admin: SupabaseClient, projectId: string, sceneId: string, names: string[]) {
  const want = Array.from(new Set(names.map((n) => n.trim().toUpperCase()).filter(Boolean)));
  if (want.length === 0) return;
  const made = await admin.from('characters').upsert(want.map((name) => ({ project_id: projectId, name })), { onConflict: 'project_id,name', ignoreDuplicates: true });
  if (made.error) throw made.error;
  const found = await admin.from('characters').select('id').eq('project_id', projectId).in('name', want);
  if (found.error) throw found.error;
  const link = await admin.from('scene_characters').upsert((found.data ?? []).map((c) => ({ scene_id: sceneId, character_id: c.id, project_id: projectId })), { onConflict: 'scene_id,character_id', ignoreDuplicates: true });
  if (link.error) throw link.error;
}

/** The names of the characters linked to a scene, sorted, as a comma-separated string ("BEN, MAYA"), or null for none. */
export async function castOfScene(admin: SupabaseClient, sceneId: string): Promise<string | null> {
  const { data, error } = await admin.from('scene_characters').select('characters(name)').eq('scene_id', sceneId);
  if (error) throw error;
  const names = (data ?? []).map((r) => (r.characters as unknown as { name: string } | null)?.name).filter((n): n is string => !!n).sort();
  return names.length ? names.join(', ') : null;
}
