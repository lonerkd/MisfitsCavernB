'use client';

// The script's margin notes (Shot / Beat / To-do …): loaded per script, added
// at a line (a note can route to the shot list, the beat board or tasks), and
// removed after a confirm.

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';
import { useOnChange } from '@/lib/hooks/useOnChange';
import { addAnnotation, deleteAnnotation, listAnnotations, ANNOTATION_META, type AnnotationType, type ScriptAnnotation } from '@/lib/supabase/annotations';

// Database errors arrive as plain objects with a message, not as Error instances.
const messageOf = (e: unknown): string | undefined => (e as { message?: string } | null)?.message;

export interface AnnotationDraft { line: number; type: AnnotationType; text: string }

/** `sceneAtLine` names the scene a line is in, so a routed note knows its scene. */
export function useScriptAnnotations(
  scriptId: string | undefined,
  sceneAtLine: (line: number) => { ordinal: number; heading: string } | null,
) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [annotations, setAnnotations] = useState<ScriptAnnotation[]>([]);
  const [annotationDraft, setAnnotationDraft] = useState<AnnotationDraft | null>(null);

  const reloadAnnotations = useCallback((id: string) => {
    listAnnotations(id).then(setAnnotations).catch(() => setAnnotations([]));
  }, []);

  // No script, no margin notes; a script's own load in the effect below.
  useOnChange(scriptId, (id) => { if (!id) setAnnotations([]); });
  useEffect(() => {
    if (scriptId) reloadAnnotations(scriptId);
  }, [scriptId, reloadAnnotations]);

  const submitAnnotation = useCallback(async () => {
    if (!annotationDraft || !scriptId || !annotationDraft.text.trim()) return;
    try {
      const a = await addAnnotation({ scriptId, lineIndex: annotationDraft.line, type: annotationDraft.type, text: annotationDraft.text.trim(), scene: sceneAtLine(annotationDraft.line) });
      reloadAnnotations(scriptId);
      setAnnotationDraft(null);
      if (a.routed_table) toast(`${ANNOTATION_META[a.type].label} added to ${ANNOTATION_META[a.type].routesTo}`, 'success');
    } catch (e: unknown) {
      toast(messageOf(e) || 'Could not add that note', 'error');
    }
  }, [annotationDraft, scriptId, reloadAnnotations, sceneAtLine, toast]);

  const removeAnnotation = useCallback(async (id: string) => {
    if (!scriptId) return;
    const a = annotations.find((x) => x.id === id);
    const kept = a?.routed_table ? ` The ${ANNOTATION_META[a.type].label.toLowerCase()} it created stays.` : '';
    if (!await confirm(`Remove this margin note?${kept}`)) return;
    setAnnotations((prev) => prev.filter((x) => x.id !== id));
    try { await deleteAnnotation(id); } catch (e: unknown) { toast(messageOf(e) || 'Could not remove that note', 'error'); reloadAnnotations(scriptId); }
  }, [annotations, confirm, scriptId, reloadAnnotations, toast]);

  return { annotations, annotationDraft, setAnnotationDraft, submitAnnotation, removeAnnotation };
}
