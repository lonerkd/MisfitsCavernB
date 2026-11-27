'use client';

// What a person's role lets them do on a project (public.capabilities and friends), read and changed through here.
// The database is the authority; `my_capabilities` is its answer for the signed-in person.

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useViewAs, useViewAsRole } from '@/lib/os/viewAs';
import { logActivity } from '@/lib/supabase/activity';
import { logAuditAction } from '@/lib/supabase/audit';

import { describeRole, resolveCapabilities, templatesFrom, type CapabilityDef, type CrewTier, type Templates } from './core';

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

/**
 * `can('budget.write')` for the signed-in person on a project; false until it has loaded. While the owner previews the project
 * as a role (View as › Crew), it answers for that role instead, so every screen that follows a person's capabilities shows
 * what that role would see. The database still treats the owner as the owner: only the interface is previewed.
 */
export function useMyCapabilities(projectId: string | null | undefined): { can: (key: string) => boolean; caps: ReadonlySet<string>; loading: boolean; error: boolean } {
  const [caps, setCaps] = useState<ReadonlySet<string>>(new Set());
  const [loading, setLoading] = useState(!!projectId);
  // A failed read is not "holds nothing": error says the answer never arrived, so a surface can say
  // it could not check instead of refusing the person as if the database had.
  const [error, setError] = useState(false);
  const previewing = useViewAs(projectId) === 'crew';
  const role = useViewAsRole(projectId);
  const [catalog, setCatalog] = useState<CapabilityCatalog | null>(null);
  useEffect(() => {
    if (!previewing) return;
    let alive = true;
    loadCapabilityCatalog().then((c) => { if (alive) setCatalog(c); }).catch(() => { if (alive) setCatalog(null); });
    return () => { alive = false; };
  }, [previewing]);
  useEffect(() => {
    if (!projectId) { queueMicrotask(() => { setCaps(new Set()); setLoading(false); setError(false); }); return; }
    let alive = true;
    queueMicrotask(() => { setLoading(true); setError(false); });
    getMyCapabilities(projectId).then((c) => { if (alive) setCaps(new Set(c)); }).catch(() => { if (alive) { setCaps(new Set()); setError(true); } }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [projectId]);
  return useMemo(() => {
    if (previewing) {
      const held = catalog ? resolveCapabilities(catalog.defs, { tier: role.tier, crafts: role.craft ? [role.craft] : [], overrides: {} }, catalog.templates) : new Set<string>();
      return { caps: held, loading: !catalog, error: false, can: (key: string) => held.has(key) };
    }
    return { caps, loading, error, can: (key: string) => caps.has(key) };
  }, [previewing, role, catalog, caps, loading, error]);
}

/**
 * The signed-in person's craft and access on a project (null for the project's owner, who has no crew row), or the role the
 * owner is previewing as. Used to put a role's own tools first.
 */
export function useMyRole(projectId: string | null | undefined, userId: string | null | undefined): { craft: string | null; tier: CrewTier | null; previewing: boolean; loading: boolean } {
  const [row, setRow] = useState<{ craft: string | null; tier: CrewTier } | null>(null);
  const [loading, setLoading] = useState(!!projectId && !!userId);
  const previewing = useViewAs(projectId) === 'crew';
  const role = useViewAsRole(projectId);
  useEffect(() => {
    if (!projectId || !userId) { queueMicrotask(() => { setRow(null); setLoading(false); }); return; }
    let alive = true;
    queueMicrotask(() => setLoading(true));
    supabase.from('project_crew').select('role, craft').eq('project_id', projectId).eq('user_id', userId).eq('status', 'confirmed').maybeSingle()
      .then(({ data }) => { if (alive) setRow(data ? { craft: data.craft, tier: data.role as CrewTier } : null); }, () => { if (alive) setRow(null); })
      .then(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [projectId, userId]);
  if (previewing) return { craft: role.craft, tier: role.tier, previewing: true, loading: false };
  return { craft: row?.craft ?? null, tier: row?.tier ?? null, previewing: false, loading };
}

/**
 * In plain words, what someone in this craft at this access could do on a project: for the owner about to invite them and for
 * the person invited (who is not on the project yet, so the database cannot answer for them). Null until the catalogue loads.
 */
export function useRoleSentence(craft: string | null, tier: CrewTier): string | null {
  const [catalog, setCatalog] = useState<CapabilityCatalog | null>(null);
  useEffect(() => {
    let alive = true;
    loadCapabilityCatalog().then((c) => { if (alive) setCatalog(c); }).catch(() => { if (alive) setCatalog(null); });
    return () => { alive = false; };
  }, []);
  return useMemo(() => {
    if (!catalog) return null;
    const held = resolveCapabilities(catalog.defs, { tier, crafts: craft ? [craft] : [], overrides: {} }, catalog.templates);
    return describeRole({ craft, tier, held, defs: catalog.defs }).text;
  }, [catalog, craft, tier]);
}

/** Ask the project's owner for a permission your role does not hold. Grants nothing: only the owner changes a person's rights. */
export async function requestCapability(projectId: string, capability: string): Promise<void> {
  const { error } = await supabase.rpc('request_capability', { p_project: projectId, p_capability: capability });
  if (error) throw new Error(error.message || 'Could not ask the owner');
}

/** The catalogue's name for a permission ("See the budget"), or null until it has loaded. */
export function useCapabilityLabel(key: string): string | null {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    loadCapabilityCatalog().then((c) => { if (alive) setLabel(c.defs.find((d) => d.key === key)?.label ?? null); }).catch(() => { if (alive) setLabel(null); });
    return () => { alive = false; };
  }, [key]);
  return label;
}

export interface MyRole { project_id: string; craft: string | null; tier: CrewTier; held: string[] }

/** The signed-in person's confirmed crew roles on the given projects, each with what the database says they can do there. */
export async function getMyRoles(userId: string, projectIds: string[]): Promise<MyRole[]> {
  if (!projectIds.length) return [];
  const { data, error } = await supabase.from('project_crew').select('project_id, role, craft')
    .eq('user_id', userId).eq('status', 'confirmed').in('project_id', projectIds);
  if (error) throw new Error(error.message || 'Could not read your roles');
  return Promise.all((data ?? []).map(async (r) => ({
    project_id: r.project_id,
    craft: r.craft,
    tier: (r.role as CrewTier),
    held: await getMyCapabilities(r.project_id).catch(() => [] as string[]),
  })));
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
