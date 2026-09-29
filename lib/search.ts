// Suite-wide search (public.search_suite): what each kind of result is called
// and where it opens. Pure except for `searchSuite`, which asks the database
// with the caller's rights.

import { supabase } from '@/lib/supabase/client';

export type HitKind = 'project' | 'script' | 'scene' | 'character' | 'media' | 'location' | 'document' | 'task' | 'note' | 'job' | 'person';

export interface SearchHit {
  kind: HitKind;
  id: string;
  project_id: string | null;
  title: string;
  detail: string | null;
  rank: number;
}

export const HIT_KINDS: Record<HitKind, { label: string; group: string }> = {
  project: { label: 'Project', group: 'Projects' },
  script: { label: 'Script', group: 'Scripts' },
  scene: { label: 'Scene', group: 'Scenes' },
  character: { label: 'Character', group: 'Characters' },
  media: { label: 'Library', group: 'Library' },
  location: { label: 'Location', group: 'Locations' },
  document: { label: 'Paperwork', group: 'Paperwork' },
  task: { label: 'Task', group: 'Tasks' },
  note: { label: 'Cut note', group: 'Cut notes' },
  job: { label: 'Job', group: 'Jobs' },
  person: { label: 'Person', group: 'People' },
};

/**
 * Where a result opens. Studio views work on the active project, so for
 * those the caller makes `project_id` active first (`needsProject`).
 */
export function hitTarget(hit: Pick<SearchHit, 'kind' | 'id' | 'project_id'>): { href: string; needsProject: boolean } {
  switch (hit.kind) {
    case 'project': return { href: `/projects/${hit.id}`, needsProject: false };
    case 'script': return { href: `/editor?script=${hit.id}`, needsProject: false };
    case 'task': return { href: `/projects/${hit.project_id}#production`, needsProject: false };
    case 'job': return { href: '/jobs', needsProject: false };
    case 'person': return { href: `/crew/${hit.id}`, needsProject: false };
    case 'scene': return { href: '/studio?tab=scenes', needsProject: true };
    case 'character': return { href: '/studio?tab=production&view=crew', needsProject: true };
    case 'media': return { href: '/studio?tab=library', needsProject: true };
    case 'location': return { href: '/studio?tab=production&view=locations', needsProject: true };
    case 'document': return { href: '/studio?tab=production&view=paperwork', needsProject: true };
    case 'note': return { href: '/studio?tab=post', needsProject: true };
  }
}

/** Worth asking the database: at least two letters or digits. */
export const searchable = (q: string) => q.replace(/[^\p{L}\p{N}]+/gu, '').length >= 2;

export async function searchSuite(q: string, limit = 30): Promise<SearchHit[]> {
  if (!searchable(q)) return [];
  const { data, error } = await supabase.rpc('search_suite', { p_query: q, p_limit: limit });
  if (error) throw new Error(error.message);
  return (data ?? []) as SearchHit[];
}
