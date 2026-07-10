import { supabase } from './client';

// ScriptOS margin gutter: typed, line-anchored annotations. Each type
// conceptually routes to its owning department elsewhere in the suite —
// where that's structurally possible. All 6 types were previously pure
// labels with a "routesTo" string and zero code anywhere that actually
// reached the named destination; this file's addAnnotation was the only
// thing that ever happened.
//
// Wired for real (app/editor/page.tsx's submitAnnotation):
//  - shot -> creates a real row in the Shot List (Studio > Schedule), via
//    resolveLineToSceneId (lib/supabase/breakdown.ts) to find which scene
//    the annotated line falls in.
//  - todo -> appends to that scene's shoot day's Call Sheet notes (same
//    resolver).
//  - beat -> creates a real project_beats row on Studio's Beat Board.
//    Beats aren't scene-scoped, so this one doesn't need the line->scene
//    resolver at all.
//
// Deliberately NOT wired to a cross-module destination (routesTo describes
// where the concept belongs, not an automated action):
//  - revision: ScriptOS's real Revisions feature is a whole-script
//    snapshot/lock, not a per-line marker — auto-creating a full revision
//    every time someone flags one line would be a surprising, unwanted
//    side effect. This stays a margin note tagged "needs a revision pass."
//  - reference: linking to a scene_reference needs a specific existing
//    concept_asset_id (an image already on the Concept Board) — a free-text
//    note has no way to supply that, so there's no image to link to yet.
//    This stays a margin note flagging that a visual reference is wanted.
//  - note: no external destination by design, meant to stay in the margin.
export type AnnotationType = 'shot' | 'beat' | 'note' | 'revision' | 'reference' | 'todo';

export const ANNOTATION_META: Record<AnnotationType, { label: string; color: string; routesTo: string }> = {
  shot: { label: 'Shot', color: '#0099ff', routesTo: 'Shot List' },
  beat: { label: 'Beat', color: '#6366f1', routesTo: 'Beat Board' },
  note: { label: 'Note', color: '#eab308', routesTo: 'Notes' },
  revision: { label: 'Revision', color: '#d7340b', routesTo: 'Revision Pass (flagged in margin)' },
  reference: { label: 'Reference', color: '#a855f7', routesTo: 'Visual Reference (flagged in margin)' },
  todo: { label: 'To-do', color: '#10b981', routesTo: 'Call Sheet' },
};
export const ANNOTATION_TYPES: AnnotationType[] = ['shot', 'beat', 'note', 'revision', 'reference', 'todo'];

export interface ScriptAnnotation {
  id: string;
  script_id: string;
  project_id: string;
  line_index: number;
  type: AnnotationType;
  text: string;
  created_by: string | null;
  created_at: string;
}

export async function listAnnotations(scriptId: string): Promise<ScriptAnnotation[]> {
  const { data, error } = await supabase.from('script_annotations').select('*').eq('script_id', scriptId).order('line_index');
  if (error) throw error;
  return (data as ScriptAnnotation[]) || [];
}

export async function addAnnotation(input: { scriptId: string; projectId: string; lineIndex: number; type: AnnotationType; text: string; createdBy: string }): Promise<ScriptAnnotation> {
  const { data, error } = await supabase.from('script_annotations').insert({
    script_id: input.scriptId,
    project_id: input.projectId,
    line_index: input.lineIndex,
    type: input.type,
    text: input.text,
    created_by: input.createdBy,
  }).select().single();
  if (error) throw error;
  return data as ScriptAnnotation;
}

export async function deleteAnnotation(id: string): Promise<void> {
  const { error } = await supabase.from('script_annotations').delete().eq('id', id);
  if (error) throw error;
}
