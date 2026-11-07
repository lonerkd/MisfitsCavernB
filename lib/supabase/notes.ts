import { supabase } from './client';

export type NoteScope = 'private' | 'project' | 'writer';

export const NOTE_SCOPES: Record<NoteScope, { label: string; who: string }> = {
  private: { label: 'Private', who: 'Only you' },
  project: { label: 'Project', who: 'Everyone on the project' },
  writer: { label: 'Writers', who: 'Everyone who can open this script' },
};

export interface Note {
  id: string;
  scope: NoteScope;
  project_id: string | null;
  script_id: string | null;
  scene_id: string | null;
  context: string | null;
  body: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/** Where a list of notes looks: a script (its writer notes, plus your private notes on it) or a project (its project notes, plus your private ones). */
export interface NoteTarget { scriptId?: string | null; projectId?: string | null }

/** Row-level security decides what is returned; the filter only picks the place. */
export async function listNotes(target: NoteTarget): Promise<Note[]> {
  if (!target.scriptId && !target.projectId) return [];
  let q = supabase.from('notes').select('*').order('created_at', { ascending: false }).limit(200);
  // A script's list holds its own notes and, when its project is known, the project's notes (a project note has no script).
  if (target.scriptId && target.projectId) q = q.or(`script_id.eq.${target.scriptId},and(project_id.eq.${target.projectId},script_id.is.null)`);
  else if (target.scriptId) q = q.eq('script_id', target.scriptId);
  else q = q.eq('project_id', target.projectId!).is('script_id', null);
  const { data, error } = await q;
  if (error) throw error;
  return (data as Note[]) ?? [];
}

export function noteDraftProblem(scope: NoteScope, body: string, target: NoteTarget): string | null {
  if (!body.trim()) return 'Write something first.';
  if (body.trim().length > 4000) return 'A note is at most 4000 characters.';
  if (scope === 'writer' && !target.scriptId) return 'Writer notes belong to a script.';
  if (scope === 'project' && !(target.projectId)) return 'Project notes belong to a project.';
  return null;
}

export async function addNote(input: { scope: NoteScope; body: string; context?: string | null; sceneId?: string | null } & NoteTarget): Promise<Note> {
  const problem = noteDraftProblem(input.scope, input.body, input);
  if (problem) throw new Error(problem);
  const { data, error } = await supabase
    .from('notes')
    .insert({
      scope: input.scope,
      body: input.body.trim(),
      context: input.context?.slice(0, 200) || null,
      script_id: input.scope === 'project' ? null : input.scriptId ?? null,
      project_id: input.scope === 'writer' ? null : input.projectId ?? null,
      scene_id: input.sceneId ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as Note;
}

export async function editNote(id: string, body: string): Promise<void> {
  if (!body.trim()) throw new Error('Write something first.');
  const { data, error } = await supabase.from('notes').update({ body: body.trim() }).eq('id', id).select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('Only the author can edit a note.');
}

export async function deleteNote(id: string): Promise<void> {
  const { data, error } = await supabase.from('notes').delete().eq('id', id).select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('You cannot delete this note.');
}
