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

export interface ScriptSummary {
  id: string;
  title: string;
  status: string;
  format: string;
  updatedAt: string;
}

export interface ReferenceAsset {
  id: string;
  title: string;
  url: string;
  sceneLinks?: { id: string; scriptId: string; sceneNumber: string }[];
}

export interface ActivityEvent {
  id: string;
  user_id: string;
  action: string;
  target_type: string;
  target_id: string;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  status: string;
  accent_color?: string;
  project_type?: string;
  type?: string;
  beats?: Beat[];
  crew?: CrewMember[];
  budget_items?: BudgetItem[];
  timeline_items?: TimelineItem[];
  // The project as the real aggregate — every module reads these off the
  // same object instead of fetching its own disconnected copy.
  scripts?: ScriptSummary[];
  boardId?: string | null;
  references?: ReferenceAsset[];
  activity?: ActivityEvent[];
}

interface ProjectContextType {
  activeProject: Project | null;
  setActiveProject: (project: Project | null) => void;
  projects: Project[];
  loading: boolean;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  refreshProject: (id: string) => Promise<void>;
  addProject: (project: Project) => void;
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
    // The project's moodboard is keyed by storing the project id in studio_boards.name
    // (see lib/supabase/studio.ts getOrCreateBoardForProject) — same convention here.
    const [projectRes, crewRes, scriptsRes, boardRes, activityRes] = await Promise.all([
      supabase.from('projects').select('*').eq('id', projectId).single(),
      supabase.from('project_crew').select('*, profiles(username, avatar_url)').eq('project_id', projectId),
      supabase.from('scripts').select('id, title, status, format, updated_at').eq('project_id', projectId).order('updated_at', { ascending: false }),
      supabase.from('studio_boards').select('id').eq('name', projectId).maybeSingle(),
      supabase.from('activity_feed').select('*').contains('metadata', { project_id: projectId }).order('created_at', { ascending: false }).limit(30),
    ]);

    if (!projectRes.data) return null;

    let references: ReferenceAsset[] = [];
    const boardId = boardRes.data?.id ?? null;
    if (boardId) {
      const { data: assets } = await supabase.from('studio_assets').select('id, title, asset_url').eq('board_id', boardId);
      const assetIds = (assets || []).map((a: any) => a.id);
      const { data: links } = assetIds.length
        ? await supabase.from('scene_links').select('*').in('asset_id', assetIds)
        : { data: [] as any[] };
      references = (assets || []).map((a: any) => ({
        id: a.id,
        title: a.title || 'Untitled',
        url: a.asset_url,
        sceneLinks: (links || [])
          .filter((l: any) => l.asset_id === a.id)
          .map((l: any) => ({ id: l.id, scriptId: l.script_id, sceneNumber: l.scene_number })),
      }));
    }

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
      })),
      scripts: (scriptsRes.data || []).map((s: any) => ({
        id: s.id, title: s.title, status: s.status, format: s.format, updatedAt: s.updated_at,
      })),
      boardId,
      references,
      activity: activityRes.data || [],
    };
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

  // Optimistic insert for a just-created project — covers the gap before the
  // realtime INSERT event arrives, so a redirect into /projects/[id] doesn't
  // race the "project not found" fallback there.
  const addProject = useCallback((project: Project) => {
    setProjects(prev => prev.some(p => p.id === project.id) ? prev : [project, ...prev]);
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
          } else if (payload.eventType === 'INSERT') {
            const created = payload.new as Project;
            setProjects(prev => prev.some(p => p.id === created.id) ? prev : [created, ...prev]);
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'project_crew' }, (payload) => {
          const row = (payload.new || payload.old) as any;
          if (row?.project_id) refreshProject(row.project_id);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'scripts' }, (payload) => {
          const row = (payload.new || payload.old) as any;
          if (row?.project_id) refreshProject(row.project_id);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'studio_assets' }, (payload) => {
          // studio_assets is keyed by board_id, not project_id — ripple to
          // whichever project currently has that board open.
          const row = (payload.new || payload.old) as any;
          setActiveProjectState(prev => {
            if (prev?.boardId && prev.boardId === row?.board_id) refreshProject(prev.id);
            return prev;
          });
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_feed' }, (payload) => {
          // The event backbone: every mutation across the suite lands here.
          // Prepend straight onto the matching project's feed — no refetch needed.
          const event = payload.new as ActivityEvent;
          const eventProjectId = event.metadata?.project_id;
          if (!eventProjectId) return;
          setActiveProjectState(prev => (prev?.id === eventProjectId
            ? { ...prev, activity: [event, ...(prev.activity || [])].slice(0, 30) }
            : prev));
          setProjects(prev => prev.map(p => p.id === eventProjectId
            ? { ...p, activity: [event, ...(p.activity || [])].slice(0, 30) }
            : p));
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
    <ProjectContext.Provider value={{ activeProject, setActiveProject, projects, loading, updateProject, refreshProject, addProject }}>
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
