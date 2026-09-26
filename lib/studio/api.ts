// The Studio data layer. Every read and write of the media library, the scene
// index and the links between them goes through here.
//
// It takes the Supabase client as a parameter: the app passes its browser
// client (lib/studio/index.ts), and tests/integration pass a signed-in persona,
// so the integration suite exercises this exact code against a real database.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json, Tables } from '@/lib/supabase/database.types';
import { planSceneSync, type ParsedSceneInput } from './scene-sync';
import { classifyUrl, kindFromMime, safeFileName, titleFromFileName, uploadProblem } from './media-kind';

export type Client = SupabaseClient<Database>;
export type Media = Tables<'media'>;
export type SceneRow = Tables<'scenes'>;
export type SceneMedia = Tables<'scene_media'>;
export type CharacterMedia = Tables<'character_media'>;

export const MEDIA_BUCKET = 'project-media';

export interface MediaMeta {
  width?: number | null;
  height?: number | null;
  duration_seconds?: number | null;
}

export interface LookbookMedia {
  id: string;
  kind: Media['kind'];
  title: string;
  board: string | null;
  storage_path: string | null;
  external_url: string | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
}

export interface Lookbook {
  media: LookbookMedia[];
  scenes: Array<{ id: string; scene_number: number; heading: string; media_ids: string[] }>;
}

/** A failed call, with a message fit to show a person. */
export class StudioError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
    this.name = 'StudioError';
  }
}

// Postgres/PostgREST codes → words a person can act on. Our own raised
// exceptions (P0001, 42501 with a message from a trigger) are already phrased
// for people and pass through; constraint names never reach the screen.
const FRIENDLY: Record<string, string> = {
  '23505': 'That already exists.',
  '23503': 'Something this depends on was deleted — refresh and try again.',
  '23514': 'That value isn’t allowed here.',
  '22001': 'That’s too long.',
  'PGRST116': 'That item no longer exists, or you can’t see it.',
};

function fail(error: { message: string; code?: string } | null, fallback: string): never {
  const code = error?.code;
  const raw = error?.message || '';
  const internal = /violates|constraint|relation "|syntax|column "/i.test(raw);
  const message = (code && FRIENDLY[code]) || (code === '42501' && internal ? 'You don’t have permission to do that.' : null) || (internal ? fallback : raw) || fallback;
  throw new StudioError(message, code);
}

const byOrdinal = (a: SceneRow, b: SceneRow) => (a.ordinal ?? 0) - (b.ordinal ?? 0);

export function createStudioApi(db: Client) {
  async function listMedia(projectId: string): Promise<Media[]> {
    const { data, error } = await db.from('media').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
    if (error) fail(error, 'Could not load the library');
    return data;
  }

  async function addLink(projectId: string, userId: string, input: { url: string; title?: string; board?: string | null }): Promise<Media> {
    const link = classifyUrl(input.url);
    if (!link) throw new StudioError('That doesn’t look like a web address (it should start with https://).');
    const { data, error } = await db
      .from('media')
      .insert({
        project_id: projectId,
        kind: link.kind,
        title: (input.title?.trim() || link.title).slice(0, 200),
        external_url: link.url,
        board: input.board?.trim() || null,
        created_by: userId,
      })
      .select('*')
      .single();
    if (error) fail(error, 'Could not add the link');
    return data;
  }

  /**
   * Uploads a file into the project's private folder, then records it. If the
   * record can't be written the file is removed again, so nothing is orphaned.
   */
  async function uploadFile(
    projectId: string,
    userId: string,
    file: Blob & { name: string },
    options: { title?: string; board?: string | null; meta?: MediaMeta } = {},
  ): Promise<Media> {
    const problem = uploadProblem(file);
    if (problem) throw new StudioError(problem);
    const kind = kindFromMime(file.type)!;
    const id = crypto.randomUUID();
    const path = `${projectId}/${id}/${safeFileName(file.name)}`;

    const up = await db.storage.from(MEDIA_BUCKET).upload(path, file, { contentType: file.type, upsert: false, cacheControl: '31536000' });
    if (up.error) throw new StudioError(`Upload failed: ${up.error.message}`);

    const { data, error } = await db
      .from('media')
      .insert({
        id,
        project_id: projectId,
        kind,
        title: (options.title?.trim() || titleFromFileName(file.name)).slice(0, 200),
        board: options.board?.trim() || null,
        storage_path: path,
        mime_type: file.type,
        size_bytes: file.size,
        width: options.meta?.width ?? null,
        height: options.meta?.height ?? null,
        duration_seconds: options.meta?.duration_seconds ?? null,
        created_by: userId,
      })
      .select('*')
      .single();
    if (error) {
      await db.storage.from(MEDIA_BUCKET).remove([path]);
      fail(error, 'Could not save the upload');
    }
    return data;
  }

  async function updateMedia(id: string, patch: Partial<Pick<Media, 'title' | 'notes' | 'board' | 'shared'>>): Promise<Media> {
    const clean = { ...patch };
    if (clean.title !== undefined) clean.title = (clean.title || '').trim().slice(0, 200);
    if (clean.board !== undefined) clean.board = clean.board?.trim() || null;
    const { data, error } = await db.from('media').update(clean).eq('id', id).select('*').maybeSingle();
    if (error) fail(error, 'Could not save the change');
    if (!data) throw new StudioError('That item no longer exists, or you can’t edit it.');
    return data;
  }

  /** Deletes the record first (the source of truth), then its file. */
  async function deleteMedia(media: Pick<Media, 'id' | 'storage_path'>): Promise<void> {
    const { data, error } = await db.from('media').delete().eq('id', media.id).select('id');
    if (error) fail(error, 'Could not delete');
    if (!data.length) throw new StudioError('Only the person who added this, or the project owner, can delete it.');
    if (media.storage_path) await db.storage.from(MEDIA_BUCKET).remove([media.storage_path]);
  }

  /** Short-lived URLs for private files, keyed by storage path. */
  async function signedUrls(paths: string[], expiresInSeconds = 3600): Promise<Record<string, string>> {
    const unique = Array.from(new Set(paths.filter(Boolean)));
    if (!unique.length) return {};
    const { data, error } = await db.storage.from(MEDIA_BUCKET).createSignedUrls(unique, expiresInSeconds);
    if (error) fail(error, 'Could not load files');
    const out: Record<string, string> = {};
    for (const row of data) if (row.path && row.signedUrl && !row.error) out[row.path] = row.signedUrl;
    return out;
  }

  // ── Scene index ──────────────────────────────────────────────────────────

  async function listScenes(scriptId: string, opts: { includeRemoved?: boolean } = {}): Promise<SceneRow[]> {
    let q = db.from('scenes').select('*').eq('script_id', scriptId);
    if (!opts.includeRemoved) q = q.is('removed_at', null);
    const { data, error } = await q;
    if (error) fail(error, 'Could not load scenes');
    return data.sort(byOrdinal);
  }

  async function listProjectScenes(projectId: string): Promise<SceneRow[]> {
    const { data, error } = await db.from('scenes').select('*').eq('project_id', projectId).is('removed_at', null);
    if (error) fail(error, 'Could not load scenes');
    return data.sort(byOrdinal);
  }

  /**
   * Brings the script's scene index in line with its parsed scenes and returns
   * the active scenes in script order. Retries if another device synced first.
   */
  async function syncScriptScenes(scriptId: string, parsed: ParsedSceneInput[]): Promise<SceneRow[]> {
    for (let attempt = 0; attempt < 4; attempt++) {
      const existing = await listScenes(scriptId, { includeRemoved: true });
      const plan = planSceneSync(existing, parsed, () => crypto.randomUUID());
      if (!plan.changed) return existing.filter((s) => !s.removed_at).sort(byOrdinal);
      const { error } = await db.rpc('sync_script_scenes', {
        p_script_id: scriptId,
        p_base_ids: plan.baseIds,
        p_scenes: plan.scenes as unknown as Json,
      });
      if (!error) return listScenes(scriptId);
      if (error.code !== '40001') fail(error, 'Could not update the scene list');
    }
    throw new StudioError('The scene list kept changing on another device — try again in a moment.', '40001');
  }

  async function updateScene(id: string, patch: Partial<Pick<SceneRow, 'note' | 'color' | 'shoot_day' | 'status'>>): Promise<SceneRow> {
    const { data, error } = await db.from('scenes').update(patch).eq('id', id).select('*').maybeSingle();
    if (error) fail(error, 'Could not save the scene');
    if (!data) throw new StudioError('That scene no longer exists, or you can’t edit it.');
    return data;
  }

  // ── Links ────────────────────────────────────────────────────────────────

  async function listSceneMedia(projectId: string): Promise<SceneMedia[]> {
    const { data, error } = await db.from('scene_media').select('*').eq('project_id', projectId).order('position').order('created_at');
    if (error) fail(error, 'Could not load scene references');
    return data;
  }

  async function linkMedia(projectId: string, userId: string, sceneId: string, mediaId: string): Promise<SceneMedia> {
    const { data: last } = await db.from('scene_media').select('position').eq('scene_id', sceneId).order('position', { ascending: false }).limit(1);
    const position = (last?.[0]?.position ?? -1) + 1;
    const { data, error } = await db
      .from('scene_media')
      .upsert({ project_id: projectId, scene_id: sceneId, media_id: mediaId, position, created_by: userId }, { onConflict: 'scene_id,media_id', ignoreDuplicates: true })
      .select('*');
    if (error) fail(error, 'Could not link to the scene');
    if (data[0]) return data[0];
    const { data: existing, error: readError } = await db.from('scene_media').select('*').eq('scene_id', sceneId).eq('media_id', mediaId).single();
    if (readError) fail(readError, 'Could not link to the scene');
    return existing;
  }

  async function unlinkMedia(sceneId: string, mediaId: string): Promise<void> {
    const { error } = await db.from('scene_media').delete().eq('scene_id', sceneId).eq('media_id', mediaId);
    if (error) fail(error, 'Could not unlink');
  }

  async function listCharacterMedia(projectId: string): Promise<CharacterMedia[]> {
    const { data, error } = await db.from('character_media').select('*').eq('project_id', projectId).order('position').order('created_at');
    if (error) fail(error, 'Could not load character looks');
    return data;
  }

  async function linkCharacterMedia(projectId: string, userId: string, characterId: string, mediaId: string): Promise<void> {
    const { error } = await db
      .from('character_media')
      .upsert({ project_id: projectId, character_id: characterId, media_id: mediaId, created_by: userId }, { onConflict: 'character_id,media_id', ignoreDuplicates: true });
    if (error) fail(error, 'Could not link the look');
  }

  async function unlinkCharacterMedia(characterId: string, mediaId: string): Promise<void> {
    const { error } = await db.from('character_media').delete().eq('character_id', characterId).eq('media_id', mediaId);
    if (error) fail(error, 'Could not unlink the look');
  }

  // ── Share link ───────────────────────────────────────────────────────────

  /** The published lookbook for a share token, or null if it doesn't resolve. */
  async function getLookbook(token: string): Promise<Lookbook | null> {
    const { data, error } = await db.rpc('get_shared_lookbook', { p_token: token });
    if (error) fail(error, 'Could not load the shared project');
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    return data as unknown as Lookbook;
  }

  return {
    listMedia, addLink, uploadFile, updateMedia, deleteMedia, signedUrls,
    listScenes, listProjectScenes, syncScriptScenes, updateScene,
    listSceneMedia, linkMedia, unlinkMedia,
    listCharacterMedia, linkCharacterMedia, unlinkCharacterMedia,
    getLookbook,
  };
}

export type StudioApi = ReturnType<typeof createStudioApi>;
