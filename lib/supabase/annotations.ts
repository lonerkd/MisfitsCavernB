import { supabase } from './client';

export type AnnotationType = 'shot' | 'beat' | 'note' | 'revision' | 'reference' | 'todo';

// routesTo says where the note ends up. Shot, beat and to-do create that
// item (add_script_annotation); the others stay on the script.
export const ANNOTATION_META: Record<AnnotationType, { label: string; color: string; routesTo: string; href?: string }> = {
  shot: { label: 'Shot', color: '#0099ff', routesTo: 'the scene’s shot list (Studio › Scenes)', href: '/studio?tab=scenes' },
  beat: { label: 'Beat', color: '#6366f1', routesTo: 'the beat board (Studio › Production)', href: '/studio?tab=production' },
  note: { label: 'Note', color: '#eab308', routesTo: 'this line of the script' },
  revision: { label: 'Revision', color: '#d7340b', routesTo: 'this line of the script' },
  reference: { label: 'Reference', color: '#a855f7', routesTo: 'this line (add media in the Refs tab)' },
  todo: { label: 'To-do', color: '#10b981', routesTo: 'the project’s tasks', href: '/projects' },
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
  routed_table: 'shots' | 'project_beats' | 'project_tasks' | null;
  routed_id: string | null;
}

export async function listAnnotations(scriptId: string): Promise<ScriptAnnotation[]> {
  const { data, error } = await supabase.from('script_annotations').select('*').eq('script_id', scriptId).order('line_index');
  if (error) throw error;
  return (data as ScriptAnnotation[]) || [];
}

/**
 * Adds a margin note. Shot/beat/to-do notes also create the shot (on the
 * scene the line is in — identified by its position and heading in the
 * saved script), the beat or the task, atomically.
 */
export async function addAnnotation(input: {
  scriptId: string; lineIndex: number; type: AnnotationType; text: string;
  scene?: { ordinal: number; heading: string } | null;
}): Promise<ScriptAnnotation> {
  const { data, error } = await supabase.rpc('add_script_annotation', {
    p_script: input.scriptId,
    p_line: input.lineIndex,
    p_type: input.type,
    p_text: input.text,
    p_scene_ordinal: input.scene?.ordinal,
    p_scene_heading: input.scene?.heading,
  });
  if (error) throw error;
  return data as ScriptAnnotation;
}

export async function deleteAnnotation(id: string): Promise<void> {
  const { error } = await supabase.from('script_annotations').delete().eq('id', id);
  if (error) throw error;
}
