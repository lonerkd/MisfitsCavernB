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

export interface CrewMember {
  id: string;
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

export interface ConceptAsset {
  id: string;
  image_url: string;
  title?: string;
}

export interface Scene {
  id: string;
  scene_number: number;
  title: string;
  location?: string;
  time_of_day?: string;
  shoot_day?: number;
}

export interface Campaign {
  id: string;
  title: string;
  platform: string;
  status: string;
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
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const ACTIVE_KEY = 'mc_active_project';

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [activeProject, setActiveProjectState] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Persist the active project so the whole suite stays on the same context
  // across pages and reloads.
  const setActiveProject = useCallback((project: Project | null) => {
    setActiveProjectState(project);
    if (typeof window !== 'undefined') {
      if (project?.id) localStorage.setItem(ACTIVE_KEY, project.id);
      else localStorage.removeItem(ACTIVE_KEY);
    }
  }, []);

  const fetchProjectDetails = async (projectId: string) => {
    const [projectRes, budgetRes, timelineRes, crewRes, beatsRes, conceptRes, scenesRes, campaignsRes] = await Promise.all([
      supabase.from('projects').select('*').eq('id', projectId).single(),
      supabase.from('budget_items').select('*').eq('project_id', projectId),
      supabase.from('timeline_items').select('*').eq('project_id', projectId),
      supabase.from('project_crew').select('*, profiles!project_crew_user_id_fkey(username, avatar_url)').eq('project_id', projectId),
      supabase.from('project_beats').select('*').eq('project_id', projectId).order('created_at'),
      supabase.from('concept_images').select('*').eq('project_id', projectId).order('created_at'),
      supabase.from('scenes').select('*').eq('project_id', projectId).order('scene_number'),
      supabase.from('campaigns').select('*').eq('project_id', projectId).order('created_at'),
    ]);

    if (projectRes.data) {
      const p = projectRes.data;
      return {
        ...p,
        budget_items: budgetRes.data || [],
        timeline_items: timelineRes.data || [],
        crew: (crewRes.data || []).map((c: any) => ({
          id: c.id,
          name: c.profiles?.username || 'Unknown',
          role: c.role,
          avatar: c.profiles?.avatar_url || null,
          status: 'confirmed'
        })),
        beats: beatsRes.data || [],
        concept_assets: conceptRes.data || [],
        scenes: scenesRes.data || [],
        campaigns: campaignsRes.data || [],
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
          const savedId = typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_KEY) : null;
          const target = (savedId && data.find(p => p.id === savedId)) || data[0];
          const full = await fetchProjectDetails(target.id);
          setActiveProjectState(full || target);
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
              setActiveProjectState(prev => prev ? { ...prev, ...updated } : null);
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

  return (
    <ProjectContext.Provider value={{ activeProject, setActiveProject, projects, loading, updateProject, refreshProject }}>
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
