// The hub's Status page: incidents (hub_posts of kind 'incident') and their
// running updates (hub_incident_updates). RLS decides who reads and writes
// (supabase/migrations/20261026000000_hub_status.sql).

import { supabase } from '@/lib/supabase/client';
import { isPublished, type HubPost, type Severity } from './posts';

export interface IncidentUpdate {
  id: string;
  post_id: string;
  body: string;
  created_at: string;
}

export const SEVERITY_LABEL: Record<Severity, string> = { minor: 'Minor', major: 'Major', critical: 'Critical' };
const RANK: Record<Severity, number> = { minor: 1, major: 2, critical: 3 };

export const isOpen = (p: Pick<HubPost, 'kind' | 'resolved_at' | 'published_at'>, now = Date.now()) =>
  p.kind === 'incident' && p.resolved_at === null && isPublished(p, now);

/** Open incidents first (most severe, then newest), then resolved ones, newest first. */
export function sortIncidents(posts: HubPost[], now = Date.now()): HubPost[] {
  const at = (p: HubPost) => Date.parse(p.published_at ?? p.updated_at) || 0;
  return posts
    .filter((p) => p.kind === 'incident')
    .sort((a, b) =>
      Number(isOpen(b, now)) - Number(isOpen(a, now))
      || (isOpen(a, now) ? RANK[b.severity ?? 'minor'] - RANK[a.severity ?? 'minor'] : 0)
      || at(b) - at(a));
}

/** The one incident the banner shows: the most severe open one, or null. */
export function bannerIncident(posts: HubPost[], now = Date.now()): HubPost | null {
  return sortIncidents(posts, now).find((p) => isOpen(p, now)) ?? null;
}

export async function listOpenIncidents(): Promise<HubPost[]> {
  const { data, error } = await supabase
    .from('hub_posts')
    .select('id, kind, audience, title, body, cover_url, important, pinned, published_at, severity, resolved_at, created_at, updated_at')
    .eq('kind', 'incident')
    .is('resolved_at', null)
    .not('published_at', 'is', null)
    .lte('published_at', new Date().toISOString());
  if (error) throw new Error(error.message);
  return sortIncidents((data ?? []) as HubPost[]);
}

export async function listUpdates(postIds: string[]): Promise<IncidentUpdate[]> {
  if (!postIds.length) return [];
  const { data, error } = await supabase
    .from('hub_incident_updates')
    .select('id, post_id, body, created_at')
    .in('post_id', postIds)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as IncidentUpdate[];
}

/** Admin: add an update to an incident. Returns an error message, or null. */
export async function addUpdate(postId: string, body: string): Promise<string | null> {
  const text = body.trim();
  if (!text) return 'Write the update first.';
  if (text.length > 2000) return 'Keep an update under 2,000 characters.';
  const { error } = await supabase.from('hub_incident_updates').insert({ post_id: postId, body: text });
  return error ? error.message : null;
}

/** Admin: mark an incident resolved, or open it again. Returns an error message, or null. */
export async function setResolved(postId: string, resolved: boolean): Promise<string | null> {
  const { error } = await supabase.from('hub_posts').update({ resolved_at: resolved ? new Date().toISOString() : null }).eq('id', postId);
  return error ? error.message : null;
}
