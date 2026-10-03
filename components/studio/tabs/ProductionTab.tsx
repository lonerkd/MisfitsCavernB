'use client';

import React, { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { BookOpen, Calendar, Clapperboard, ClipboardCheck, DollarSign, FileCheck2, Lock, MapPin, Tags, Users } from 'lucide-react';
import { PRODUCTION_VIEW_TOOL, toolState, type Place, type ProductionView } from '@/lib/os/progress';
import { LockedTool, useProgressContext } from '@/components/progress/LockedTool';
import { ToolIntro } from '@/components/progress/ToolIntro';
import { getProjectCrew } from '@/lib/supabase/crew-management';
import { useStudio } from '../StudioContext';
import { SectionHeader, cx } from '../ui';
import type { CrewRow } from '../production/CrewView';
import s from '../studio.module.css';

// Each view's code loads when it's opened (the stripboard, money and On Set are
// heavy; a phone on set shouldn't download the budget to see the call sheet).
const viewLoading = () => <div style={{ minHeight: 240, display: 'grid', placeItems: 'center' }} aria-busy="true"><span className={s.spinner} aria-label="Loading" /></div>;
const StoryView = dynamic(() => import('../production/StoryView').then((m) => m.StoryView), { loading: viewLoading });
const ScheduleView = dynamic(() => import('../production/ScheduleView').then((m) => m.ScheduleView), { loading: viewLoading });
const BreakdownView = dynamic(() => import('../production/BreakdownView').then((m) => m.BreakdownView), { loading: viewLoading });
const ReadinessView = dynamic(() => import('../production/ReadinessView').then((m) => m.ReadinessView), { loading: viewLoading });
const LocationsView = dynamic(() => import('../production/LocationsView').then((m) => m.LocationsView), { loading: viewLoading });
const MoneyView = dynamic(() => import('../production/MoneyView').then((m) => m.MoneyView), { loading: viewLoading });
const PaperworkView = dynamic(() => import('../production/PaperworkView').then((m) => m.PaperworkView), { loading: viewLoading });
const OnSetView = dynamic(() => import('../production/OnSetView').then((m) => m.OnSetView), { loading: viewLoading });
const CrewView = dynamic(() => import('../production/CrewView').then((m) => m.CrewView), { loading: viewLoading });

type View = ProductionView;
const VIEWS: Array<{ id: View; label: string; icon: React.ReactNode }> = [
  { id: 'story', label: 'Story', icon: <BookOpen size={12} /> },
  { id: 'breakdown', label: 'Breakdown', icon: <Tags size={12} /> },
  { id: 'readiness', label: 'Readiness', icon: <ClipboardCheck size={12} /> },
  { id: 'locations', label: 'Locations', icon: <MapPin size={12} /> },
  { id: 'money', label: 'Money', icon: <DollarSign size={12} /> },
  { id: 'paperwork', label: 'Paperwork', icon: <FileCheck2 size={12} /> },
  { id: 'schedule', label: 'Schedule', icon: <Calendar size={12} /> },
  { id: 'onset', label: 'On set', icon: <Clapperboard size={12} /> },
  { id: 'crew', label: 'Cast & crew', icon: <Users size={12} /> },
];

/** Story, schedule and people. The view is the Studio's (?view=), so milestones can link straight to it. */
export function ProductionTab({ view, onView, onNavigate }: { view: View; onView: (view: View) => void; onNavigate?: (place: Place) => boolean }) {
  const { project } = useStudio();
  const progress = useProgressContext()?.progress ?? null;
  const [peeked, setPeeked] = useState<Set<View>>(new Set());
  const lockOf = (v: View) => {
    const id = PRODUCTION_VIEW_TOOL[v];
    const t = id ? toolState(progress, id) : null;
    return t && !t.unlocked && !peeked.has(v) ? t : null;
  };
  const lock = lockOf(view);
  const [crew, setCrew] = useState<CrewRow[]>([]);

  const loadCrew = useCallback(() => getProjectCrew(project.id).then((rows) => setCrew(rows as unknown as CrewRow[])), [project.id]);
  // The OS store's crew changes live (Realtime); refetch the joined rows then.
  const crewSignature = (project.crew ?? []).map((c) => `${c.id}:${c.role}`).join(',');
  useEffect(() => { void loadCrew(); }, [loadCrew, crewSignature]);

  return (
    <section aria-labelledby="production-title">
      <SectionHeader id="production-title" eyebrow="Pre-production" title="Production" subtitle="Story, breakdown, readiness, schedule, the day on set and people — built from the screenplay and kept in step with it." />
      <div className={s.chips} role="tablist" aria-label="Production views" style={{ marginBottom: 24 }}>
        {VIEWS.map((v) => (
          <button key={v.id} type="button" role="tab" aria-selected={view === v.id} className={cx(s.chip, view === v.id && s.chipOn)} onClick={() => onView(v.id)}>
            {v.icon} {v.label}
            {lockOf(v.id) && <><Lock size={9} aria-hidden style={{ opacity: 0.7 }} /><span className="sr-only">(opens in {lockOf(v.id)!.phaseLabel})</span></>}
          </button>
        ))}
      </div>
      {!lock && PRODUCTION_VIEW_TOOL[view] && <ToolIntro tool={toolState(progress, PRODUCTION_VIEW_TOOL[view]!)} accent={project.accent_color} />}
      {lock && <LockedTool tool={lock} accent={project.accent_color} onOpen={() => setPeeked((prev) => new Set(prev).add(view))} />}
      {!lock && view === 'story' && <StoryView />}
      {!lock && view === 'breakdown' && <BreakdownView crew={crew.map((c) => ({ user_id: c.user_id, username: c.profiles?.username ?? 'Crew' }))} />}
      {!lock && view === 'readiness' && <ReadinessView onNavigate={onNavigate ?? ((p) => { if (p.kind === 'studio' && p.tab === 'production' && p.view) { onView(p.view); return true; } return false; })} />}
      {!lock && view === 'locations' && <LocationsView />}
      {!lock && view === 'money' && <MoneyView crew={crew.map((c) => ({ user_id: c.user_id, username: c.profiles?.username ?? 'Crew' }))} />}
      {!lock && view === 'paperwork' && <PaperworkView crew={crew.map((c) => ({ user_id: c.user_id, username: c.profiles?.username ?? 'Crew', craft: c.craft ?? null }))} />}
      {!lock && view === 'onset' && <OnSetView onNavigate={onNavigate ?? ((p) => { if (p.kind === 'studio' && p.tab === 'production' && p.view) { onView(p.view); return true; } return false; })} />}
      {!lock && view === 'schedule' && <ScheduleView crew={crew.map((c) => ({ ...c, username: c.profiles?.username ?? undefined }))} />}
      {!lock && view === 'crew' && <CrewView crew={crew} onChanged={() => void loadCrew()} />}
    </section>
  );
}
