'use client';

import React, { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { BookOpen, Calendar, Camera, Car, ChefHat, ClipboardList, Clapperboard, ClipboardCheck, Cloud, DollarSign, Eye, FileCheck2, FileText, Lock, MapPin, Shield, Tags, Users } from 'lucide-react';
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
const ContinuityView = dynamic(() => import('../production/ContinuityView').then((m) => m.ContinuityView), { loading: viewLoading });
const ShotListView = dynamic(() => import('../production/ShotListView').then((m) => m.ShotListView), { loading: viewLoading });
const CrewView = dynamic(() => import('../production/CrewView').then((m) => m.CrewView), { loading: viewLoading });
const ProductionReportView = dynamic(() => import('../production/ProductionReportView').then((m) => m.ProductionReportView), { loading: viewLoading });
const WeatherView = dynamic(() => import('../production/WeatherView').then((m) => m.WeatherView), { loading: viewLoading });
const CateringView = dynamic(() => import('../production/CateringView').then((m) => m.CateringView), { loading: viewLoading });
const SafetyView = dynamic(() => import('../production/SafetyView').then((m) => m.SafetyView), { loading: viewLoading });
const PropsView = dynamic(() => import('../production/PropsView').then((m) => m.PropsView), { loading: viewLoading });
const TransportView = dynamic(() => import('../production/TransportView').then((m) => m.TransportView), { loading: viewLoading });

type View = ProductionView;
const VIEWS: Array<{ id: View; label: string; icon: React.ReactNode; group: string }> = [
  { id: 'story', label: 'Story', icon: <BookOpen size={12} />, group: 'Pre-production' },
  { id: 'breakdown', label: 'Breakdown', icon: <Tags size={12} />, group: 'Pre-production' },
  { id: 'readiness', label: 'Readiness', icon: <ClipboardCheck size={12} />, group: 'Pre-production' },
  { id: 'locations', label: 'Locations', icon: <MapPin size={12} />, group: 'Pre-production' },
  { id: 'props', label: 'Props', icon: <ClipboardList size={12} />, group: 'Pre-production' },
  { id: 'continuity', label: 'Continuity', icon: <Eye size={12} />, group: 'Pre-production' },
  { id: 'money', label: 'Money', icon: <DollarSign size={12} />, group: 'Budget & docs' },
  { id: 'paperwork', label: 'Paperwork', icon: <FileCheck2 size={12} />, group: 'Budget & docs' },
  { id: 'schedule', label: 'Schedule', icon: <Calendar size={12} />, group: 'Shoot' },
  { id: 'onset', label: 'On set', icon: <Clapperboard size={12} />, group: 'Shoot' },
  { id: 'shots', label: 'Shot list', icon: <Camera size={12} />, group: 'Shoot' },
  { id: 'weather', label: 'Weather', icon: <Cloud size={12} />, group: 'Shoot' },
  { id: 'catering', label: 'Catering', icon: <ChefHat size={12} />, group: 'Shoot' },
  { id: 'safety', label: 'Safety', icon: <Shield size={12} />, group: 'Shoot' },
  { id: 'transport', label: 'Transport', icon: <Car size={12} />, group: 'Shoot' },
  { id: 'reports', label: 'Reports', icon: <FileText size={12} />, group: 'Shoot' },
  { id: 'crew', label: 'Cast & crew', icon: <Users size={12} />, group: 'People' },
];

const GROUPS = ['Pre-production', 'Budget & docs', 'Shoot', 'People'];

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
      <SectionHeader id="production-title" title="Production" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {GROUPS.map((group) => (
                <div key={group} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', minWidth: 90, flexShrink: 0 }}>{group}</span>
                  <div className={s.chips} role="tablist" aria-label={`${group} views`} style={{ marginBottom: 0 }}>
                    {VIEWS.filter((v) => v.group === group).map((v) => (
                      <button key={v.id} type="button" role="tab" aria-selected={view === v.id} className={cx(s.chip, view === v.id && s.chipOn)} onClick={() => onView(v.id)}>
                        {v.icon} {v.label}
                        {lockOf(v.id) && <><Lock size={9} aria-hidden style={{ opacity: 0.7 }} /><span className="sr-only">(opens in {lockOf(v.id)!.phaseLabel})</span></>}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
      {!lock && PRODUCTION_VIEW_TOOL[view] && <ToolIntro tool={toolState(progress, PRODUCTION_VIEW_TOOL[view]!)} accent={project.accent_color} />}
      {lock && <LockedTool tool={lock} accent={project.accent_color} onOpen={() => setPeeked((prev) => new Set(prev).add(view))} />}
      {!lock && view === 'story' && <StoryView />}
      {!lock && view === 'breakdown' && <BreakdownView crew={crew.map((c) => ({ user_id: c.user_id, username: c.profiles?.username ?? 'Crew' }))} onNavigate={(v) => onView(v as View)} />}
      {!lock && view === 'readiness' && <ReadinessView onNavigate={onNavigate ?? ((p) => { if (p.kind === 'studio' && p.tab === 'production' && p.view) { onView(p.view); return true; } return false; })} />}
      {!lock && view === 'locations' && <LocationsView />}
      {!lock && view === 'continuity' && <ContinuityView />}
      {!lock && view === 'money' && <MoneyView crew={crew.map((c) => ({ user_id: c.user_id, username: c.profiles?.username ?? 'Crew' }))} />}
      {!lock && view === 'paperwork' && <PaperworkView crew={crew.map((c) => ({ user_id: c.user_id, username: c.profiles?.username ?? 'Crew', craft: c.craft ?? null }))} />}
      {!lock && view === 'onset' && <OnSetView onNavigate={onNavigate ?? ((p) => { if (p.kind === 'studio' && p.tab === 'production' && p.view) { onView(p.view); return true; } return false; })} />}
      {!lock && view === 'shots' && <ShotListView />}
      {!lock && view === 'weather' && <WeatherView />}
      {!lock && view === 'catering' && <CateringView />}
      {!lock && view === 'safety' && <SafetyView />}
      {!lock && view === 'props' && <PropsView />}
      {!lock && view === 'transport' && <TransportView />}
      {!lock && view === 'reports' && <ProductionReportView />}
      {!lock && view === 'schedule' && <ScheduleView crew={crew.map((c) => ({ ...c, username: c.profiles?.username ?? undefined }))} />}
      {!lock && view === 'crew' && <CrewView crew={crew} onChanged={() => void loadCrew()} />}
    </section>
  );
}
