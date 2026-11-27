'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import GrainOverlay from '@/components/ui/GrainOverlay';
import { useToast } from '@/components/ui/Toast';
import { useInPane, projectPairSearch } from '@/lib/split/pane';
import { readPartner } from '@/lib/split/pair';
import { Columns2 } from 'lucide-react';
import { useScrollToHash } from '@/lib/util/scrollToHash';
import { usePhoneLayout } from '@/lib/os/usePhone';
import { TwoPanesOffer } from '@/components/projects/TwoPanesOffer';
import { updateProjectVisibility } from '@/lib/supabase/projects';
import { phaseIndexIn, useProject, useCurrentUser } from '@/lib/os';
import { findFormat, formatPhases, useFormats } from '@/lib/formats/formats';
import { getProjectModules } from '@/lib/types/settings';
import { useOnlinePresence } from '@/lib/hooks/usePresence';
import { HereLine } from '@/components/studio/HereLine';
import { useProjectProgress } from '@/lib/hooks/useProjectProgress';
import { useProjectBrief, useCanShape } from '@/lib/brief';
import { BriefPanel } from '@/components/brief/BriefPanel';
import { PhasePanel } from '@/components/progress/PhasePanel';
import { GuidePanel } from '@/components/guides/GuidePanel';
import { ViewAsSwitch, ViewAsBanner, OutsiderPreview } from '@/components/projects/ViewAs';
import { AnnouncementBox } from '@/components/projects/AnnouncementBox';
import { useViewAs, effectiveOwner } from '@/lib/os/viewAs';
import { LoglineEditor } from '@/components/progress/LoglineEditor';
import { LogoEditor } from '@/components/progress/LogoEditor';
import { DeptWindow, ScriptPreview, AssetPreview, CrewPreview, TimelinePreview, PortfolioPreview, DistributionPreview } from '@/components/projects/hub/DeptWindow';
import { useProjectHubData } from '@/components/projects/hub/useProjectHubData';
import { HubTopBar } from '@/components/projects/hub/HubTopBar';
import { VisibilityPicker } from '@/components/projects/hub/VisibilityPicker';
import { ProductionManager } from '@/components/projects/hub/ProductionManager';

// ─── Main page ───────────────────────────────────────────────────────────────

export default function ProjectHubPage() {
  const { toast } = useToast();
  const params = useParams();
  const inPane = useInPane();
  const id = String(params.id);
  const { refreshProject } = useProject();

  const { project: realProject, setProject: setRealProject, loading, counts, milestones, portfolioPieces, crewTeam } =
    useProjectHubData(id, toast);
  const onlineIds = useOnlinePresence(realProject ? 'me' : null);
  const progressState = useProjectProgress(id);
  const briefFormat = progressState.signals?.project_type ?? null;
  const brief = useProjectBrief(realProject ? id : null, briefFormat, progressState.progress?.current.id ?? null);
  const canShape = useCanShape(realProject ? id : null, !!realProject?.isOwner);
  const { formats } = useFormats();
  const me = useCurrentUser().user;

  const viewMode = useViewAs(id);
  const project = realProject;
  const phone = usePhoneLayout();
  // The sections draw after the project loads, so a #brief / #production link is scrolled to once they are there.
  useScrollToHash(!loading && !!realProject);

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

      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: '50vh', pointerEvents: 'none', zIndex: 0,
        background: `radial-gradient(ellipse at 50% -20%, ${project.color}0a 0%, transparent 65%)`,
      }} />

      {/* Back, title and project live in the island; the top strip is status
          only. The owner's controls sit in the office section at the foot of
          the hub — the admin stack used to open the page (owner, Nov 26). */}
      <HubTopBar
        onlineCount={onlineCount}
        tasks={counts.tasks}
        tasksDone={counts.tasksDone}
      />

      <div className="mc-project-body" style={{ padding: '28px 28px calc(var(--taskbar-height, 70px) + 44px)', position: 'relative', zIndex: 1 }}>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{ marginBottom: 24 }}
        >
          <TwoPanesOffer projectId={id} phase={progressState.progress?.current.id ?? project.phase} />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
            {/* On a phone the split only stacks its two panes, which the pill and the tool header already do better. */}
            {!inPane && !phone.phone && (
              <Link href={`/split${projectPairSearch(id, progressState.progress?.current.id ?? project.phase, readPartner(id))}`} title="The project in one pane, the tool this phase works in beside it. Tools you open from the toolkit come up beside the project."
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 12px', borderRadius: 9999, border: '1px solid rgba(var(--ink-rgb), 0.12)', color: 'var(--fg-strong)', textDecoration: 'none' }}>
                <Columns2 size={13} aria-hidden /> Two panes
              </Link>
            )}
          </div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(2.6rem, 7vw, 4.4rem)', fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 0.9, margin: 0 }}>{project.title}</h1>
          <HereLine tool="project" />
          <LoglineEditor
            projectId={id}
            value={project.description}
            isOwner={ownerView}
            onSaved={(logline) => setRealProject(p => p ? { ...p, description: logline } : p)}
          />
        </motion.div>

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
              color="var(--studio-color)"
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
              { label: 'Timeline', value: counts.timeline },
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
              preview={<DistributionPreview submitted={counts.festivalsSubmitted} accepted={counts.festivalsAccepted} campaigns={counts.campaigns} />}
            />
          )}

        </div>

        {/* The owner's controls, grouped at the foot of the hub: the page
            opens on the project itself, not its admin (owner, Nov 26 2026). */}
        {project.isOwner && (
          <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ViewAsSwitch projectId={id} />
            <ViewAsBanner projectId={id} />
          </div>
        )}
        {ownerView && (
          <section aria-label="Project office" style={{ marginBottom: 24, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 20, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', color: 'var(--fg-dim)', margin: 0 }}>Project office</h2>
            <VisibilityPicker
              visibility={project.visibility}
              onVisibilityChange={changeVisibility}
              onCopyShareLink={copyShareLink}
            />
            <LogoEditor
              projectId={id}
              value={project.logoUrl ?? null}
              onSaved={(logoUrl) => { setRealProject(p => p ? { ...p, logoUrl } : p); refreshProject(id); }}
            />
            {me?.id && <AnnouncementBox projectId={id} projectTitle={project.title} userId={me.id} />}
          </section>
        )}

        {isRealProject && <div id="production" />}
        {isRealProject && <ProductionManager projectId={id} projectTitle={project.title} accent={project.color} isOwner={ownerView} />}
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );
}


