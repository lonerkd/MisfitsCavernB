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

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjectDetails = async (projectId: string) => {
    const [projectRes, budgetRes, timelineRes, crewRes] = await Promise.all([
      supabase.from('projects').select('*').eq('id', projectId).single(),
      supabase.from('budget_items').select('*').eq('project_id', projectId),
      supabase.from('timeline_items').select('*').eq('project_id', projectId),
      supabase.from('project_crews').select('*, users(username, avatar)').eq('project_id', projectId)
    ]);

    if (projectRes.data) {
      const p = projectRes.data;
      return {
        ...p,
        budget_items: budgetRes.data || [],
        timeline_items: timelineRes.data || [],
        crew: (crewRes.data || []).map((c: any) => ({
          id: c.id,
          name: c.users?.username || 'Unknown',
          role: c.role,
          avatar: c.users?.avatar,
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
