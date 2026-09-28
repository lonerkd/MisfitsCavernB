'use client';

// The Studio — the production workspace of the suite. One project at a time:
// its library, the screenplay's scenes and their references, production
// planning, and what gets shared. Data lives in <StudioProvider> and stays live.

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Archive, Clapperboard, Film, Globe, LayoutGrid, Lock, Maximize2, Megaphone, Video } from 'lucide-react';
import GrainOverlay from '@/components/GrainOverlay';
import { useOSGate, useProject } from '@/lib/os';
import { getProjectModules } from '@/lib/types/settings';
import { usePillStage } from '@/lib/context/PillContext';
import { StudioProvider } from '@/components/studio/StudioContext';
import { useProjectProgress } from '@/lib/hooks/useProjectProgress';
import { STUDIO_TAB_TOOL, toolState, type Place, type ProductionView } from '@/lib/os/progress';
import { LockedTool, ProgressContext } from '@/components/progress/LockedTool';
import { ToolIntro } from '@/components/progress/ToolIntro';
import { OverviewTab } from '@/components/studio/tabs/OverviewTab';
import { LibraryTab } from '@/components/studio/tabs/LibraryTab';
import { ScenesTab } from '@/components/studio/tabs/ScenesTab';
import { ProductionTab } from '@/components/studio/tabs/ProductionTab';
import { PostTab } from '@/components/studio/tabs/PostTab';
import { PromosTab } from '@/components/studio/tabs/PromosTab';
import { PitchTab } from '@/components/studio/tabs/PitchTab';
import { ShareTab } from '@/components/studio/tabs/ShareTab';
import { cx } from '@/components/studio/ui';
import s from '@/components/studio/studio.module.css';
import page from './studio-page.module.css';

type TabId = 'overview' | 'library' | 'scenes' | 'production' | 'post' | 'promos' | 'pitch' | 'share';
const ALL_TABS: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
  { id: 'overview', label: 'Overview', icon: <LayoutGrid size={12} /> },
  { id: 'library', label: 'Library', icon: <Archive size={12} /> },
  { id: 'scenes', label: 'Scenes', icon: <Clapperboard size={12} /> },
  { id: 'production', label: 'Production', icon: <Video size={12} /> },
  { id: 'post', label: 'Post', icon: <Film size={12} /> },
  { id: 'promos', label: 'Promos', icon: <Megaphone size={12} /> },
  { id: 'pitch', label: 'Pitch', icon: <Maximize2 size={12} /> },
  { id: 'share', label: 'Share', icon: <Globe size={12} /> },
];

const VIEWS: ProductionView[] = ['story', 'breakdown', 'readiness', 'locations', 'money', 'paperwork', 'schedule', 'onset', 'crew'];

/** The open tab (and Production view), mirrored in ?tab=&view= so links and reloads land in the same place. */
function useTab(valid: TabId[]): [TabId, ProductionView | null, (t: TabId, view?: ProductionView) => void] {
  const [tab, setTabState] = useState<TabId>('overview');
  const [view, setView] = useState<ProductionView | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('tab') as TabId | null;
    const v = params.get('view') as ProductionView | null;
    if (t && valid.includes(t)) setTabState(t);
    if (v && VIEWS.includes(v)) setView(v);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const setTab = useCallback((t: TabId, v?: ProductionView) => {
    setTabState(t);
    setView(v ?? null);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', t);
    if (v) url.searchParams.set('view', v); else url.searchParams.delete('view');
    window.history.replaceState(null, '', url);
  }, []);
  return [valid.includes(tab) ? tab : 'overview', view, setTab];
}

export default function StudioPage() {
  const { isLoading, user } = useOSGate();
  const { activeProject, projects, setActiveProject, loading } = useProject();
  const modules = getProjectModules(activeProject?.settings);
  const tabs = ALL_TABS.filter((t) => t.id !== 'promos' || modules.distribution);
  const [tab, view, setTabRaw] = useTab(tabs.map((t) => t.id));
  const progressState = useProjectProgress(activeProject?.id);
  const { progress, reload: reloadProgress } = progressState;
  // Tabs looked at before their phase, this visit ("Open it now").
  const [peeked, setPeeked] = useState<Set<TabId>>(new Set());
  // A link to a cut (?project=&tab=post&cut=, from a note in the script's
  // margin) opens that project's Post tab even before its phase.
  const [linked] = useState(() => {
    if (typeof window === 'undefined') return null;
    const q = new URLSearchParams(window.location.search);
    return q.get('cut') ? { project: q.get('project'), tab: q.get('tab') as TabId | null } : null;
  });
  useEffect(() => {
    if (!linked?.project || activeProject?.id === linked.project) return;
    const p = projects.find((x) => x.id === linked.project);
    if (p) setActiveProject(p);
  }, [linked, projects, activeProject?.id, setActiveProject]);
  useEffect(() => { setPeeked(new Set(linked?.tab ? [linked.tab] : [])); }, [activeProject?.id, linked]);
  const setTab = useCallback((t: TabId, v?: ProductionView) => {
    setTabRaw(t, v);
    void reloadProgress();
  }, [setTabRaw, reloadProgress]);
  const navigate = useCallback((place: Place) => {
    if (place.kind !== 'studio' || !tabs.some((t) => t.id === place.tab)) return false;
    setTab(place.tab, place.view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return true;
  }, [setTab, tabs]);
  const lockedTool = (t: TabId) => {
    const id = STUDIO_TAB_TOOL[t];
    const state = id ? toolState(progress, id) : null;
    return state && !state.unlocked ? state : null;
  };
  const tabLock = lockedTool(tab);

  usePillStage(
    activeProject
      ? {
          module: 'studio',
          title: activeProject.title,
          accent: activeProject.accent_color || '#6366f1',
          fields: [{ label: 'Tab', value: tabs.find((t) => t.id === tab)?.label ?? '', color: '#818cf8' }],
          actions: [{ id: 'next-tab', label: 'Next tab →', onClick: () => setTab(tabs[(tabs.findIndex((t) => t.id === tab) + 1) % tabs.length].id) }],
        }
      : null,
    [activeProject?.id, activeProject?.title, activeProject?.accent_color, tab, tabs.length],
  );

  return (
    <div className={cx(s.page, page.main)}>
      <h1 className="sr-only">Studio{activeProject ? ` — ${activeProject.title}` : ''}</h1>
      <GrainOverlay />
      <header className={page.bar}>
        <div className={page.barLeft}>
          <Link href="/" className={page.logo} aria-label="Misfits Cavern home">MC</Link>
          <span className={page.divider} aria-hidden />
          <span className={page.module}>Studio</span>
          {projects.length > 0 && (
            <label className={page.projectPicker}>
              <select
                aria-label="Active project"
                value={activeProject?.id ?? ''}
                onChange={(e) => { const p = projects.find((x) => x.id === e.target.value); if (p) setActiveProject(p); }}
              >
                {!activeProject && <option value="">Choose a project</option>}
                {projects.filter((p) => !p.archived_at || p.id === activeProject?.id).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </label>
          )}
        </div>
        {activeProject && (
          <Link href={`/projects/${activeProject.id}`} className={cx(s.btnGhost, s.small)}>Project page</Link>
        )}
      </header>

      {activeProject && (
        <nav className={page.tabs} aria-label="Studio sections">
          <div className={page.tabList} role="tablist">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={cx(page.tab, tab === t.id && page.tabOn)}
                onClick={() => setTab(t.id)}
              >
                {t.icon} {t.label}
                {lockedTool(t.id) && !peeked.has(t.id) && (
                  <>
                    <Lock size={9} aria-hidden style={{ opacity: 0.7 }} />
                    <span className="sr-only">(opens in {lockedTool(t.id)!.phaseLabel})</span>
                  </>
                )}
              </button>
            ))}
          </div>
        </nav>
      )}

      <div className={page.content}>
        {isLoading || (loading && !activeProject) ? (
          <div className={s.stack} aria-busy="true">
            <div className="skeleton" style={{ height: 40, width: 280, borderRadius: 8 }} />
            <div className="skeleton" style={{ height: 180, borderRadius: 14 }} />
          </div>
        ) : !activeProject || !user ? (
          <div className={page.empty}>
            <div className={s.eyebrow}>Studio</div>
            <h1 className={s.title}>{projects.length ? 'Choose a project' : 'Start a project'}</h1>
            <p className={s.subtitle} style={{ margin: '8px auto 0' }}>
              The Studio works on one production at a time — its library, scenes, schedule and share link.
            </p>
            <Link href="/projects" className={s.btnPrimary} style={{ marginTop: 20 }}>{projects.length ? 'Your projects' : 'Create a project'}</Link>
          </div>
        ) : (
          <StudioProvider key={activeProject.id} project={activeProject} userId={user.id} onNavigate={(t, v) => navigate({ kind: 'studio', tab: t, view: v })}>
            <ProgressContext.Provider value={progressState}>
              <div role="tabpanel">
                {tabLock && !peeked.has(tab) ? (
                  <LockedTool
                    tool={tabLock}
                    accent={activeProject.accent_color}
                    onOpen={() => setPeeked((prev) => new Set(prev).add(tab))}
                    onShowPhase={() => setTab('overview')}
                  />
                ) : (
                  <>
                    {STUDIO_TAB_TOOL[tab] && <ToolIntro tool={toolState(progress, STUDIO_TAB_TOOL[tab]!)} accent={activeProject.accent_color} />}
                    {tab === 'overview' && <OverviewTab onOpen={setTab} onNavigate={navigate} />}
                    {tab === 'library' && <LibraryTab />}
                    {tab === 'scenes' && <ScenesTab />}
                    {tab === 'production' && <ProductionTab view={view ?? 'story'} onView={(v) => setTabRaw('production', v)} onNavigate={navigate} />}
                    {tab === 'post' && <PostTab />}
                    {tab === 'promos' && <PromosTab />}
                    {tab === 'pitch' && <PitchTab />}
                    {tab === 'share' && <ShareTab />}
                  </>
                )}
              </div>
            </ProgressContext.Provider>
          </StudioProvider>
        )}
      </div>
    </div>
  );
}
