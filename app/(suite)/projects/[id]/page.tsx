'use client';

import React, { useState, useEffect, useEffectEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import GrainOverlay from '@/components/ui/GrainOverlay';
import { useConfirm } from '@/components/ui/Confirm';
import { useToast } from '@/components/ui/Toast';
import { getProjectOverview, getProjectRow, type MilestoneRow, type ProjectOverview } from '@/lib/supabase/project-hub';
import { updateProjectVisibility, PROJECT_VISIBILITY } from '@/lib/supabase/projects';
import { type Phase, mapStatusToPhase, phaseIndexIn, useProject, useCurrentUser } from '@/lib/os';
import { findFormat, formatPhases, useFormats } from '@/lib/formats/formats';
import type { ProjectSettings } from '@/lib/types/settings';
import { getProjectModules } from '@/lib/types/settings';
import type { ScriptFormat } from '@/lib/scriptos/parser';
import { awaitOSUser } from '@/lib/os';
import { readable } from '@/lib/util/color';
import { useOnlinePresence } from '@/lib/hooks/usePresence';
import { useProjectProgress } from '@/lib/hooks/useProjectProgress';
import { useProjectBrief, useCanShape } from '@/lib/brief';
import { BriefPanel } from '@/components/brief/BriefPanel';
import { PhasePanel } from '@/components/progress/PhasePanel';
import { GuidePanel } from '@/components/guides/GuidePanel';
import { ViewAsSwitch, ViewAsBanner, OutsiderPreview } from '@/components/projects/ViewAs';
import { AnnouncementBox } from '@/components/projects/AnnouncementBox';
import { useViewAs, effectiveOwner } from '@/lib/os/viewAs';
import { LoglineEditor } from '@/components/progress/LoglineEditor';
import type { ProjectHubViewModel } from '@/components/projects/hub/types';
import { DeptWindow, ScriptPreview, AssetPreview, CrewPreview, TimelinePreview, PortfolioPreview } from '@/components/projects/hub/DeptWindow';
import { ProductionManager } from '@/components/projects/hub/ProductionManager';

// ─── Main page ───────────────────────────────────────────────────────────────

export default function ProjectHubPage() {
  const confirm = useConfirm();
  const { toast } = useToast();
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const { activeProject, setActiveProject, refreshProject } = useProject();

  const [realProject, setRealProject] = useState<ProjectHubViewModel | null>(null);
  const [loading, setLoading] = useState(true);

  // The session follows the project being viewed (once it has loaded).
  const followProject = useEffectEvent((pid: string) => { if (activeProject?.id !== pid) refreshProject(pid); });
  const reportError = useEffectEvent((message: string) => toast(message, 'error'));

  useEffect(() => {
    let active = true;
    (async () => {
      getProjectRow(id).catch((e) => { console.error('Failed to load project:', e); return null; }).then(async (row) => {
        if (!active) return;
        if (!row) { router.push('/projects'); return; }
        const phase = mapStatusToPhase(row.status ?? undefined);
        const me = (await awaitOSUser()) || null;
        const token = row.share_token || '';
        setRealProject({
          id: row.id,
          title: row.title,
          type: row.project_type || 'Project',
          phase,
          deadline: row.end_date || '',
          description: row.description || '',
          color: readable(row.accent_color || 'var(--accent)'),
          accent: row.accent_color,
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

  const [counts, setCounts] = useState({ scripts: 0, pages: 0, crew: 0, tasks: 0, tasksDone: 0, budget: 0, timeline: 0, scenes: 0, concepts: 0, festivalsSubmitted: 0, festivalsAccepted: 0, campaigns: 0 });
  const [milestones, setMilestones] = useState<MilestoneRow[]>([]);
  const [portfolioPieces, setPortfolioPieces] = useState<{ id: string; title: string }[]>([]);
  const [crewTeam, setCrewTeam] = useState<{ id: string; name: string; role: string }[]>([]);
  const onlineIds = useOnlinePresence(realProject ? 'me' : null);
  const progressState = useProjectProgress(id);
  const briefFormat = progressState.signals?.project_type ?? null;
  const brief = useProjectBrief(realProject ? id : null, briefFormat, progressState.progress?.current.id ?? null);
  const canShape = useCanShape(realProject ? id : null, !!realProject?.isOwner);
  const { formats } = useFormats();
  const me = useCurrentUser().user;
  useEffect(() => {
    let active = true;
    (async () => {
      let o: ProjectOverview;
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

  const viewMode = useViewAs(id);
  const project = realProject;

  if (loading || !project) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 'var(--caps-track)', color: 'var(--fg-dim)' }}>LOADING</div>
      </div>
    );
  }

  // A real owner previewing as someone else: an outsider sees nothing; crew see the crew's controls.
  if (project.isOwner && viewMode === 'outsider') return <OutsiderPreview projectId={id} />;
  const ownerView = effectiveOwner(project.isOwner, viewMode);
  const isRealProject = true;
  const team = crewTeam.map(m => ({ ...m, online: onlineIds.has(m.id) }));
  const onlineCount = team.filter(m => m.online).length;

  // The phase panel re-reads the project after a phase or format change; the header follows it.
  const format = findFormat(formats, project.type);
  const typePhases = progressState.progress?.phases ?? formatPhases(format);
  const typePhaseIdx = progressState.progress?.currentIndex ?? phaseIndexIn(format?.rules, project.phase);
  const modules = getProjectModules(project.settings);

  const changeVisibility = async (v: 'private' | 'team' | 'link' | 'public') => {
    try {
      const shareUrl = await updateProjectVisibility(id, v);
      setRealProject(p => p ? { ...p, visibility: v, shareUrl: shareUrl || p.shareUrl } : p);
      const msg = v === 'private' ? 'Project is now private (you only).'
        : v === 'team' ? 'Project is now team-only.'
        : v === 'link' ? 'Anyone with the link can now view this project.'
        : 'Project is now public.';
      toast(msg, 'success');
      refreshProject(id);
    } catch (e: any) {
      toast(e?.message || 'Could not update visibility', 'error');
    }
  };

  const copyShareLink = async () => {
    if (!project.shareUrl) { toast('Share link is not ready yet.', 'error'); return; }
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${project.shareUrl}`);
      toast('Share link copied.', 'success');
    } catch {
      toast('Could not copy — copy it manually: ' + window.location.origin + project.shareUrl, 'info');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', overflow: 'hidden' }}>
      <GrainOverlay />
      <ViewAsBanner projectId={id} />

      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: '50vh', pointerEvents: 'none', zIndex: 0,
        background: `radial-gradient(ellipse at 50% -20%, ${project.color}0a 0%, transparent 65%)`,
      }} />

      {/* Back, title and project live in the island; what's left here is this project's own tools. */}
      <div className="mc-project-top" style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'flex-end', padding: '16px 28px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {onlineCount > 0 && (
            <div className="mc-hide-phone" style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', color: 'var(--ok)', letterSpacing: 'var(--caps-track)' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--success)', display: 'inline-block', animation: 'pulse 2.5s ease-in-out infinite' }} />
              {onlineCount} online
            </div>
          )}
          {counts.tasks > 0 && (
          <div title="Tasks completed" className="mc-hide-phone" style={{
            fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', letterSpacing: 'var(--caps-track)',
            padding: '5px 10px', borderRadius: 8, background: 'rgba(var(--ink-rgb), 0.04)',
          }}>
            {counts.tasksDone}/{counts.tasks} tasks done
          </div>
          )}
          {ownerView && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <select
                value={project.visibility}
                onChange={e => changeVisibility(e.target.value as 'private' | 'team' | 'link' | 'public')}
                aria-label="Project visibility"
                title="Who can see this project"
                style={{
                  fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', color: 'var(--fg-muted)',
                  background: 'rgba(var(--ink-rgb), 0.04)', border: '1px solid rgba(var(--ink-rgb), 0.1)',
                  borderRadius: 8, padding: '5px 8px', cursor: 'pointer', outline: 'none',
                }}
              >
                {PROJECT_VISIBILITY.map(v => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </select>
              {project.visibility === 'link' && (
                <button
                  onClick={copyShareLink}
                  title="Copy the share link — anyone with it can view this project"
                  style={{
                    fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', color: 'var(--jobs-text)',
                    background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)',
                    borderRadius: 8, padding: '5px 10px', cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >Copy link</button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mc-project-body" style={{ padding: '28px 28px 120px', position: 'relative', zIndex: 1 }}>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{ marginBottom: 24 }}
        >
          {project.isOwner && <div style={{ marginBottom: 10 }}><ViewAsSwitch projectId={id} /></div>}
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(2.6rem, 7vw, 4.4rem)', fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 0.9, margin: 0 }}>{project.title}</h1>
          <LoglineEditor
            projectId={id}
            value={project.description}
            isOwner={ownerView}
            onSaved={(logline) => setRealProject(p => p ? { ...p, description: logline } : p)}
          />
        </motion.div>

        {ownerView && me?.id && <AnnouncementBox projectId={id} projectTitle={project.title} userId={me.id} />}

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{ marginBottom: 24 }}
        >
          <PhasePanel projectId={id} state={progressState} isOwner={ownerView} accent={project.accent || 'var(--accent)'}
            onFormatChanged={(type) => { setRealProject(p => p ? { ...p, type } : p); refreshProject(id); }} />
        </motion.div>

        {isRealProject && progressState.progress && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.7, ease: [0.16, 1, 0.3, 1] }} style={{ marginBottom: 24 }}>
            <BriefPanel brief={brief} projectTitle={project.title} format={briefFormat} phase={progressState.progress.current.id}
              canEdit={canShape} accent={project.accent || 'var(--accent)'} />
          </motion.div>
        )}

        {isRealProject && progressState.signals && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }} style={{ marginBottom: 24 }}>
            <GuidePanel projectId={id} signals={progressState.signals} isOwner={ownerView} format={briefFormat}
              structure={typeof brief.answers.structure === 'string' ? brief.answers.structure : null}
              accent={project.accent || 'var(--accent)'} userId={me?.id ?? null} role={me?.role ?? null} />
          </motion.div>
        )}

        {/*
          Grid layout — control room:
          ┌─────────────────┬──────────────┐
          │  ScriptOS (2×)  │  Studio      │  row 1
          ├────────┬────────┤              │
          │  Crew  │ Sched  ├──────────────┤  row 2
          └────────┴────────┴──────────────┘

          Actually let's do a clean responsive grid:
          Top row:   [ScriptOS large] [Studio]
          Mid row:   [Crew] [Timeline] [Portfolio]
        */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>

          {modules.scriptos && (
            <DeptWindow
              title="ScriptOS"
              tag="Screenplay"
              color="var(--accent)"
              href="/editor"
              delay={0.05}
              stats={[
                { label: 'Pages', value: counts.pages },
                { label: 'Scripts', value: counts.scripts },
              ]}
              preview={<ScriptPreview pages={counts.pages} scripts={counts.scripts} scenes={counts.scenes} />}
            />
          )}

          {modules.studio && (
            <DeptWindow
              title="Studio"
              tag="Assets"
              color="#6366f1"
              href="/studio"
              delay={0.1}
              stats={[
                { label: 'References', value: counts.concepts },
                { label: 'Scenes',   value: counts.scenes },
              ]}
              preview={<AssetPreview concepts={counts.concepts} scenes={counts.scenes} />}
            />
          )}

          {modules.lounge && (
            <DeptWindow
              title="Lounge"
              tag="Crew"
              color="var(--ok)"
              href="/lounge"
              delay={0.15}
              stats={[
                { label: 'Crew',  value: counts.crew },
                { label: 'Tasks', value: `${counts.tasksDone}/${counts.tasks}` },
              ]}
              preview={<CrewPreview team={team} />}
            />
          )}

          <DeptWindow
            title="Timeline"
            tag="Schedule"
            color="var(--warn)"
            href="#production"
            delay={0.2}
            stats={[
              { label: 'Milestones', value: counts.timeline },
              { label: 'Budget', value: counts.budget > 0 ? `$${(counts.budget / 1000).toFixed(1)}k` : '$0' },
            ]}
            preview={<TimelinePreview deadline={project.deadline} milestones={milestones} />}
          />

          {modules.portfolio && (
            <DeptWindow
              title="Portfolio"
              tag="Showcase"
              color="var(--jobs-color)"
              href="/portfolio"
              delay={0.25}
              stats={[
                { label: 'Phase', value: typePhases[typePhaseIdx].abbr },
                { label: 'Type',  value: project.type },
              ]}
              preview={<PortfolioPreview pieces={portfolioPieces} />}
            />
          )}

          {modules.distribution && (
            <DeptWindow
              title="Distribution"
              tag="Launch"
              color="#ec4899"
              href="/studio?tab=promos"
              delay={0.3}
              stats={[
                { label: 'Festivals', value: counts.festivalsSubmitted },
                { label: 'Campaigns', value: counts.campaigns },
              ]}
              preview={
                <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { label: 'Festival submissions', value: String(counts.festivalsSubmitted) },
                    { label: 'Accepted', value: String(counts.festivalsAccepted) },
                    { label: 'Campaigns planned', value: String(counts.campaigns) },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)' }}>{label}</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', color: 'var(--fg-muted)' }}>{value}</span>
                    </div>
                  ))}
                </div>
              }
            />
          )}

        </div>

        {isRealProject && <div id="production" />}
        {isRealProject && <ProductionManager projectId={id} projectTitle={project.title} accent={project.color} isOwner={ownerView} />}
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );
}


