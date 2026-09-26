'use client';

// The Studio — the production workspace of the suite. One project at a time:
// its library, the screenplay's scenes and their references, production
// planning, and what gets shared. Data lives in <StudioProvider> and stays live.

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Archive, Clapperboard, Globe, LayoutGrid, Maximize2, Megaphone, Video } from 'lucide-react';
import GrainOverlay from '@/components/GrainOverlay';
import { useOSGate, useProject } from '@/lib/os';
import { getProjectModules } from '@/lib/types/settings';
import { usePillStage } from '@/lib/context/PillContext';
import { StudioProvider } from '@/components/studio/StudioContext';
import { OverviewTab } from '@/components/studio/tabs/OverviewTab';
import { LibraryTab } from '@/components/studio/tabs/LibraryTab';
import { ScenesTab } from '@/components/studio/tabs/ScenesTab';
import { ProductionTab } from '@/components/studio/tabs/ProductionTab';
import { PromosTab } from '@/components/studio/tabs/PromosTab';
import { PitchTab } from '@/components/studio/tabs/PitchTab';
import { ShareTab } from '@/components/studio/tabs/ShareTab';
import { cx } from '@/components/studio/ui';
import s from '@/components/studio/studio.module.css';
import page from './studio-page.module.css';

type TabId = 'overview' | 'library' | 'scenes' | 'production' | 'promos' | 'pitch' | 'share';
const ALL_TABS: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
  { id: 'overview', label: 'Overview', icon: <LayoutGrid size={12} /> },
  { id: 'library', label: 'Library', icon: <Archive size={12} /> },
  { id: 'scenes', label: 'Scenes', icon: <Clapperboard size={12} /> },
  { id: 'production', label: 'Production', icon: <Video size={12} /> },
  { id: 'promos', label: 'Promos', icon: <Megaphone size={12} /> },
  { id: 'pitch', label: 'Pitch', icon: <Maximize2 size={12} /> },
  { id: 'share', label: 'Share', icon: <Globe size={12} /> },
];

/** The open tab, mirrored in ?tab= so links and reloads land in the same place. */
function useTab(valid: TabId[]): [TabId, (t: TabId) => void] {
  const [tab, setTabState] = useState<TabId>('overview');
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab') as TabId | null;
    if (t && valid.includes(t)) setTabState(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const setTab = useCallback((t: TabId) => {
    setTabState(t);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', t);
    window.history.replaceState(null, '', url);
  }, []);
  return [valid.includes(tab) ? tab : 'overview', setTab];
}

export default function StudioPage() {
  const { isLoading, user } = useOSGate();
  const { activeProject, projects, setActiveProject, loading } = useProject();
  const modules = getProjectModules(activeProject?.settings);
  const tabs = ALL_TABS.filter((t) => t.id !== 'promos' || modules.distribution);
  const [tab, setTab] = useTab(tabs.map((t) => t.id));

  usePillStage(
    activeProject
      ? {
          module: 'studio',
          title: activeProject.title,
          accent: activeProject.accent_color || '#6366f1',
          fields: [{ label: 'Tab', value: tabs.find((t) => t.id === tab)?.label ?? '', color: '#6366f1' }],
          actions: [{ id: 'next-tab', label: 'Next tab →', onClick: () => setTab(tabs[(tabs.findIndex((t) => t.id === tab) + 1) % tabs.length].id) }],
        }
      : null,
    [activeProject?.id, activeProject?.title, activeProject?.accent_color, tab, tabs.length],
  );

  return (
    <main className={cx(s.page, page.main)}>
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
                {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
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
          <StudioProvider key={activeProject.id} project={activeProject} userId={user.id}>
            <div role="tabpanel">
              {tab === 'overview' && <OverviewTab onOpen={setTab} />}
              {tab === 'library' && <LibraryTab />}
              {tab === 'scenes' && <ScenesTab />}
              {tab === 'production' && <ProductionTab />}
              {tab === 'promos' && <PromosTab />}
              {tab === 'pitch' && <PitchTab />}
              {tab === 'share' && <ShareTab />}
            </div>
          </StudioProvider>
        )}
      </div>
    </main>
  );
}
