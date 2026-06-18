import { supabase } from './client';
import { logActivity } from './activity';

export interface DBCampaign {
  id: string;
  project_id: string;
  title: string;
  platform: string;
  status: string;
  target_reach: string;
  notes: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export async function getCampaigns(projectId: string): Promise<DBCampaign[]> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createCampaign(projectId: string, campaign: { title: string; platform: string; status: string; target_reach?: string }): Promise<DBCampaign> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('campaigns')
    .insert({ project_id: projectId, ...campaign, created_by: user?.id })
    .select()
    .single();
  if (error) throw error;
  if (user) await logActivity(user.id, 'created_campaign', 'project', projectId, { title: campaign.title, platform: campaign.platform });
  return data;
}

export async function updateCampaign(id: string, updates: Partial<Pick<DBCampaign, 'title' | 'platform' | 'status' | 'target_reach' | 'notes'>>): Promise<DBCampaign> {
  const { data, error } = await supabase
    .from('campaigns')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCampaign(id: string): Promise<void> {
  const { error } = await supabase.from('campaigns').delete().eq('id', id);
  if (error) throw error;
}

export function subscribeToCampaigns(projectId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`campaigns:${projectId}:${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns', filter: `project_id=eq.${projectId}` }, callback)
    .subscribe();
}
