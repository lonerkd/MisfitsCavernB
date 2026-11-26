'use client';

import { useEffect, useEffectEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProjectOverview, getProjectRow, type MilestoneRow } from '@/lib/supabase/project-hub';
import { mapStatusToPhase, awaitOSUser, useProject } from '@/lib/os';
import { readable } from '@/lib/util/color';
import type { ProjectSettings } from '@/lib/types/settings';
import type { ProjectHubViewModel } from './types';

type ToastFn = (message: string, type?: 'success' | 'error' | 'info') => void;

export interface ProjectHubCounts {
  scripts: number; pages: number; crew: number; tasks: number; tasksDone: number;
  budget: number; timeline: number; scenes: number; concepts: number;
  festivalsSubmitted: number; festivalsAccepted: number; campaigns: number;
}

/**
 * The hub's data: the project row (mapped to the view model the page
 * renders) and the overview numbers (counts, milestones, portfolio pieces,
 * crew). The page owns what follows from them — presence, progress, the
 * brief — and the mutations (visibility, logline, logo) through setProject.
 */
export function useProjectHubData(id: string, toast: ToastFn) {
  const router = useRouter();
  const { activeProject, refreshProject } = useProject();
  const [project, setProject] = useState<ProjectHubViewModel | null>(null);
  const [loading, setLoading] = useState(true);

  // The session follows the project being viewed (once it has loaded).
  const followProject = useEffectEvent((pid: string) => { if (activeProject?.id !== pid) refreshProject(pid); });

  useEffect(() => {
    let active = true;
    (async () => {
      getProjectRow(id).catch((e) => { console.error('Failed to load project:', e); return null; }).then(async (row) => {
        if (!active) return;
        if (!row) { router.push('/projects'); return; }
        const phase = mapStatusToPhase(row.status ?? undefined);
        const me = (await awaitOSUser()) || null;
        const token = row.share_token || '';
        setProject({
          id: row.id,
          title: row.title,
          type: row.project_type || 'Project',
          phase,
          deadline: row.end_date || '',
          description: row.description || '',
          color: readable(row.accent_color || 'var(--accent)'),
          accent: row.accent_color,
          logoUrl: row.logo_url,
          team: [],
          settings: row.settings as unknown as ProjectSettings,
          visibility: (row.visibility as ProjectHubViewModel['visibility']) || 'team',
          shareUrl: token ? `/shared/${token}` : '',
          isOwner: me?.id === row.creator_id,
        });
        setLoading(false);
        followProject(row.id);
      });
    })();
    return () => { active = false; };
  }, [id, router]);

  const [counts, setCounts] = useState<ProjectHubCounts>({ scripts: 0, pages: 0, crew: 0, tasks: 0, tasksDone: 0, budget: 0, timeline: 0, scenes: 0, concepts: 0, festivalsSubmitted: 0, festivalsAccepted: 0, campaigns: 0 });
  const [milestones, setMilestones] = useState<MilestoneRow[]>([]);
  const [portfolioPieces, setPortfolioPieces] = useState<{ id: string; title: string }[]>([]);
  const [crewTeam, setCrewTeam] = useState<{ id: string; name: string; role: string }[]>([]);
  const reportError = useEffectEvent((message: string) => toast(message, 'error'));

  useEffect(() => {
    let active = true;
    (async () => {
      let o: Awaited<ReturnType<typeof getProjectOverview>>;
      try { o = await getProjectOverview(id); }
      catch (e) {
        console.error('Failed to load the project overview:', e);
        if (active) reportError('Could not load this project’s numbers.');
        return;
      }
      if (!active) return;
      const { eighths } = o;
      setCounts({
        scripts: o.scripts,
        // Short scripts in tenths (3/8 pg → 0.4), longer ones in whole pages.
        pages: eighths < 80 ? Math.round(eighths / 0.8) / 10 : Math.round(eighths / 8),
        crew: o.crew.length,
        tasks: o.tasks,
        tasksDone: o.tasksDone,
        budget: o.budget,
        timeline: o.milestones.length,
        scenes: o.scenes,
        concepts: o.concepts,
        festivalsSubmitted: o.festivalsSubmitted,
        festivalsAccepted: o.festivalsAccepted,
        campaigns: o.campaigns,
      });
      setMilestones(o.milestones);
      setPortfolioPieces(o.portfolio);
      setCrewTeam(o.crew);
    })();
    return () => { active = false; };
  }, [id]);

  return { project, setProject, loading, counts, milestones, portfolioPieces, crewTeam };
}
