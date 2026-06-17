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

const ACTIVE_PROJECT_KEY = 'misfits_cavern_active_project';

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [activeProject, setActiveProjectState] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjectDetails = async (projectId: string) => {
    // Schema reality: crew lives in `project_crew` joined to `profiles`.
    // There are no budget_items / timeline_items tables yet — leave those empty.
    const [projectRes, crewRes] = await Promise.all([
      supabase.from('projects').select('*').eq('id', projectId).single(),
      supabase.from('project_crew').select('*, profiles(username, avatar_url)').eq('project_id', projectId)
    ]);

    if (projectRes.data) {
      const p = projectRes.data;
      return {
        ...p,
        budget_items: [],
        timeline_items: [],
        crew: (crewRes.data || []).map((c: any) => ({
          id: c.id,
          name: c.profiles?.username || 'Unknown',
          role: c.role,
          avatar: c.profiles?.avatar_url,
          status: 'confirmed'
        }))
      };
    }
    return null;
  };

  // Single source of truth for "what am I working on" — persisted so every
  // module (and a page reload) sees the same active project, not its own copy.
  const setActiveProject = useCallback((project: Project | null) => {
    setActiveProjectState(project);
    if (typeof window !== 'undefined') {
      if (project) localStorage.setItem(ACTIVE_PROJECT_KEY, project.id);
      else localStorage.removeItem(ACTIVE_PROJECT_KEY);
    }
  }, []);

  const refreshProject = useCallback(async (id: string) => {
    const fullProject = await fetchProjectDetails(id);
    if (fullProject) {
      setProjects(prev => prev.map(p => p.id === id ? fullProject : p));
      setActiveProjectState(prev => (prev?.id === id ? fullProject : prev));
    }
  }, []);

  useEffect(() => {
    let channel: RealtimeChannel;

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
        const savedId = typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_PROJECT_KEY) : null;
        const restored = savedId ? data.find((p: Project) => p.id === savedId) : null;
        const initial = restored || data[0];
        if (initial) {
          const full = await fetchProjectDetails(initial.id);
          setActiveProjectState(full || initial);
        }
      }
      setLoading(false);

      // Realtime ripple: any change to a project, its crew, or a script/board
      // attached to it pushes through to whoever has it open — no reload.
      channel = supabase
        .channel('project-ecosystem')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Project;
            setProjects(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
            setActiveProjectState(prev => (prev?.id === updated.id ? { ...prev, ...updated } : prev));
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'project_crew' }, (payload) => {
          const row = (payload.new || payload.old) as any;
          if (row?.project_id) refreshProject(row.project_id);
        })
        .subscribe();
    }

    loadProjects();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [refreshProject]);

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
