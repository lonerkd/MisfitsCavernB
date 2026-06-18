// ============================================================================
// SCRIPTOS REVISION TRACKING SYSTEM
// Industry-standard colored revision pages (Final Draft workflow)
// Backed by Supabase (script_revisions table) — real, persisted, durable
// across devices, replacing the old localStorage-only history.
// ============================================================================

import { getScriptRevisions, createScriptRevision, type DBScriptRevision } from '@/lib/supabase/scriptRevisions';

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
  snapshot: string; // content at time of lock
}

export interface RevisionMark {
  lineIndex: number;
  revisionId: string;
  type: 'added' | 'modified' | 'deleted';
}

function mapRow(r: DBScriptRevision): Revision {
  return {
    id: r.id,
    colorIndex: r.color_index,
    date: r.created_at,
    label: r.label,
    snapshot: r.snapshot,
  };
}

export async function getRevisions(scriptId: string): Promise<Revision[]> {
  if (!scriptId || scriptId === 'demo') return [];
  try {
    const rows = await getScriptRevisions(scriptId);
    return rows.map(mapRow);
  } catch (error) {
    console.error('Error loading revisions:', error);
    return [];
  }
}

export async function createRevision(scriptId: string, content: string, label?: string): Promise<Revision | null> {
  try {
    const existing = await getRevisions(scriptId);
    const colorIndex = existing.length % REVISION_COLORS.length;
    const finalLabel = label || `${REVISION_COLORS[colorIndex].name} Revision`;
    const row = await createScriptRevision(scriptId, colorIndex, finalLabel, content);
    return mapRow(row);
  } catch (error) {
    console.error('Error creating revision:', error);
    return null;
  }
}

// Compare two text snapshots and return changed line indices
export function diffSnapshots(oldText: string, newText: string): RevisionMark[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const marks: RevisionMark[] = [];
  const maxLen = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLen; i++) {
    if (i >= oldLines.length) {
      marks.push({ lineIndex: i, revisionId: '', type: 'added' });
    } else if (i >= newLines.length) {
      marks.push({ lineIndex: i, revisionId: '', type: 'deleted' });
    } else if (oldLines[i] !== newLines[i]) {
      marks.push({ lineIndex: i, revisionId: '', type: 'modified' });
    }
  }

  return marks;
}
