

import { setCacheItem, getCacheItem } from '@/lib/storage/cache-versioning';
import { supabase } from '@/lib/supabase/client';
import * as DiffLib from 'diff';
import { awaitOSUser } from '@/lib/os';

export const REVISION_COLORS = [
  { name: 'White',     color: '#ffffff', bg: 'rgba(255,255,255,0.05)' },
  { name: 'Blue',      color: '#4da6ff', bg: 'rgba(77,166,255,0.1)' },
  { name: 'Pink',      color: '#ff6b9d', bg: 'rgba(255,107,157,0.1)' },
  { name: 'Yellow',    color: '#ffd43b', bg: 'rgba(255,212,59,0.1)' },
  { name: 'Green',     color: '#51cf66', bg: 'rgba(81,207,102,0.1)' },
  { name: 'Goldenrod', color: '#fab005', bg: 'rgba(250,176,5,0.1)' },
  { name: 'Buff',      color: '#e8b98d', bg: 'rgba(232,185,141,0.1)' },
  { name: 'Salmon',    color: '#ff8787', bg: 'rgba(255,135,135,0.1)' },
  { name: 'Cherry',    color: '#e03131', bg: 'rgba(224,49,49,0.1)' },
] as const;

export type RevisionColorName = typeof REVISION_COLORS[number]['name'];

export interface Revision {
  id: string;
  colorIndex: number;
  date: string;
  label: string;
  snapshot: string;
}

export interface RevisionMark {
  lineIndex: number;
  revisionId: string;
  type: 'added' | 'modified' | 'deleted';
}

const REVISIONS_KEY = 'scriptos_revisions';

export async function getRevisions(scriptId: string): Promise<Revision[]> {
  if (typeof window === 'undefined') return [];
  try {
    const data = await getCacheItem(`${REVISIONS_KEY}_${scriptId}`, 'revisions');
    if (Array.isArray(data)) return data;
    return [];
  } catch { return []; }
}

export async function saveRevision(scriptId: string, revision: Revision): Promise<{ success: boolean; error?: string }> {
  try {
    const revisions = await getRevisions(scriptId);
    revisions.push(revision);

    try {
      await setCacheItem(`${REVISIONS_KEY}_${scriptId}`, revisions);
      return { success: true };
    } catch (e: any) {
      if (e.name === 'QuotaExceededError') {
        const limited = revisions.slice(-10);
        await setCacheItem(`${REVISIONS_KEY}_${scriptId}`, limited);
        return {
          success: false,
          error: 'Revision storage quota exceeded. Kept only the 10 most recent revisions.'
        };
      }
      throw e;
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to save revision'
    };
  }
}

// ── Supabase-backed persistence ─────────────────────────────────────────────

export async function fetchRevisionsDB(scriptId: string): Promise<Revision[]> {
  if (!scriptId) return [];
  const { data, error } = await supabase
    .from('script_revisions')
    .select('id,color_index,label,snapshot,created_at')
    .eq('script_id', scriptId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return data.map((r: any) => ({ id: r.id, colorIndex: r.color_index, date: r.created_at, label: r.label, snapshot: r.snapshot }));
}

export async function createRevisionDB(scriptId: string, content: string, existingCount: number, label?: string): Promise<Revision | null> {
  const colorIndex = existingCount % REVISION_COLORS.length;
  const user = await awaitOSUser();
  const { data, error } = await supabase
    .from('script_revisions')
    .insert({ script_id: scriptId, color_index: colorIndex, label: label || `${REVISION_COLORS[colorIndex].name} Revision`, snapshot: content, created_by: user?.id })
    .select('id,color_index,label,snapshot,created_at')
    .single();
  if (error || !data) return null;
  return { id: data.id, colorIndex: data.color_index, date: data.created_at, label: data.label, snapshot: data.snapshot };
}

export async function deleteRevisionDB(id: string): Promise<void> {
  await supabase.from('script_revisions').delete().eq('id', id);
}

export async function createRevision(scriptId: string, content: string, label?: string): Promise<{ revision: Revision; result: { success: boolean; error?: string } }> {
  const revisions = await getRevisions(scriptId);
  const colorIndex = revisions.length % REVISION_COLORS.length;
  const revision: Revision = {
    id: `rev-${Date.now()}`,
    colorIndex,
    date: new Date().toISOString(),
    label: label || `${REVISION_COLORS[colorIndex].name} Revision`,
    snapshot: content,
  };
  const result = await saveRevision(scriptId, revision);
  return { revision, result };
}

export function diffSnapshots(oldText: string, newText: string): RevisionMark[] {
  const changes = DiffLib.diffLines(oldText, newText);
  const marks: RevisionMark[] = [];
  let lineIndex = 0;

  for (const change of changes) {
    const lineCount = change.value.split('\n').filter((_, i, arr) =>

      i < arr.length - 1 || change.value.endsWith('\n') ? true : change.value !== ''
    ).length;

    if (change.added) {
      for (let i = 0; i < lineCount; i++) {
        marks.push({ lineIndex: lineIndex + i, revisionId: '', type: 'added' });
      }
      lineIndex += lineCount;
    } else if (change.removed) {
      for (let i = 0; i < lineCount; i++) {
        marks.push({ lineIndex: lineIndex + i, revisionId: '', type: 'deleted' });
      }

    } else {
      lineIndex += lineCount;
    }
  }

  return marks;
}
