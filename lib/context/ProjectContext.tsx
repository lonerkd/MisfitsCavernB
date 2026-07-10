'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase, type Database } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import type { ProjectSettings } from '@/lib/types/settings';
import { useToast } from '@/components/Toast';

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
  board?: string | null;
}

export interface Scene {
  id: string;
  scene_number: number;
  title: string;
  location?: string;
  time_of_day?: string;
  shoot_day?: number;
  status?: string;
  cast_list?: string;
  est_duration?: string;
  elements?: { props?: string[]; wardrobe?: string[]; vehicles?: string[]; sfx?: string[]; vfx?: string[] };
}

export interface Campaign {
  id: string;
  title: string;
  platform: string;
  status: string;
  target_demographic?: string;
  budget?: number;
  spend?: number;
  start_date?: string;
  end_date?: string;
}

export interface FestivalSubmission {
  id: string;
  name: string;
  deadline?: string;
  status: 'planned' | 'submitted' | 'accepted' | 'rejected';
  notes?: string;
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
  settings?: ProjectSettings;
  festival_submissions?: FestivalSubmission[];
}

// The production-phase model shared by the projects list and hub pages.
// Both files independently implemented the identical status->phase mapping
// before this consolidation (one as a named function, one as an inline
// ternary chain) — same logic, two copies that could silently drift.
export type Phase = 'development' | 'pre-production' | 'production' | 'post-production' | 'delivery';

export function mapStatusToPhase(status?: string): Phase {
  switch (status) {
    case 'concept': return 'development';
    case 'pre-prod':
    case 'pre-production': return 'pre-production';
    case 'production': return 'production';
    case 'post':
    case 'post-production': return 'post-production';
    case 'released':
    case 'completed':
    case 'delivery': return 'delivery';
    default: return 'development';
  }
}

// Per-type relabeling (+ optional stage-skipping) layered on top of the same
// 5 canonical phases above — the persisted `status` column and Phase model
// are never touched, only what's *displayed* differs, so this has zero
// migration risk against existing project data. Used by the single-project
// hub's phase rail, where exactly one type is in scope; the cross-project
// Kanban board on the projects list intentionally keeps the generic labels
// since it shows every type side by side in shared columns.
const ALL_PHASES: { id: Phase; label: string; abbr: string }[] = [
  { id: 'development',     label: 'Development',     abbr: 'DEV'  },
  { id: 'pre-production',  label: 'Pre-Production',  abbr: 'PRE'  },
  { id: 'production',      label: 'Production',      abbr: 'PROD' },
  { id: 'post-production', label: 'Post-Production', abbr: 'POST' },
  { id: 'delivery',        label: 'Delivery',        abbr: 'DEL'  },
];

const TYPE_PHASE_LABELS: Record<string, Partial<Record<Phase, { label: string; abbr: string }>>> = {
  'Music Video': {
    production: { label: 'Shoot', abbr: 'SHOOT' },
    'post-production': { label: 'Edit', abbr: 'EDIT' },
    delivery: { label: 'Released', abbr: 'OUT' },
  },
  Commercial: {
    production: { label: 'Shoot', abbr: 'SHOOT' },
    delivery: { label: 'Delivered', abbr: 'OUT' },
  },
  Podcast: {
    development: { label: 'Planning', abbr: 'PLAN' },
    production: { label: 'Recording', abbr: 'REC' },
    'post-production': { label: 'Editing', abbr: 'EDIT' },
    delivery: { label: 'Published', abbr: 'OUT' },
  },
  Series: {
    delivery: { label: 'Released', abbr: 'OUT' },
  },
  'Limited Series': {
    delivery: { label: 'Released', abbr: 'OUT' },
  },
};

// Which canonical phases a type's pipeline visually skips (still valid if
// `status` is ever set to one — the rail just clamps to the nearest earlier
// visible stage rather than showing a pip for it).
const TYPE_SKIPPED_PHASES: Record<string, Phase[]> = {
  'Music Video': ['pre-production'],
  Podcast: ['pre-production'],
};

export function getPhasesForType(projectType?: string | null): { id: Phase; label: string; abbr: string }[] {
  const type = projectType || '';
  const skip = new Set(TYPE_SKIPPED_PHASES[type] || []);
  const overrides = TYPE_PHASE_LABELS[type] || {};
  return ALL_PHASES
    .filter(p => !skip.has(p.id))
    .map(p => ({ ...p, ...(overrides[p.id] || {}) }));
}

export function phaseIndexForType(projectType: string | null | undefined, phase: Phase): number {
  const phases = getPhasesForType(projectType);
  const visibleIds = phases.map(p => p.id);
  const idx = visibleIds.indexOf(phase);
  if (idx !== -1) return idx;
  // This type skips `phase` visually — clamp to the nearest earlier stage
  // it does show, so an edge-case status never produces a missing pip.
  const allIds = ALL_PHASES.map(p => p.id);
  for (let i = allIds.indexOf(phase) - 1; i >= 0; i--) {
    const j = visibleIds.indexOf(allIds[i]);
    if (j !== -1) return j;
  }
  return 0;
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
  const { toast } = useToast();

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
      supabase.from('concept_assets').select('*').eq('project_id', projectId).order('created_at'),
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
        // DB rows use wide/nullable column types; Project narrows them for the app
      } as unknown as Project;
    }
    return null;
  };

  const refreshProject = useCallback(async (id: string) => {
    const fullProject = await fetchProjectDetails(id);
    if (fullProject) {
      setActiveProject(fullProject);
      setProjects(prev => prev.map(p => p.id === id ? fullProject : p));
    }
  }, [setActiveProject]);

  // Read inside the realtime callbacks below via a ref instead of the
  // `activeProject` state directly — the effect that owns the subscription
  // intentionally never re-runs once mounted (see why below), so a plain
  // closure over `activeProject` would always see its value from the first
  // render, not the current one.
  const activeProjectRef = useRef(activeProject);
  useEffect(() => { activeProjectRef.current = activeProject; }, [activeProject]);

  // Load the initial project list once per session, not on every
  // activeProject change (setting the active project below used to be a
  // dependency of this same effect, which re-ran it every time — redundant
  // at best).
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!error && data) {
        const rows = data as unknown as Project[];
        setProjects(rows);
        if (rows.length > 0) {
          const savedId = typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_KEY) : null;
          const target = (savedId && rows.find(p => p.id === savedId)) || rows[0];
          const full = await fetchProjectDetails(target.id);
          setActiveProjectState(full || target);
        }
      }
      setLoading(false);
    })();
  }, []);

  // Realtime sync — set up exactly once. The previous version rebuilt this
  // subscription on every `activeProject` change while reusing the same
  // static channel name ('project-changes'); activeProject changes at least
  // once immediately after the initial load (null -> the loaded project),
  // so on every page load a second channel with the identical topic name
  // was opened while the first was still tearing down asynchronously —
  // Supabase Realtime rejects that as a duplicate join, throwing during a
  // render/effect phase where nothing caught it, which is what was tripping
  // the app-wide error boundary on the home page (and anywhere else this
  // provider mounts, i.e. everywhere).
  useEffect(() => {
    const projectSubscription: RealtimeChannel = supabase
      .channel('project-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          const updated = payload.new as Project;
          setProjects(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
          if (activeProjectRef.current?.id === updated.id) {
            setActiveProjectState(prev => prev ? { ...prev, ...updated } : null);
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budget_items' }, (payload) => {
        const item = (payload.new || payload.old) as any;
        if (activeProjectRef.current?.id === item.project_id) {
          refreshProject(item.project_id);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'timeline_items' }, (payload) => {
        const item = (payload.new || payload.old) as any;
        if (activeProjectRef.current?.id === item.project_id) {
          refreshProject(item.project_id);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(projectSubscription); };
  }, [refreshProject]);

  const updateProject = async (id: string, updates: Partial<Project>) => {
    const { error } = await supabase
      .from('projects')
      // Project narrows Json columns (settings, festival_submissions) to app
      // shapes; widen back to the generated row type for the write
      .update(updates as unknown as Database['public']['Tables']['projects']['Update'])
      .eq('id', id);
    
    if (error) toast('Failed to update project. Please try again.', 'error');
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
