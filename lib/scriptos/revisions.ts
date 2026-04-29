// ============================================================================
// SCRIPTOS REVISION TRACKING SYSTEM
// Industry-standard colored revision pages (Final Draft workflow)
// ============================================================================

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

const REVISIONS_KEY = 'scriptos_revisions';

export function getRevisions(scriptId: string): Revision[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(`${REVISIONS_KEY}_${scriptId}`);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

export function saveRevision(scriptId: string, revision: Revision): void {
  const revisions = getRevisions(scriptId);
  revisions.push(revision);
  localStorage.setItem(`${REVISIONS_KEY}_${scriptId}`, JSON.stringify(revisions));
}

export function createRevision(scriptId: string, content: string, label?: string): Revision {
  const revisions = getRevisions(scriptId);
  const colorIndex = revisions.length % REVISION_COLORS.length;
  const revision: Revision = {
    id: `rev-${Date.now()}`,
    colorIndex,
    date: new Date().toISOString(),
    label: label || `${REVISION_COLORS[colorIndex].name} Revision`,
    snapshot: content,
  };
  saveRevision(scriptId, revision);
  return revision;
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
