// Soundtrack: sound effects (sfx_assets + the sfx_library bucket) and a
// project's audio references (its "audio bible"). RLS decides who sees what:
// a sound belongs to a project; its uploader and the project's people see it.
import { supabase } from './client';
import type { Tables } from './database.types';

export type SfxAsset = Tables<'sfx_assets'>;
export type AudioReference = Tables<'project_audio_references'>;

/** The project's most recently edited script (title and text), for reading moods; null when it has none. */
export async function getLatestScript(projectId: string): Promise<{ title: string | null; content: string | null } | null> {
  const { data, error } = await supabase.from('scripts').select('title, content').eq('project_id', projectId)
    .order('updated_at', { ascending: false }).limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

/** Every sound effect this person can hear, newest first. */
export async function listSfx(): Promise<SfxAsset[]> {
  const { data, error } = await supabase.from('sfx_assets').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Uploads an audio file to the uploader's own folder and lists it under the project. */
export async function uploadSfx(file: File, userId: string, projectId: string): Promise<void> {
  const path = `${userId}/${Date.now()}_${file.name.replace(/[^\w.-]+/g, '_')}`;
  const { error: uploadError } = await supabase.storage.from('sfx_library').upload(path, file);
  if (uploadError) throw uploadError;
  const { data: url } = supabase.storage.from('sfx_library').getPublicUrl(path);
  const { error } = await supabase.from('sfx_assets').insert({
    title: file.name,
    audio_url: url.publicUrl,
    user_id: userId,
    project_id: projectId,
    tags: ['Cavern Created'],
  });
  if (error) throw error;
}

/** A project's saved audio references, newest first. */
export async function listAudioRefs(projectId: string): Promise<AudioReference[]> {
  const { data, error } = await supabase.from('project_audio_references').select('*').eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addAudioRef(ref: {
  projectId: string;
  userId: string | null;
  type: 'spotify' | 'custom_upload';
  uri: string;
  title: string;
  description: string;
}): Promise<void> {
  const { error } = await supabase.from('project_audio_references').insert({
    project_id: ref.projectId,
    added_by: ref.userId,
    reference_type: ref.type,
    uri: ref.uri,
    title: ref.title,
    description: ref.description,
  });
  if (error) throw error;
}

export async function deleteAudioRef(id: string): Promise<void> {
  const { error } = await supabase.from('project_audio_references').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Where an uploaded reference plays from. Saving a sound effect to a project
 * stores its full public URL; a bare storage path (in the sfx_library bucket)
 * is resolved to one. (Play used to wrap the full URL in a second storage
 * URL, so uploaded references never played.)
 */
export function audioRefUrl(uri: string): string {
  if (/^https?:\/\//i.test(uri)) return uri;
  return supabase.storage.from('sfx_library').getPublicUrl(uri).data.publicUrl;
}

/** A project's saved Spotify references (newest first), for the player. */
export async function listSpotifyRefs(projectId: string, limit = 20): Promise<{ id: string; title: string | null; uri: string }[]> {
  const { data, error } = await supabase.from('project_audio_references').select('id, title, uri').eq('project_id', projectId)
    .eq('reference_type', 'spotify').order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data ?? [];
}
