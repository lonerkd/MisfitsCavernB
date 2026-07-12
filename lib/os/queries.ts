import { supabase } from '@/lib/supabase/client';
import type { Project } from './types';

export async function fetchProjectDetails(projectId: string): Promise<Project | null> {
  const [projectRes, budgetRes, timelineRes, crewRes, beatsRes, conceptRes, scenesRes, campaignsRes] = await Promise.all([
    supabase.from('projects').select('*').eq('id', projectId).single(),
    supabase.from('budget_items').select('*').eq('project_id', projectId),
    supabase.from('timeline_items').select('*').eq('project_id', projectId),
    supabase.from('project_crew').select('*, profiles!project_crew_user_id_fkey(username, avatar_url)').eq('project_id', projectId),
    supabase.from('project_beats').select('*').eq('project_id', projectId).order('created_at'),
    supabase.from('concept_assets').select('*').eq('project_id', projectId).order('created_at'),
    supabase.from('scenes').select('*').eq('project_id', projectId).order('scene_number'),
    supabase.from('campaigns').select('*').eq('project_id', projectId).order('created_at'),
  ]);

  if (!projectRes.data) return null;
  return {
    ...projectRes.data,
    budget_items: budgetRes.data || [],
    timeline_items: timelineRes.data || [],
    crew: (crewRes.data || []).map((c: any) => ({
      id: c.id,
      name: c.profiles?.username || 'Unknown',
      role: c.role,
      avatar: c.profiles?.avatar_url || null,
      status: 'confirmed',
    })),
    beats: beatsRes.data || [],
    concept_assets: conceptRes.data || [],
    scenes: scenesRes.data || [],
    campaigns: campaignsRes.data || [],
  } as unknown as Project;
}
