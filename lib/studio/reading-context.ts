// The reading context for a script, loaded once for the surfaces that read a script outside the editor and the Studio's own
// sync (a performer's sides, the supervisor's lined script, the characters of the Cast tab, ...). Those used to parse with
// no context at all, so a cast name or a "not a character" verdict a person had set was honoured in the editor and ignored
// there. This reads the same project data the editor and the Studio read (the cast, the verdicts, the places, the script's
// line overrides, its latest locked revision as the previous draft), under the caller's own access (RLS), and keeps it for a
// short while so several surfaces opening one script share one load. A writer's private reading memory is left out on
// purpose: these surfaces feed shared rows and shared screens, and must read as the Studio does.

import { supabase } from '@/lib/supabase/client';
import type { ParseContext } from '@/lib/scriptos/parser';
import { studio } from './index';
import { readingContextLoads as loads, forgetReadingContext } from './reading-cache';

export { forgetReadingContext };

const TTL_MS = 30_000;

/** The script's latest locked revision text, or null (none, or none this person can open). Only the newest row is fetched. */
export async function fetchLatestRevisionSnapshot(scriptId: string): Promise<string | null> {
  const { data, error } = await supabase.from('script_revisions').select('snapshot').eq('script_id', scriptId).order('created_at', { ascending: false }).limit(1);
  if (error || !data?.length) return null;
  return data[0].snapshot ?? null;
}

async function load(scriptId: string): Promise<ParseContext> {
  const { data: script, error } = await supabase.from('scripts').select('project_id, format').eq('id', scriptId).single();
  if (error || !script?.project_id) throw new Error('script not readable'); // loadReadingContext reads with no context and does not remember it
  const projectId = script.project_id;
  // Each part of the context is optional: a failed read leaves that part out rather than the surface without its script.
  const [castings, corrections, overrides, places, snapshot] = await Promise.all([
    supabase.from('character_castings').select('character_name').eq('project_id', projectId).then((r) => r.data ?? []),
    studio.listReadingCorrections(projectId).catch(() => []),
    studio.listLineOverrides(scriptId).catch(() => []),
    studio.listLocations(projectId).catch(() => []),
    fetchLatestRevisionSnapshot(scriptId).catch(() => null),
  ]);
  // The parser is large: pulled in when a context is first built, not with the page.
  const [{ contextFromProject }, { withPreviousDraft }] = await Promise.all([import('@/lib/scriptos/context'), import('@/lib/scriptos/reading-context')]);
  const base = contextFromProject(castings, corrections, undefined, overrides, places.map((p) => ({ name: p.name })));
  return withPreviousDraft(base, snapshot, script.format ?? null);
}

/** What a reader needs to read this script as the editor does. Never rejects: a failed load reads with no context, as before. */
export function loadReadingContext(scriptId: string): Promise<ParseContext> {
  const hit = loads.get(scriptId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.promise;
  // A failed load reads with no context this once, but is not remembered: the next surface to ask tries again.
  const promise = load(scriptId).catch(() => { loads.delete(scriptId); return {} as ParseContext; });
  loads.set(scriptId, { at: Date.now(), promise });
  return promise;
}
