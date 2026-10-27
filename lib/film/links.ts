// The link layer's data (supabase/migrations/20261029000000_entities_and_links.sql):
// `entities` is one identity row per scene, character, location, shoot day,
// task, document and media item, written only by triggers; `links` joins two
// of them. RLS decides who reads (the project) and who removes (the creator, or
// someone who shapes the project).

import { supabase } from '@/lib/supabase/client';
import { useLiveRows } from '@/lib/studio/live';
import { MENTION_KIND, diffMentions, mentionedIds } from './mentions';

export const ENTITY_KINDS = ['scene', 'character', 'location', 'shoot_day', 'task', 'document', 'media'] as const;
export type EntityKind = (typeof ENTITY_KINDS)[number];

export type Entity = { id: string; project_id: string; kind: EntityKind; label: string };
export type Link = { id: string; project_id: string; from_entity: string; to_entity: string; kind: string; created_by: string | null; created_at: string };

export async function listEntities(projectId: string): Promise<Entity[]> {
  const { data, error } = await supabase.from('entities').select('id, project_id, kind, label').eq('project_id', projectId);
  if (error) throw new Error(error.message);
  return (data ?? []) as Entity[];
}

export async function listLinks(projectId: string): Promise<Link[]> {
  const { data, error } = await supabase.from('links').select('id, project_id, from_entity, to_entity, kind, created_by, created_at').eq('project_id', projectId);
  if (error) throw new Error(error.message);
  return (data ?? []) as Link[];
}

/** Attach one thing to another. Returns the new link's id, or an error message. */
export async function attach(projectId: string, from: string, to: string, kind = 'about'): Promise<{ id: string } | { error: string }> {
  if (from === to) return { error: 'A thing cannot be linked to itself.' };
  const { data, error } = await supabase.from('links').insert({ project_id: projectId, from_entity: from, to_entity: to, kind }).select('id').single();
  if (error) return { error: error.code === '23505' ? 'They are already linked.' : error.message };
  return { id: data.id };
}

/** Remove a link. Returns an error message, or null. */
export async function detach(linkId: string): Promise<string | null> {
  // RLS filters a delete the caller may not make to zero rows without an error, so ask for the row back.
  const { data, error } = await supabase.from('links').delete().eq('id', linkId).select('id');
  if (error) return error.message;
  if (!data || data.length === 0) return 'Only the person who attached it, or someone who shapes the project, can remove it.';
  return null;
}

/**
 * Make a thing's `mentions` links match the tokens in its text: add the new
 * ones, remove the ones no longer written. Returns an error message, or null.
 */
export async function syncMentions(projectId: string, sourceId: string, text: string): Promise<string | null> {
  const next = mentionedIds(text).filter((id) => id !== sourceId);
  const { data, error } = await supabase.from('links').select('id, to_entity').eq('from_entity', sourceId).eq('kind', MENTION_KIND);
  if (error) return error.message;
  const existing = data ?? [];
  const { add, remove } = diffMentions(existing.map((l) => l.to_entity), next);
  if (add.length) {
    // A link that already exists (made by someone else meanwhile) is skipped, not an error for the rest.
    const { error: insertError } = await supabase.from('links').upsert(
      add.map((to) => ({ project_id: projectId, from_entity: sourceId, to_entity: to, kind: MENTION_KIND })),
      { onConflict: 'from_entity,to_entity,kind', ignoreDuplicates: true },
    );
    if (insertError) return insertError.message;
  }
  if (remove.length) {
    const ids = existing.filter((l) => remove.includes(String(l.to_entity).toLowerCase())).map((l) => l.id);
    const { error: deleteError } = await supabase.from('links').delete().in('id', ids);
    if (deleteError) return deleteError.message;
  }
  return null;
}

export function useEntities(projectId: string | null) {
  return useLiveRows<Entity>({
    scope: projectId, table: 'entities', filter: `project_id=eq.${projectId}`,
    load: () => listEntities(projectId!), keyOf: (x) => String(x.id),
  });
}

export function useLinks(projectId: string | null) {
  return useLiveRows<Link>({
    scope: projectId, table: 'links', filter: `project_id=eq.${projectId}`,
    load: () => listLinks(projectId!), keyOf: (x) => String(x.id),
  });
}
