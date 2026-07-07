import { supabase } from './client';

// ScriptOS margin gutter: typed, line-anchored annotations. Each type
// conceptually routes to its owning department elsewhere in the suite.
//
// Wired for real (app/editor/page.tsx's submitAnnotation, via
// resolveLineToSceneId in lib/supabase/breakdown.ts): shot -> creates a real
// row in the Shot List (Studio > Schedule); todo -> appends to that scene's
// shoot day's Call Sheet notes (also Studio > Schedule). Both were pure
// labels with no actual destination before this table's shots/call_sheets
// tables existed.
//
// Still label-only, not yet wired to a real destination: beat (Studio's
// Beat Board is real via project_beats, but this annotation type doesn't
// create a beat there yet), revision (ScriptOS's own Revisions/History
// panel is real, not yet linked from here), reference (concept_assets/
// scene_references exist, not yet linked from here). note has no external
// destination by design -- it's meant to stay in the margin.
export type AnnotationType = 'shot' | 'beat' | 'note' | 'revision' | 'reference' | 'todo';

export const ANNOTATION_META: Record<AnnotationType, { label: string; color: string; routesTo: string }> = {
  shot: { label: 'Shot', color: '#0099ff', routesTo: 'Shot List' },
  beat: { label: 'Beat', color: '#6366f1', routesTo: 'Beat Board' },
  note: { label: 'Note', color: '#eab308', routesTo: 'Notes' },
  revision: { label: 'Revision', color: '#d7340b', routesTo: 'Revisions' },
  reference: { label: 'Reference', color: '#a855f7', routesTo: 'Concept References' },
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
