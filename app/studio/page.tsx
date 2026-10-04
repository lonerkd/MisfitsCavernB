'use client';

// The Studio — the production workspace of the suite. One project at a time:
// its library, the screenplay's scenes and their references, production
// planning, and what gets shared. Data lives in <StudioProvider> and stays live.

import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useLocationSearch } from '@/lib/hooks/useSearchParam';
import Link from 'next/link';
import dynamic from 'next/dynamic';
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
import { cx } from '@/components/studio/ui';
import s from '@/components/studio/studio.module.css';
import page from './studio-page.module.css';
import { useOnChange } from '@/lib/hooks/useOnChange';

// Each tab's code loads when it's opened, so the Studio opens fast on a phone
// (it used to ship every tab — the stripboard, money, post — up front).
const tabLoading = () => <div className={page.tabLoading} aria-busy="true"><span className={s.spinner} aria-label="Loading" /></div>;
const OverviewTab = dynamic(() => import('@/components/studio/tabs/OverviewTab').then((m) => m.OverviewTab), { loading: tabLoading });
const LibraryTab = dynamic(() => import('@/components/studio/tabs/LibraryTab').then((m) => m.LibraryTab), { loading: tabLoading });
const ScenesTab = dynamic(() => import('@/components/studio/tabs/ScenesTab').then((m) => m.ScenesTab), { loading: tabLoading });
const ProductionTab = dynamic(() => import('@/components/studio/tabs/ProductionTab').then((m) => m.ProductionTab), { loading: tabLoading });
const PostTab = dynamic(() => import('@/components/studio/tabs/PostTab').then((m) => m.PostTab), { loading: tabLoading });
const PromosTab = dynamic(() => import('@/components/studio/tabs/PromosTab').then((m) => m.PromosTab), { loading: tabLoading });
const PitchTab = dynamic(() => import('@/components/studio/tabs/PitchTab').then((m) => m.PitchTab), { loading: tabLoading });
const ShareTab = dynamic(() => import('@/components/studio/tabs/ShareTab').then((m) => m.ShareTab), { loading: tabLoading });

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
  // The address is the source of truth; choosing a tab rewrites it and re-renders.
  const params = new URLSearchParams(useLocationSearch());
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const t = params.get('tab') as TabId | null;
  const v = params.get('view') as ProductionView | null;
  const setTab = useCallback((next: TabId, nextView?: ProductionView) => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', next);
    if (nextView) url.searchParams.set('view', nextView); else url.searchParams.delete('view');
    window.history.replaceState(null, '', url);
    rerender();
  }, []);
  return [t && valid.includes(t) ? t : 'overview', v && VIEWS.includes(v) ? v : null, setTab];
}

export default function StudioPage() {
  const { isLoading, user } = useOSGate();
  const { activeProject, projects, setActiveProject, loading } = useProject();
  const modules = getProjectModules(activeProject?.settings);
  const tabs = ALL_TABS.filter((t) => t.id !== 'promos' || modules.distribution);
  const [tab, view, setTabRaw] = useTab(tabs.map((t) => t.id));
  const tabListRef = useRef<HTMLDivElement>(null);
  // On a narrow screen the tab bar scrolls sideways; keep the open tab in view.
  useEffect(() => {
    const reveal = () => tabListRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
    reveal();
    // Labels widen once the fonts load; place it again then.
    void document.fonts?.ready.then(reveal);
  }, [tab, activeProject?.id]);
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
  const resetPeeked = () => setPeeked(new Set(linked?.tab ? [linked.tab] : []));
  useOnChange(activeProject?.id, resetPeeked);
  useOnChange(linked, resetPeeked);
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
          fields: [{ label: 'Tab', value: tabs.find((t) => t.id === tab)?.label ?? '', color: 'var(--violet)' }],
          actions: [{ id: 'next-tab', label: 'Next tab →', onClick: () => setTab(tabs[(tabs.findIndex((t) => t.id === tab) + 1) % tabs.length].id) }],
        }
      : null,
  );

  return (
    <div className={cx(s.page, page.main)}>
      <h1 className="sr-only">Studio{activeProject ? ` — ${activeProject.title}` : ''}</h1>
      <GrainOverlay />
      <header className={page.bar}>
        <div className={page.barLeft}>
          <Link href="/" className={page.logo} aria-label="Misfits Cavern home">MC</Link>
          <span className={page.divider} aria-hidden />
          <span className={cx(page.module, 'mc-hide-phone')}>Studio</span>
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
          <Link href={`/projects/${activeProject.id}`} className={cx(s.btnGhost, s.small)}>Project<span className="mc-hide-phone">&nbsp;page</span></Link>
        )}
      </header>

      {activeProject && (
        <nav className={page.tabs} aria-label="Studio sections">
          <div ref={tabListRef} className={page.tabList} role="tablist">
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
