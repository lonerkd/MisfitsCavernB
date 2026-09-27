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
export type Shot = Tables<'shots'>;
export type CallSheet = Tables<'call_sheets'>;
export type CallSheetCall = Tables<'call_sheet_calls'>;
export type CallSheetPatch = Partial<Pick<CallSheet, 'shoot_date' | 'general_call' | 'shooting_call' | 'estimated_wrap' | 'location_address' | 'weather' | 'notes'>>;
export type PostCut = Tables<'post_cuts'>;
export type PostNote = Tables<'post_notes'>;
export type PostItem = Tables<'post_items'>;
export const POST_DEPARTMENTS = ['edit', 'sound', 'music', 'color', 'vfx', 'titles', 'general'] as const;
export type PostDepartment = (typeof POST_DEPARTMENTS)[number];
export const POST_DEPT_LABEL: Record<PostDepartment, string> = { edit: 'Edit', sound: 'Sound', music: 'Music', color: 'Colour', vfx: 'VFX', titles: 'Titles', general: 'General' };
export const POST_DEPT_COLOR: Record<PostDepartment, string> = { edit: '#a5b4fc', sound: '#34d399', music: '#f472b6', color: '#fbbf24', vfx: '#60a5fa', titles: '#e5e7eb', general: '#9ca3af' };
export const POST_STATUSES = ['todo', 'in_progress', 'review', 'done'] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

/** The standard post pipeline and deliverables for a new project. */
export const STANDARD_POST: Array<{ kind: 'stage' | 'deliverable'; title: string; department: PostDepartment | null }> = [
  { kind: 'stage', title: 'Picture edit — assembly to picture lock', department: 'edit' },
  { kind: 'stage', title: 'Sound edit & mix', department: 'sound' },
  { kind: 'stage', title: 'Music — score & licensing', department: 'music' },
  { kind: 'stage', title: 'Colour grade', department: 'color' },
  { kind: 'stage', title: 'VFX', department: 'vfx' },
  { kind: 'stage', title: 'Titles & credits', department: 'titles' },
  { kind: 'deliverable', title: 'Picture master (ProRes)', department: 'edit' },
  { kind: 'deliverable', title: 'Audio stems (dialogue / music / effects)', department: 'sound' },
  { kind: 'deliverable', title: 'Subtitles (SRT)', department: 'titles' },
  { kind: 'deliverable', title: 'Music cue sheet', department: 'music' },
  { kind: 'deliverable', title: 'Trailer', department: 'edit' },
  { kind: 'deliverable', title: 'Poster & key art', department: 'general' },
  { kind: 'deliverable', title: 'Production stills', department: 'general' },
  { kind: 'deliverable', title: 'Press kit (EPK)', department: 'general' },
  { kind: 'deliverable', title: 'Festival screener link', department: 'edit' },
];

/** Who a call is for: a crew member, or a character (the actor playing them). */
export type CallTarget = { crew_user_id: string } | { character_name: string };
export type ShotPatch = Partial<Pick<Shot, 'shot_size' | 'angle' | 'movement' | 'lens' | 'description' | 'status' | 'frame_media_id' | 'order_index'>>;

/** A "Shot" margin note in the script that created a shot (script_annotations routed to shots). */
export type LineCutNote = PostNote & { cut_title: string };
export type ShotNote = { id: string; script_id: string; line_index: number; text: string; routed_id: string };

/** Next shot number in a scene: one past the highest numeric one. */
export function nextShotNumber(shots: Pick<Shot, 'shot_number'>[]): string {
  const max = shots.reduce((m, x) => Math.max(m, parseInt(x.shot_number, 10) || 0), 0);
  return String(max + 1);
}

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

  async function updateScene(id: string, patch: Partial<Pick<SceneRow, 'note' | 'color' | 'shoot_day' | 'status' | 'read_seconds' | 'read_at'>>): Promise<SceneRow> {
    const { data, error } = await db.from('scenes').update(patch).eq('id', id).select('*').maybeSingle();
    if (error) fail(error, 'Could not save the scene');
    if (!data) throw new StudioError('That scene no longer exists, or you can’t edit it.');
    return data;
  }

  // ── Shot list ────────────────────────────────────────────────────────────

  async function listShots(projectId: string): Promise<Shot[]> {
    const { data, error } = await db.from('shots').select('*').eq('project_id', projectId);
    if (error) fail(error, 'Could not load the shot list');
    return data;
  }

  async function addShot(projectId: string, sceneId: string, existing: Shot[], description = ''): Promise<Shot> {
    const { data, error } = await db.from('shots').insert({
      project_id: projectId,
      scene_id: sceneId,
      shot_number: nextShotNumber(existing),
      description: description || null,
      order_index: existing.reduce((m, x) => Math.max(m, x.order_index ?? 0), -1) + 1,
    }).select('*').single();
    if (error) fail(error, 'Could not add the shot');
    return data;
  }

  async function updateShot(id: string, patch: ShotPatch): Promise<Shot> {
    const { data, error } = await db.from('shots').update(patch).eq('id', id).select('*').maybeSingle();
    if (error) fail(error, 'Could not save the shot');
    if (!data) throw new StudioError('That shot no longer exists, or you can’t edit it.');
    return data;
  }

  async function deleteShot(id: string): Promise<void> {
    const { error } = await db.from('shots').delete().eq('id', id);
    if (error) fail(error, 'Could not delete the shot');
  }

  /** Puts a scene's shots in this order (order_index 0…n), writing only the ones that move. */
  async function reorderShots(ordered: Pick<Shot, 'id' | 'order_index'>[]): Promise<void> {
    for (let i = 0; i < ordered.length; i++) {
      if (ordered[i].order_index === i) continue;
      const { error } = await db.from('shots').update({ order_index: i }).eq('id', ordered[i].id);
      if (error) fail(error, 'Could not reorder the shots');
    }
  }

  /** Which script line each shot came from, for shots made from "Shot" margin notes. */
  async function listShotNotes(projectId: string): Promise<ShotNote[]> {
    const { data, error } = await db.from('script_annotations')
      .select('id, script_id, line_index, text, routed_id')
      .eq('project_id', projectId).eq('routed_table', 'shots').not('routed_id', 'is', null);
    if (error) fail(error, 'Could not load where the shots come from');
    return data as ShotNote[];
  }

  // ── Call sheets ──────────────────────────────────────────────────────────

  async function listCallSheets(projectId: string): Promise<CallSheet[]> {
    const { data, error } = await db.from('call_sheets').select('*').eq('project_id', projectId);
    if (error) fail(error, 'Could not load call sheets');
    return data;
  }

  /** Creates the day's sheet on first save; later saves change only the given fields. */
  async function saveCallSheet(projectId: string, day: number, patch: CallSheetPatch): Promise<CallSheet> {
    const { data, error } = await db.from('call_sheets')
      .upsert({ project_id: projectId, shoot_day: day, ...patch }, { onConflict: 'project_id,shoot_day' })
      .select('*').single();
    if (error) fail(error, 'Could not save the call sheet');
    return data;
  }

  async function listCalls(projectId: string): Promise<CallSheetCall[]> {
    const { data, error } = await db.from('call_sheet_calls').select('*').eq('project_id', projectId);
    if (error) fail(error, 'Could not load call times');
    return data;
  }

  /**
   * Sets one person's call on a sheet. An empty time and remark clears it.
   * Returns the saved row, or null when cleared.
   */
  async function saveCall(
    sheet: Pick<CallSheet, 'id' | 'project_id'>, target: CallTarget, existing: CallSheetCall | undefined,
    fields: { call_time: string | null; remarks: string | null; role_label?: string | null },
  ): Promise<CallSheetCall | null> {
    if (!fields.call_time && !fields.remarks) {
      if (existing) {
        const { error } = await db.from('call_sheet_calls').delete().eq('id', existing.id);
        if (error) fail(error, 'Could not clear the call');
      }
      return null;
    }
    const q = existing
      ? db.from('call_sheet_calls').update(fields).eq('id', existing.id)
      : db.from('call_sheet_calls').insert({ call_sheet_id: sheet.id, project_id: sheet.project_id, ...target, ...fields });
    const { data, error } = await q.select('*').single();
    if (error) fail(error, 'Could not save the call');
    return data;
  }

  // ── Post-production ──────────────────────────────────────────────────────

  async function listCuts(projectId: string): Promise<PostCut[]> {
    const { data, error } = await db.from('post_cuts').select('*').eq('project_id', projectId);
    if (error) fail(error, 'Could not load cuts');
    return data;
  }

  async function addCut(projectId: string, title: string, source: { url: string } | { media_id: string }): Promise<PostCut> {
    const { data, error } = await db.from('post_cuts').insert({ project_id: projectId, title, ...source }).select('*').single();
    if (error) fail(error, 'Could not add the cut');
    return data;
  }

  async function deleteCut(id: string): Promise<void> {
    const { error } = await db.from('post_cuts').delete().eq('id', id);
    if (error) fail(error, 'Could not delete the cut');
  }

  async function listPostNotes(projectId: string): Promise<PostNote[]> {
    const { data, error } = await db.from('post_notes').select('*').eq('project_id', projectId);
    if (error) fail(error, 'Could not load notes');
    return data;
  }

  async function addPostNote(note: Pick<PostNote, 'project_id' | 'cut_id' | 'at_seconds' | 'department' | 'body'> & { scene_id?: string | null; line_offset?: number | null; line_text?: string | null }): Promise<PostNote> {
    const { data, error } = await db.from('post_notes').insert(note).select('*').single();
    if (error) fail(error, 'Could not add the note');
    return data;
  }

  /** A project's cut notes pinned to script lines, with their cut's name (the editor's margin). */
  async function listLineCutNotes(projectId: string): Promise<LineCutNote[]> {
    const { data, error } = await db.from('post_notes')
      .select('*, cut:post_cuts!post_notes_cut_fkey(title)')
      .eq('project_id', projectId).not('line_offset', 'is', null)
      .order('at_seconds');
    if (error) fail(error, 'Could not load cut notes');
    return data.map(({ cut, ...n }) => ({ ...n, cut_title: cut?.title ?? 'Cut' }));
  }

  /** Resolve (as the caller) or reopen a note. */
  async function setPostNoteResolved(id: string, userId: string, resolved: boolean): Promise<PostNote> {
    const patch = resolved ? { resolved_at: new Date().toISOString(), resolved_by: userId } : { resolved_at: null, resolved_by: null };
    const { data, error } = await db.from('post_notes').update(patch).eq('id', id).select('*').maybeSingle();
    if (error) fail(error, 'Could not update the note');
    if (!data) throw new StudioError('That note no longer exists.');
    return data;
  }

  async function deletePostNote(id: string): Promise<void> {
    const { error } = await db.from('post_notes').delete().eq('id', id);
    if (error) fail(error, 'Could not delete the note');
  }

  async function listPostItems(projectId: string): Promise<PostItem[]> {
    const { data, error } = await db.from('post_items').select('*').eq('project_id', projectId);
    if (error) fail(error, 'Could not load the post pipeline');
    return data;
  }

  async function addPostItems(projectId: string, items: Array<Pick<PostItem, 'kind' | 'title'> & Partial<Pick<PostItem, 'department' | 'position'>>>): Promise<PostItem[]> {
    const { data, error } = await db.from('post_items').insert(items.map((i) => ({ project_id: projectId, ...i }))).select('*');
    if (error) fail(error, 'Could not add to the pipeline');
    return data;
  }

  async function updatePostItem(id: string, patch: Partial<Pick<PostItem, 'status' | 'due_date' | 'assigned_to' | 'title' | 'notes'>>): Promise<PostItem> {
    const { data, error } = await db.from('post_items').update(patch).eq('id', id).select('*').maybeSingle();
    if (error) fail(error, 'Could not save');
    if (!data) throw new StudioError('That item no longer exists.');
    return data;
  }

  async function deletePostItem(id: string): Promise<void> {
    const { error } = await db.from('post_items').delete().eq('id', id);
    if (error) fail(error, 'Could not delete');
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
    listShots, addShot, updateShot, deleteShot, reorderShots, listShotNotes,
    listCallSheets, saveCallSheet, listCalls, saveCall,
    listCuts, addCut, deleteCut, listPostNotes, addPostNote, listLineCutNotes, setPostNoteResolved, deletePostNote,
    listPostItems, addPostItems, updatePostItem, deletePostItem,
    listSceneMedia, linkMedia, unlinkMedia,
    listCharacterMedia, linkCharacterMedia, unlinkCharacterMedia,
    getLookbook,
  };
}

export type StudioApi = ReturnType<typeof createStudioApi>;
