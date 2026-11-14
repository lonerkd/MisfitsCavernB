// Soundtrack: sound effects (sfx_assets + the sfx_library bucket) and a
// project's audio references (its "audio bible"). RLS decides who sees what:
// a sound belongs to a project; its uploader and the project's people see it.
import { supabase } from './client';
import { beginUpload } from '@/lib/island/uploads';
import { uploadWithProgress } from './uploadProgress';
import type { Tables } from './database.types';

export type SfxAsset = Tables<'sfx_assets'>;
export type AudioReference = Tables<'project_audio_references'>;

/** The Storage bucket holding sound-effect files, one folder per uploader. */
export const SFX_BUCKET = 'sfx_library';

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
  // The island shows the upload and how far along it is.
  const tracker = beginUpload(file.name, file.size);
  let up: { error: { message: string } | null };
  try {
    up = await uploadWithProgress(
      supabase.storage.from(SFX_BUCKET),
      path,
      file,
      { contentType: file.type },
      (loaded, total) => tracker.progress(loaded, total),
      (abort) => tracker.setCancel(abort),
    );
  } finally {
    tracker.end();
  }
  if (up!.error) throw new Error(up!.error.message);
  const { data: url } = supabase.storage.from(SFX_BUCKET).getPublicUrl(path);
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

export type AudioRole = 'theme' | 'source' | 'temp' | 'needle_drop' | 'ambience';
/** What a track is doing in its scene. */
export const AUDIO_ROLES: Record<AudioRole, string> = { theme: 'Theme', source: 'Source music', temp: 'Temp score', needle_drop: 'Needle drop', ambience: 'Ambience' };

/** "tense, strings ,Tense" → ['tense', 'strings']: trimmed, no empties, no repeats (case aside), 40 characters each, twelve at most. */
export function normalizeTags(input: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input.split(',')) {
    const t = raw.trim().slice(0, 40);
    if (!t || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(t);
    if (out.length === 12) break;
  }
  return out;
}

/** Tag a saved track: the scene it is for, its role there, and free tags. Anyone on the project may; RLS and a trigger decide. */
export async function tagAudioRef(id: string, tag: { sceneId: string | null; role: AudioRole | null; tags: string[] }): Promise<void> {
  const { data, error } = await supabase.from('project_audio_references').update({ for_scene: tag.sceneId, role: tag.role, tags: tag.tags }).eq('id', id).select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('You cannot tag this track.');
}

export async function addAudioRef(ref: {
  projectId: string;
  userId: string | null;
  type: 'spotify' | 'custom_upload';
  uri: string;
  title: string;
  description: string;
  sceneId?: string | null;
  role?: AudioRole | null;
  tags?: string[];
}): Promise<void> {
  const { error } = await supabase.from('project_audio_references').insert({
    project_id: ref.projectId,
    added_by: ref.userId,
    reference_type: ref.type,
    uri: ref.uri,
    title: ref.title,
    description: ref.description,
    for_scene: ref.sceneId ?? null,
    role: ref.role ?? null,
    tags: ref.tags ?? [],
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
  return supabase.storage.from(SFX_BUCKET).getPublicUrl(uri).data.publicUrl;
}

/** A project's saved Spotify references (newest first), for the player. */
export async function listSpotifyRefs(projectId: string, limit = 20): Promise<{ id: string; title: string | null; uri: string }[]> {
  const { data, error } = await supabase.from('project_audio_references').select('id, title, uri').eq('project_id', projectId)
    .eq('reference_type', 'spotify').order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data ?? [];
}

/** A project's scenes in script order, labelled for a picker ("3 · INT. KITCHEN - DAY"). */
export async function listSceneChoices(projectId: string): Promise<{ id: string; label: string }[]> {
  const { data, error } = await supabase.from('scenes').select('id, scene_number, heading, title').eq('project_id', projectId)
    .order('scene_number', { ascending: true }).limit(500);
  if (error) throw error;
  return (data ?? []).map((sc) => ({ id: sc.id, label: `${sc.scene_number ?? '·'} · ${sc.heading || sc.title || 'Untitled scene'}` }));
}

/** A project's own sound-effect uploads, newest first. */
export async function listProjectSfx(projectId: string): Promise<SfxAsset[]> {
  const { data, error } = await supabase.from('sfx_assets').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** A project's scripts, most recently edited first, for the timeline's script picker. */
export async function listProjectScripts(projectId: string): Promise<{ id: string; title: string | null; updated_at: string | null }[]> {
  const { data, error } = await supabase.from('scripts').select('id, title, updated_at').eq('project_id', projectId)
    .order('updated_at', { ascending: false }).limit(50);
  if (error) throw error;
  return data ?? [];
}

/** One script's scenes (the rows the timeline lays out) and its text (to read each scene's mood and length). */
export async function loadScriptForTimeline(scriptId: string): Promise<{
  content: string | null;
  scenes: { id: string; scene_number: number; heading: string | null; time_of_day: string | null; est_duration: string | null; read_seconds: number | null }[];
}> {
  const [script, scenes] = await Promise.all([
    supabase.from('scripts').select('content').eq('id', scriptId).maybeSingle(),
    supabase.from('scenes').select('id, scene_number, heading, time_of_day, est_duration, read_seconds').eq('script_id', scriptId)
      .is('removed_at', null).order('scene_number', { ascending: true }).limit(1000),
  ]);
  if (script.error) throw script.error;
  if (scenes.error) throw scenes.error;
  return { content: script.data?.content ?? null, scenes: scenes.data ?? [] };
}

/**
 * Moves a saved track to another scene (or off any scene) only if it is still where the person saw it: one conditional write, so
 * a drag never overwrites a newer tag and its undo never undoes someone else's change. Returns false when it was not applied.
 */
export async function moveAudioRefScene(id: string, from: string | null, to: string | null): Promise<boolean> {
  let q = supabase.from('project_audio_references').update({ for_scene: to }).eq('id', id);
  q = from ? q.eq('for_scene', from) : q.is('for_scene', null);
  const { data, error } = await q.select('id');
  if (error) throw error;
  return !!data?.length;
}
