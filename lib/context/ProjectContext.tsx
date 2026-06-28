'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Beat {
  id: string;
  title: string;
  content: string;
  color?: string;
}

export interface ConceptAsset {
  id: string;
  title?: string;
  image_url: string;
}

export interface Scene {
  id: string;
  scene_number: number;
  title: string;
  time_of_day: string;
  location?: string;
  cast_list?: string;
  est_duration?: string;
  shoot_day: number;
}

export interface Campaign {
  id: string;
  title: string;
  platform: string;
  status: string;
  reach_target?: string;
}

export interface CrewMember {
  id: string;
  user_id?: string;
  name: string;
  role: string;
  avatar?: string;
  status?: string;
}

export interface BudgetItem {
  id: string;
  category: string;
  description: string;
  amount: number;
  actual_cost?: number;
}

export interface TimelineItem {
  id: string;
  phase: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  completion: number;
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  status: string;
  accent_color?: string;
  type?: string;
  beats?: Beat[];
  crew?: CrewMember[];
  budget_items?: BudgetItem[];
  timeline_items?: TimelineItem[];
  concept_assets?: ConceptAsset[];
  scenes?: Scene[];
  campaigns?: Campaign[];
}

interface ProjectContextType {
  activeProject: Project | null;
  setActiveProject: (project: Project | null) => void;
  projects: Project[];
  loading: boolean;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  refreshProject: (id: string) => Promise<void>;
  addCrewMember: (projectId: string, username: string, role: string) => Promise<{ error?: string }>;
  removeCrewMember: (projectId: string, crewId: string) => Promise<void>;
  addTimelineItem: (item: Omit<TimelineItem, 'id'> & { project_id: string }) => Promise<void>;
  updateTimelineItem: (id: string, projectId: string, updates: Partial<TimelineItem>) => Promise<void>;
  removeTimelineItem: (id: string, projectId: string) => Promise<void>;
  addBeat: (beat: Omit<Beat, 'id'> & { project_id: string }) => Promise<void>;
  removeBeat: (id: string, projectId: string) => Promise<void>;
  addConceptAsset: (asset: Omit<ConceptAsset, 'id'> & { project_id: string; created_by?: string }) => Promise<void>;
  removeConceptAsset: (id: string, projectId: string) => Promise<void>;
  addScene: (scene: Omit<Scene, 'id'> & { project_id: string }) => Promise<void>;
  removeScene: (id: string, projectId: string) => Promise<void>;
  addCampaign: (campaign: Omit<Campaign, 'id'> & { project_id: string; created_by?: string }) => Promise<void>;
  updateCampaign: (id: string, projectId: string, updates: Partial<Campaign>) => Promise<void>;
  removeCampaign: (id: string, projectId: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjectDetails = async (projectId: string) => {
    const [projectRes, budgetRes, timelineRes, crewRes, beatsRes, conceptRes, scenesRes, campaignsRes] = await Promise.all([
      supabase.from('projects').select('*').eq('id', projectId).single(),
      supabase.from('budget_items').select('*').eq('project_id', projectId),
      supabase.from('timeline_items').select('*').eq('project_id', projectId),
      supabase.from('project_crew').select('*, profiles(username, avatar_url)').eq('project_id', projectId),
      supabase.from('beats').select('*').eq('project_id', projectId).order('position'),
      supabase.from('concept_assets').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('scenes').select('*').eq('project_id', projectId).order('scene_number'),
      supabase.from('campaigns').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    ]);

    if (projectRes.data) {
      const p = projectRes.data;
      return {
        ...p,
        budget_items: budgetRes.data || [],
        timeline_items: timelineRes.data || [],
        beats: beatsRes.data || [],
        concept_assets: conceptRes.data || [],
        scenes: scenesRes.data || [],
        campaigns: campaignsRes.data || [],
        crew: (crewRes.data || []).map((c: any) => ({
          id: c.id,
          user_id: c.user_id,
          name: c.profiles?.username || 'Unknown',
          role: c.role,
          avatar: c.profiles?.avatar_url,
          status: 'confirmed'
        }))
      };
    }
    return null;
  };

  const refreshProject = useCallback(async (id: string) => {
    const fullProject = await fetchProjectDetails(id);
    if (fullProject) {
      setActiveProject(fullProject);
      setProjects(prev => prev.map(p => p.id === id ? fullProject : p));
    }
  }, []);

  useEffect(() => {
    let projectSubscription: RealtimeChannel;

    async function loadProjects() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!error && data) {
        setProjects(data);
        if (data.length > 0 && !activeProject) {
          const full = await fetchProjectDetails(data[0].id);
          setActiveProject(full || data[0]);
        }
      }
      setLoading(false);

      // Realtime Sync
      projectSubscription = supabase
        .channel('project-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Project;
            setProjects(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
            if (activeProject?.id === updated.id) {
              setActiveProject(prev => prev ? { ...prev, ...updated } : null);
            }
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'budget_items' }, (payload) => {
          const item = (payload.new || payload.old) as any;
          if (activeProject?.id === item.project_id) {
            refreshProject(item.project_id);
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'timeline_items' }, (payload) => {
          const item = (payload.new || payload.old) as any;
          if (activeProject?.id === item.project_id) {
            refreshProject(item.project_id);
          }
        })
        .subscribe();
    }

    loadProjects();

    return () => {
      if (projectSubscription) projectSubscription.unsubscribe();
    };
  }, [activeProject?.id, refreshProject]);

  const updateProject = async (id: string, updates: Partial<Project>) => {
    const { error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id);

    if (error) console.error('Error updating project:', error);
  };

  const addCrewMember = useCallback(async (projectId: string, username: string, role: string) => {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .ilike('username', username.trim())
      .maybeSingle();

    if (profileError || !profile) {
      return { error: `No user found with username "${username}"` };
    }

    const { error } = await supabase
      .from('project_crew')
      .insert({ project_id: projectId, user_id: profile.id, role });

    if (error) {
      return { error: error.code === '23505' ? 'That person is already on the crew' : 'Failed to add crew member' };
    }

    await refreshProject(projectId);
    return {};
  }, [refreshProject]);

  const removeCrewMember = useCallback(async (projectId: string, crewId: string) => {
    const { error } = await supabase.from('project_crew').delete().eq('id', crewId);
    if (error) {
      console.error('Error removing crew member:', error);
      return;
    }
    await refreshProject(projectId);
  }, [refreshProject]);

  const addTimelineItem = useCallback(async (item: Omit<TimelineItem, 'id'> & { project_id: string }) => {
    const { error } = await supabase.from('timeline_items').insert(item);
    if (error) {
      console.error('Error adding timeline item:', error);
      return;
    }
    await refreshProject(item.project_id);
  }, [refreshProject]);

  const updateTimelineItem = useCallback(async (id: string, projectId: string, updates: Partial<TimelineItem>) => {
    const { error } = await supabase.from('timeline_items').update(updates).eq('id', id);
    if (error) {
      console.error('Error updating timeline item:', error);
      return;
    }
    await refreshProject(projectId);
  }, [refreshProject]);

  const removeTimelineItem = useCallback(async (id: string, projectId: string) => {
    const { error } = await supabase.from('timeline_items').delete().eq('id', id);
    if (error) {
      console.error('Error removing timeline item:', error);
      return;
    }
    await refreshProject(projectId);
  }, [refreshProject]);

  const addBeat = useCallback(async (beat: Omit<Beat, 'id'> & { project_id: string }) => {
    const { error } = await supabase.from('beats').insert(beat);
    if (error) { console.error('Error adding beat:', error); return; }
    await refreshProject(beat.project_id);
  }, [refreshProject]);

  const removeBeat = useCallback(async (id: string, projectId: string) => {
    const { error } = await supabase.from('beats').delete().eq('id', id);
    if (error) { console.error('Error removing beat:', error); return; }
    await refreshProject(projectId);
  }, [refreshProject]);

  const addConceptAsset = useCallback(async (asset: Omit<ConceptAsset, 'id'> & { project_id: string; created_by?: string }) => {
    const { error } = await supabase.from('concept_assets').insert(asset);
    if (error) { console.error('Error adding concept asset:', error); return; }
    await refreshProject(asset.project_id);
  }, [refreshProject]);

  const removeConceptAsset = useCallback(async (id: string, projectId: string) => {
    const { error } = await supabase.from('concept_assets').delete().eq('id', id);
    if (error) { console.error('Error removing concept asset:', error); return; }
    await refreshProject(projectId);
  }, [refreshProject]);

  const addScene = useCallback(async (scene: Omit<Scene, 'id'> & { project_id: string }) => {
    const { error } = await supabase.from('scenes').insert(scene);
    if (error) { console.error('Error adding scene:', error); return; }
    await refreshProject(scene.project_id);
  }, [refreshProject]);

  const removeScene = useCallback(async (id: string, projectId: string) => {
    const { error } = await supabase.from('scenes').delete().eq('id', id);
    if (error) { console.error('Error removing scene:', error); return; }
    await refreshProject(projectId);
  }, [refreshProject]);

  const addCampaign = useCallback(async (campaign: Omit<Campaign, 'id'> & { project_id: string; created_by?: string }) => {
    const { error } = await supabase.from('campaigns').insert(campaign);
    if (error) { console.error('Error adding campaign:', error); return; }
    await refreshProject(campaign.project_id);
  }, [refreshProject]);

  const updateCampaign = useCallback(async (id: string, projectId: string, updates: Partial<Campaign>) => {
    const { error } = await supabase.from('campaigns').update(updates).eq('id', id);
    if (error) { console.error('Error updating campaign:', error); return; }
    await refreshProject(projectId);
  }, [refreshProject]);

  const removeCampaign = useCallback(async (id: string, projectId: string) => {
    const { error } = await supabase.from('campaigns').delete().eq('id', id);
    if (error) { console.error('Error removing campaign:', error); return; }
    await refreshProject(projectId);
  }, [refreshProject]);

  return (
    <ProjectContext.Provider value={{
      activeProject, setActiveProject, projects, loading, updateProject, refreshProject,
      addCrewMember, removeCrewMember, addTimelineItem, updateTimelineItem, removeTimelineItem,
      addBeat, removeBeat, addConceptAsset, removeConceptAsset, addScene, removeScene,
      addCampaign, updateCampaign, removeCampaign,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
