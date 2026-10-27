import { supabase } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/database.types';

export type Deliverable = Tables<'deliverables'>;
export type AdReference = Tables<'ad_references'>;
export type StoredBrandRule = Tables<'brand_rules'>;
export type DeliverablePatch = Partial<Pick<Deliverable, 'kind' | 'max_chars' | 'max_seconds' | 'words_per_second' | 'notes'>>;

export async function listDeliverables(projectId: string): Promise<Deliverable[]> {
  const { data, error } = await supabase.from('deliverables').select('*').eq('project_id', projectId).order('title');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function updateDeliverable(scriptId: string, patch: DeliverablePatch): Promise<string | null> {
  const { error } = await supabase.from('deliverables').update(patch).eq('script_id', scriptId);
  return error?.message ?? null;
}

export async function listAdReferences(projectId: string): Promise<AdReference[]> {
  const { data, error } = await supabase.from('ad_references').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function addAdReference(reference: Pick<AdReference, 'project_id' | 'kind' | 'title' | 'content'>): Promise<string | null> {
  const { error } = await supabase.from('ad_references').insert(reference);
  return error?.message ?? null;
}

export async function approveAdReference(id: string): Promise<string | null> {
  const { error } = await supabase.from('ad_references').update({ status: 'approved' }).eq('id', id);
  return error?.message ?? null;
}

export async function deleteAdReference(id: string): Promise<string | null> {
  const { data, error } = await supabase.from('ad_references').delete().eq('id', id).select('id');
  if (error) return error.message;
  return data.length ? null : 'Only a draft reference can be removed.';
}

export async function listBrandRules(projectId: string): Promise<StoredBrandRule[]> {
  const { data, error } = await supabase.from('brand_rules').select('*').eq('project_id', projectId).order('created_at');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function addBrandRule(rule: Pick<StoredBrandRule, 'project_id' | 'kind' | 'text' | 'severity'>): Promise<string | null> {
  const { error } = await supabase.from('brand_rules').insert(rule);
  return error?.message ?? null;
}

export async function deleteBrandRule(id: string): Promise<string | null> {
  const { data, error } = await supabase.from('brand_rules').delete().eq('id', id).select('id');
  if (error) return error.message;
  return data.length ? null : 'Only the project owner can remove this rule.';
}

export async function listReferenceLinks(scriptId: string): Promise<Array<{ id: string; to_entity: string }>> {
  const { data, error } = await supabase.from('links').select('id, to_entity')
    .eq('from_entity', scriptId).eq('kind', 'reference');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function setReferenceLink(projectId: string, scriptId: string, referenceId: string, linked: boolean): Promise<string | null> {
  if (linked) {
    const { error } = await supabase.from('links').upsert(
      { project_id: projectId, from_entity: scriptId, to_entity: referenceId, kind: 'reference' },
      { onConflict: 'from_entity,to_entity,kind', ignoreDuplicates: true },
    );
    return error?.message ?? null;
  }
  const { data, error } = await supabase.from('links').delete()
    .eq('from_entity', scriptId).eq('to_entity', referenceId).eq('kind', 'reference').select('id');
  if (error) return error.message;
  return data.length ? null : 'Could not remove this reference link.';
}
