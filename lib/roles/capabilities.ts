'use client';

// What a person's role lets them do on a project (public.capabilities and friends), read and changed through here.
// The database is the authority; `my_capabilities` is its answer for the signed-in person.

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/supabase/activity';
import { logAuditAction } from '@/lib/supabase/audit';

import { templatesFrom, type CapabilityDef, type Templates } from './core';

export * from './core';

export interface CapabilityCatalog { defs: CapabilityDef[]; templates: Templates }

let catalogCache: Promise<CapabilityCatalog> | null = null;

/** The capability list and each craft's template: reference data, fetched once per page load. */
export function loadCapabilityCatalog(force = false): Promise<CapabilityCatalog> {
  if (!catalogCache || force) {
    catalogCache = (async () => {
      const [defs, tpl] = await Promise.all([
        supabase.from('capabilities').select('key, label, area, edits').order('area').order('key'),
        supabase.from('craft_capabilities').select('craft, capability'),
      ]);
      if (defs.error || tpl.error) { catalogCache = null; throw new Error((defs.error ?? tpl.error)?.message || 'Could not load what roles can do'); }
      return { defs: defs.data, templates: templatesFrom(tpl.data) };
    })();
  }
  return catalogCache;
}

/** The signed-in person's capabilities on a project. */
export async function getMyCapabilities(projectId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('my_capabilities', { pid: projectId });
  if (error) throw new Error(error.message || 'Could not read what you can do here');
  return data ?? [];
}

/** `can('budget.write')` for the signed-in person on a project; false until it has loaded. */
export function useMyCapabilities(projectId: string | null | undefined): { can: (key: string) => boolean; caps: ReadonlySet<string>; loading: boolean } {
  const [caps, setCaps] = useState<ReadonlySet<string>>(new Set());
  const [loading, setLoading] = useState(!!projectId);
  useEffect(() => {
    if (!projectId) { queueMicrotask(() => { setCaps(new Set()); setLoading(false); }); return; }
    let alive = true;
    queueMicrotask(() => setLoading(true));
    getMyCapabilities(projectId).then((c) => { if (alive) setCaps(new Set(c)); }).catch(() => { if (alive) setCaps(new Set()); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [projectId]);
  return useMemo(() => ({ caps, loading, can: (key: string) => caps.has(key) }), [caps, loading]);
}

export interface CrewRightsRows {
  /** user id → the other crafts they hold on this project. */
  extraCrafts: Record<string, string[]>;
  /** user id → capability → the owner's override. */
  overrides: Record<string, Record<string, boolean>>;
}

/** The extra crafts and the owner's overrides for a project's crew (people on the project read crafts; only the owner and the person read overrides). */
export async function loadCrewRights(projectId: string): Promise<CrewRightsRows> {
  const [crafts, overrides] = await Promise.all([
    supabase.from('project_crew_crafts').select('user_id, craft').eq('project_id', projectId),
    supabase.from('crew_capability_overrides').select('user_id, capability, granted').eq('project_id', projectId),
  ]);
  if (crafts.error || overrides.error) throw new Error((crafts.error ?? overrides.error)?.message || 'Could not load the crew’s rights');
  const out: CrewRightsRows = { extraCrafts: {}, overrides: {} };
  for (const r of crafts.data) (out.extraCrafts[r.user_id] ??= []).push(r.craft);
  for (const r of overrides.data) (out.overrides[r.user_id] ??= {})[r.capability] = r.granted;
  return out;
}

/** Gives someone another craft on the project (the owner only: the database says so). */
export async function addCrewCraft(projectId: string, userId: string, craft: string, currentUserId: string): Promise<void> {
  const { error } = await supabase.from('project_crew_crafts').insert({ project_id: projectId, user_id: userId, craft });
  if (error) throw new Error(error.code === '23505' ? 'They already have that craft.' : error.message || 'Could not add the craft');
  void logActivity(`gave a crew member another craft: ${craft}`, 'project', projectId);
  await logAuditAction(currentUserId, 'crew_role_changed', 'project_crew', `${projectId}:${userId}`, { craft, action: 'craft_added' });
}

export async function removeCrewCraft(projectId: string, userId: string, craft: string, currentUserId: string): Promise<void> {
  const { data, error } = await supabase.from('project_crew_crafts').delete().eq('project_id', projectId).eq('user_id', userId).eq('craft', craft).select('craft');
  if (error) throw new Error(error.message || 'Could not remove the craft');
  if (!data?.length) throw new Error('You cannot change this person’s crafts.');
  void logActivity(`removed a craft from a crew member: ${craft}`, 'project', projectId);
  await logAuditAction(currentUserId, 'crew_role_changed', 'project_crew', `${projectId}:${userId}`, { craft, action: 'craft_removed' });
}

/**
 * Sets one person's capability on this project: `true` grants, `false` takes away, `null` goes back to what their
 * crafts give. The owner only (the database says so).
 */
export async function setCapabilityOverride(projectId: string, userId: string, capability: string, granted: boolean | null, currentUserId: string): Promise<void> {
  if (granted === null) {
    const { error } = await supabase.from('crew_capability_overrides').delete().eq('project_id', projectId).eq('user_id', userId).eq('capability', capability);
    if (error) throw new Error(error.message || 'Could not change what they can do');
  } else {
    const { data, error } = await supabase.from('crew_capability_overrides')
      .upsert({ project_id: projectId, user_id: userId, capability, granted }, { onConflict: 'project_id,user_id,capability' }).select('capability');
    if (error) throw new Error(error.message || 'Could not change what they can do');
    if (!data?.length) throw new Error('You cannot change what this person can do.');
  }
  void logActivity(`changed what a crew member can do (${capability})`, 'project', projectId);
  await logAuditAction(currentUserId, 'crew_role_changed', 'project_crew', `${projectId}:${userId}`, { capability, granted, action: 'capability_override' });
}
