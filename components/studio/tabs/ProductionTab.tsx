'use client';

import Link from 'next/link';
import React, { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { AlertTriangle, BookOpen, Calendar, CalendarDays, Camera, Car, ChefHat, ChevronRight, ClipboardList, Clapperboard, ClipboardCheck, Cloud, DollarSign, Eye, FileCheck, FileCheck2, FileText, HardDrive, Images, Lock, Send, ShieldAlert, UsersRound, MapPin, MessageCircle, Mic, Palette, Receipt, Shield, Shirt, Sparkles, Star, Tags, Users, Wrench } from 'lucide-react';
import { recentServerSnapshot, recentSnapshot, recordRecent, subscribeRecent } from '@/lib/studio/recent-tools';
import { useMyCapabilities, useMyRole } from '@/lib/roles/capabilities';
import { YourWorkflow } from '../production/YourWorkflow';
import { openableViews, toolkitFor } from '@/lib/roles/toolkit';
import { useCrafts } from '@/lib/crafts/crafts';
import { PRODUCTION_VIEW_LABELS, PRODUCTION_VIEW_TOOL, toolState, type Place, type ProductionView } from '@/lib/os/progress';
import { LockedTool, useProgressContext } from '@/components/progress/LockedTool';
import { ToolIntro } from '@/components/progress/ToolIntro';
import { getProjectCrew } from '@/lib/supabase/crew-management';
import { recordKindOfView } from '@/lib/studio/records-print';
import { useStudio } from '../StudioContext';
import { SectionHeader, cx } from '../ui';
import { ToolHeader, ToolActionsContext } from '../ToolHeader';
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
const DoodView = dynamic(() => import('../production/DoodView').then((m) => m.DoodView), { loading: viewLoading });
const EditorialView = dynamic(() => import('../production/EditorialView').then((m) => m.EditorialView), { loading: viewLoading });
const ClaimsView = dynamic(() => import('../production/ClaimsView').then((m) => m.ClaimsView), { loading: viewLoading });
const ExtrasView = dynamic(() => import('../production/ExtrasView').then((m) => m.ExtrasView), { loading: viewLoading });
const PrintRecordsButton = dynamic(() => import('../production/PrintRecordsButton').then((m) => m.PrintRecordsButton), { loading: () => null });
const StillsView = dynamic(() => import('../production/StillsView').then((m) => m.StillsView), { loading: viewLoading });
const MakeupView = dynamic(() => import('../production/MakeupView').then((m) => m.MakeupView), { loading: viewLoading });
const MediaOffloadView = dynamic(() => import('../production/MediaOffloadView').then((m) => m.MediaOffloadView), { loading: viewLoading });
const PoView = dynamic(() => import('../production/PoView').then((m) => m.PoView), { loading: viewLoading });
const ScriptSupView = dynamic(() => import('../production/ScriptSupView').then((m) => m.ScriptSupView), { loading: viewLoading });
const PermitView = dynamic(() => import('../production/PermitView').then((m) => m.PermitView), { loading: viewLoading });
const CostumeView = dynamic(() => import('../production/CostumeView').then((m) => m.CostumeView), { loading: viewLoading });
const VfxView = dynamic(() => import('../production/VfxView').then((m) => m.VfxView), { loading: viewLoading });
const SoundReportView = dynamic(() => import('../production/SoundReportView').then((m) => m.SoundReportView), { loading: viewLoading });
const CameraReportView = dynamic(() => import('../production/CameraReportView').then((m) => m.CameraReportView), { loading: viewLoading });
const RiskRegisterView = dynamic(() => import('../production/RiskRegisterView').then((m) => m.RiskRegisterView), { loading: viewLoading });
const DirectorNotebookView = dynamic(() => import('../production/DirectorNotebookView').then((m) => m.DirectorNotebookView), { loading: viewLoading });
const RevisionsView = dynamic(() => import('../production/RevisionsView').then((m) => m.RevisionsView), { loading: viewLoading });
const ScoutView = dynamic(() => import('../production/ScoutView').then((m) => m.ScoutView), { loading: viewLoading });
const RehearsalView = dynamic(() => import('../production/RehearsalView').then((m) => m.RehearsalView), { loading: viewLoading });
const WrapView = dynamic(() => import('../production/WrapView').then((m) => m.WrapView), { loading: viewLoading });
const GearView = dynamic(() => import('../production/GearView').then((m) => m.GearView), { loading: viewLoading });
const CommsView = dynamic(() => import('../production/CommsView').then((m) => m.CommsView), { loading: viewLoading });
const CastBreakdownView = dynamic(() => import('../production/CastBreakdownView').then((m) => m.CastBreakdownView), { loading: viewLoading });
const TransportView = dynamic(() => import('../production/TransportView').then((m) => m.TransportView), { loading: viewLoading });
const WorldView = dynamic(() => import('../production/WorldView').then((m) => m.WorldView), { loading: viewLoading });

type View = ProductionView;
export const VIEWS: Array<{ id: View; label: string; icon: React.ReactNode; group: string }> = [
  { id: 'story', label: PRODUCTION_VIEW_LABELS.story, icon: <BookOpen size={12} />, group: 'Story & planning' },
  { id: 'breakdown', label: PRODUCTION_VIEW_LABELS.breakdown, icon: <Tags size={12} />, group: 'Story & planning' },
  { id: 'readiness', label: PRODUCTION_VIEW_LABELS.readiness, icon: <ClipboardCheck size={12} />, group: 'Story & planning' },
  { id: 'locations', label: PRODUCTION_VIEW_LABELS.locations, icon: <MapPin size={12} />, group: 'Story & planning' },
  { id: 'world', label: PRODUCTION_VIEW_LABELS.world, icon: <BookOpen size={12} />, group: 'Story & planning' },
  { id: 'props', label: PRODUCTION_VIEW_LABELS.props, icon: <ClipboardList size={12} />, group: 'Departments' },
  { id: 'continuity', label: PRODUCTION_VIEW_LABELS.continuity, icon: <Eye size={12} />, group: 'Story & planning' },
  { id: 'money', label: PRODUCTION_VIEW_LABELS.money, icon: <DollarSign size={12} />, group: 'Budget & docs' },
  { id: 'paperwork', label: PRODUCTION_VIEW_LABELS.paperwork, icon: <FileCheck2 size={12} />, group: 'Budget & docs' },
  { id: 'schedule', label: PRODUCTION_VIEW_LABELS.schedule, icon: <Calendar size={12} />, group: 'Shoot day' },
  { id: 'onset', label: PRODUCTION_VIEW_LABELS.onset, icon: <Clapperboard size={12} />, group: 'Shoot day' },
  { id: 'shots', label: PRODUCTION_VIEW_LABELS.shots, icon: <Camera size={12} />, group: 'Shoot day' },
  { id: 'weather', label: PRODUCTION_VIEW_LABELS.weather, icon: <Cloud size={12} />, group: 'Shoot day' },
  { id: 'catering', label: PRODUCTION_VIEW_LABELS.catering, icon: <ChefHat size={12} />, group: 'Shoot day' },
  { id: 'safety', label: PRODUCTION_VIEW_LABELS.safety, icon: <Shield size={12} />, group: 'Shoot day' },
  { id: 'transport', label: PRODUCTION_VIEW_LABELS.transport, icon: <Car size={12} />, group: 'Shoot day' },
  { id: 'reports', label: PRODUCTION_VIEW_LABELS.reports, icon: <FileText size={12} />, group: 'Reports & logs' },
  { id: 'makeup', label: PRODUCTION_VIEW_LABELS.makeup, icon: <Palette size={12} />, group: 'Departments' },
  { id: 'editorial', label: PRODUCTION_VIEW_LABELS.editorial, icon: <Send size={12} />, group: 'Reports & logs' },
  { id: 'claims', label: PRODUCTION_VIEW_LABELS.claims, icon: <ShieldAlert size={12} />, group: 'Budget & docs' },
  { id: 'extras', label: PRODUCTION_VIEW_LABELS.extras, icon: <UsersRound size={12} />, group: 'Departments' },
  { id: 'stills', label: PRODUCTION_VIEW_LABELS.stills, icon: <Images size={12} />, group: 'Reports & logs' },
  { id: 'mediaoffload', label: PRODUCTION_VIEW_LABELS.mediaoffload, icon: <HardDrive size={12} />, group: 'Reports & logs' },
  { id: 'po', label: PRODUCTION_VIEW_LABELS.po, icon: <Receipt size={12} />, group: 'Budget & docs' },
  { id: 'scriptsup', label: PRODUCTION_VIEW_LABELS.scriptsup, icon: <Star size={12} />, group: 'Reports & logs' },
  { id: 'permit', label: PRODUCTION_VIEW_LABELS.permit, icon: <FileCheck size={12} />, group: 'Departments' },
  { id: 'costume', label: PRODUCTION_VIEW_LABELS.costume, icon: <Shirt size={12} />, group: 'Departments' },
  { id: 'vfx', label: PRODUCTION_VIEW_LABELS.vfx, icon: <Sparkles size={12} />, group: 'Departments' },
  { id: 'sound', label: PRODUCTION_VIEW_LABELS.sound, icon: <Mic size={12} />, group: 'Reports & logs' },
  { id: 'camera', label: PRODUCTION_VIEW_LABELS.camera, icon: <Camera size={12} />, group: 'Reports & logs' },
  { id: 'risk', label: PRODUCTION_VIEW_LABELS.risk, icon: <AlertTriangle size={12} />, group: 'Budget & docs' },
  { id: 'director', label: PRODUCTION_VIEW_LABELS.director, icon: <Clapperboard size={12} />, group: 'Story & planning' },
  { id: 'revisions', label: PRODUCTION_VIEW_LABELS.revisions, icon: <FileText size={12} />, group: 'Story & planning' },
  { id: 'scout', label: PRODUCTION_VIEW_LABELS.scout, icon: <MapPin size={12} />, group: 'Story & planning' },
  { id: 'rehearsal', label: PRODUCTION_VIEW_LABELS.rehearsal, icon: <CalendarDays size={12} />, group: 'Story & planning' },
  { id: 'wrap', label: PRODUCTION_VIEW_LABELS.wrap, icon: <ClipboardCheck size={12} />, group: 'Reports & logs' },
  { id: 'gear', label: PRODUCTION_VIEW_LABELS.gear, icon: <Wrench size={12} />, group: 'Departments' },
  { id: 'dood', label: PRODUCTION_VIEW_LABELS.dood, icon: <Calendar size={12} />, group: 'Shoot day' },
  { id: 'comms', label: PRODUCTION_VIEW_LABELS.comms, icon: <MessageCircle size={12} />, group: 'People' },
  { id: 'cast', label: PRODUCTION_VIEW_LABELS.cast, icon: <Users size={12} />, group: 'People' },
  { id: 'crew', label: PRODUCTION_VIEW_LABELS.crew, icon: <Users size={12} />, group: 'People' },
];

const VIEW_IDS: string[] = VIEWS.map((v) => v.id);

/** The views whose layout has no header of its own: the Production tab gives them one (the rest open with their own ToolHeader). */
const TAB_HEADED: Partial<Record<View, string>> = {
  story: 'The story laid out by act, scene and story day.',
  breakdown: 'Every prop, costume, vehicle and effect the script needs, scene by scene.',
  readiness: 'What is ready for the next shoot day, and what unblocks the most.',
  schedule: 'The stripboard: scenes onto shoot days, then the call sheet.',
  onset: 'The shoot day as it happens: the call, the set log and the wrap.',
};

export const GROUPS = ['Story & planning', 'Departments', 'Budget & docs', 'Shoot day', 'Reports & logs', 'People'];

/** Story, schedule and people. The view is the Studio's (?view=), so milestones can link straight to it. */
export function ProductionTab({ view, onView, onNavigate }: { view: View; onView: (view: View) => void; onNavigate?: (place: Place) => boolean }) {
  const { project, userId } = useStudio();
  const progress = useProgressContext()?.progress ?? null;
  // A person's own tools come first (their craft's working suite), without hiding anyone else's: the groups below stay whole.
  const me = useMyRole(project.id, userId);
  const myCaps = useMyCapabilities(project.id);
  const { byName: craftsByName } = useCrafts();
  const kit = me.craft || me.previewing ? toolkitFor(me.craft, me.craft ? craftsByName.get(me.craft)?.department : null) : null;
  const myViews = kit ? openableViews(kit, myCaps.caps) : [];
  const [peeked, setPeeked] = useState<Set<View>>(new Set());
  const lockOf = (v: View) => {
    const id = PRODUCTION_VIEW_TOOL[v];
    const t = id ? toolState(progress, id) : null;
    return t && !t.unlocked && !peeked.has(v) ? t : null;
  };
  const lock = lockOf(view);
  const [crew, setCrew] = useState<CrewRow[]>([]);
  const [find, setFind] = useState('');
  const q = find.trim().toLowerCase();
  // A search keeps the open view's chip in sight, so the list never hides where you are.
  const shown = (v: (typeof VIEWS)[number]) => !q || v.label.toLowerCase().includes(q) || v.id === view;
  // Groups can be folded; a search opens every group with a match, so a fold never hides a result.
  const [folded, setFolded] = useState<Set<string>>(new Set());
  // The full list stays shut until asked for (the open tool, "Your tools" and "Recently used" are always in reach); a search opens it.
  const [showAll, setShowAll] = useState(false);
  const listOpen = showAll || !!q;
  const toggleGroup =(g: string) => setFolded((prev) => { const n = new Set(prev); if (n.has(g)) n.delete(g); else n.add(g); return n; });
  // The last six tools opened, on this device only.
  const recent = useSyncExternalStore(subscribeRecent, () => recentSnapshot(VIEW_IDS), recentServerSnapshot);
  useEffect(() => { recordRecent(view, VIEW_IDS); }, [view]);
  const recentViews = recent.map((id) => VIEWS.find((v) => v.id === id)).filter((v): v is (typeof VIEWS)[number] => !!v && v.id !== view && shown(v));

  const loadCrew = useCallback(() => getProjectCrew(project.id).then((rows) => setCrew(rows as unknown as CrewRow[])), [project.id]);
  // The OS store's crew changes live (Realtime); refetch the joined rows then.
  const crewSignature = (project.crew ?? []).map((c) => `${c.id}:${c.role}`).join(',');
  useEffect(() => { void loadCrew(); }, [loadCrew, crewSignature]);

  return (
    <section aria-labelledby="production-title">
      <SectionHeader id="production-title" title="Production" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <input type="search" aria-label="Find a production tool" placeholder="Find a tool…" value={find} onChange={(e) => setFind(e.target.value)}
                  style={{ width: 'min(100%, 280px)', minHeight: 44, padding: '0 12px', borderRadius: 8, border: '1px solid rgba(var(--ink-rgb), 0.14)', background: 'transparent', color: 'var(--fg)', fontSize: 13 }} />
                <button type="button" aria-expanded={listOpen} aria-controls="production-tool-list" className={s.chip} style={{ minHeight: 44 }} onClick={() => setShowAll((v) => !v)}>
                  <ChevronRight size={12} aria-hidden style={{ transform: listOpen ? 'rotate(90deg)' : 'none', transition: 'transform 120ms' }} /> All tools ({VIEWS.length})
                </button>
                <span style={{ fontSize: 12, color: 'var(--fg-dim)' }}>Open now: <strong style={{ color: 'var(--fg)' }}>{PRODUCTION_VIEW_LABELS[view]}</strong></span>
              </div>
              {q && !VIEWS.some((v) => v.id !== view && v.label.toLowerCase().includes(q)) && <p role="status" style={{ margin: 0, fontSize: 12, color: 'var(--fg-dim)' }}>No tool matches “{find}”.</p>}
              {kit && !q && (myViews.length > 0 || kit.home) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', minWidth: 90, flexShrink: 0 }}>Your tools{me.craft ? ` · ${me.craft}` : ''}</span>
                  <div className={s.chips} role="group" aria-label="Your tools" style={{ marginBottom: 0 }}>
                    {myViews.map((v) => (
                      <button key={v} type="button" aria-pressed={view === v} className={cx(s.chip, view === v && s.chipOn)} onClick={() => onView(v)}>{PRODUCTION_VIEW_LABELS[v]}</button>
                    ))}
                  </div>
                  {kit.home === 'call' && <span style={{ fontSize: 12, color: 'var(--fg-dim)' }}>Your working surface is your calls and pages, not the Studio: <Link href="/call" style={{ color: 'var(--fg)', textDecoration: 'underline' }}>open My calls</Link>.</span>}
                  {kit.home === 'review' && <span style={{ fontSize: 12, color: 'var(--fg-dim)' }}>You work through the review link, not the Studio.</span>}
                </div>
              )}
              {kit && !q && (
                <YourWorkflow craft={me.craft} department={me.craft ? craftsByName.get(me.craft)?.department : null} openable={myViews} onView={onView} />
              )}
              {kit && me.previewing && !q && kit.gaps.length > 0 && (
                <div role="note" aria-label={`What ${me.craft ?? 'this role'} still lacks`} style={{ fontSize: 12, color: 'var(--fg-dim)', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--fg-muted)' }}>Still missing for this role:</strong> {kit.gaps.join(' · ')}
                </div>
              )}
              {recentViews.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', minWidth: 90, flexShrink: 0 }}>Recently used</span>
                  <div className={s.chips} role="group" aria-label="Recently used tools" style={{ marginBottom: 0 }}>
                    {recentViews.map((v) => (
                      <button key={v.id} type="button" className={s.chip} onClick={() => onView(v.id)}>{v.icon} {v.label}</button>
                    ))}
                  </div>
                </div>
              )}
              {listOpen && <div id="production-tool-list" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {GROUPS.filter((group) => VIEWS.some((v) => v.group === group && shown(v))).map((group) => {
                const open = !!q || !folded.has(group);
                return (
                <div key={group} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" aria-expanded={open} onClick={() => toggleGroup(group)} disabled={!!q}
                    style={{ all: 'unset', cursor: q ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, minHeight: 44, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', minWidth: 90, flexShrink: 0 }}>
                    <ChevronRight size={11} aria-hidden style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 120ms' }} />{group}
                    {!open && <span style={{ opacity: 0.7 }}> ({VIEWS.filter((v) => v.group === group).length})</span>}
                  </button>
                  {open && <div className={s.chips} role="tablist" aria-label={`${group} views`} style={{ marginBottom: 0 }}>
                    {VIEWS.filter((v) => v.group === group && shown(v)).map((v) => (
                      <button key={v.id} type="button" role="tab" aria-selected={view === v.id} className={cx(s.chip, view === v.id && s.chipOn)} onClick={() => onView(v.id)}>
                        {v.icon} {v.label}
                        {lockOf(v.id) && <><Lock size={9} aria-hidden style={{ opacity: 0.7 }} /><span className="sr-only">(opens in {lockOf(v.id)!.phaseLabel})</span></>}
                      </button>
                    ))}
                  </div>}
                </div>
                );
              })}
              </div>}
            </div>
      {!lock && PRODUCTION_VIEW_TOOL[view] && <ToolIntro tool={toolState(progress, PRODUCTION_VIEW_TOOL[view]!)} accent={project.accent_color} />}
      {lock && <LockedTool tool={lock} accent={project.accent_color} onOpen={() => setPeeked((prev) => new Set(prev).add(view))} />}
      <ToolActionsContext.Provider value={!lock && recordKindOfView(view) ? <PrintRecordsButton kind={recordKindOfView(view)!} /> : null}>
      {!lock && TAB_HEADED[view] && (() => {
        const v = VIEWS.find((x) => x.id === view)!;
        return <div style={{ marginBottom: 14 }}><ToolHeader icon={React.cloneElement(v.icon as React.ReactElement<{ size?: number }>, { size: 16 })} eyebrow={v.group} title={v.label} purpose={TAB_HEADED[view]} accent={project.accent_color} /></div>;
      })()}
      {!lock && view === 'story' && <StoryView />}
      {!lock && view === 'breakdown' && <BreakdownView crew={crew.map((c) => ({ user_id: c.user_id, username: c.profiles?.username ?? 'Crew' }))} onNavigate={(v) => onView(v as View)} />}
      {!lock && view === 'readiness' && <ReadinessView onNavigate={onNavigate ?? ((p) => { if (p.kind === 'studio' && p.tab === 'production' && p.view) { onView(p.view); return true; } return false; })} />}
      {!lock && view === 'locations' && <LocationsView />}
      {!lock && view === 'world' && <WorldView />}
      {!lock && view === 'continuity' && <ContinuityView />}
      {!lock && view === 'money' && <MoneyView crew={crew.map((c) => ({ user_id: c.user_id, username: c.profiles?.username ?? 'Crew' }))} />}
      {!lock && view === 'paperwork' && <PaperworkView crew={crew.map((c) => ({ user_id: c.user_id, username: c.profiles?.username ?? 'Crew', craft: c.craft ?? null }))} />}
      {!lock && view === 'onset' && <OnSetView onNavigate={onNavigate ?? ((p) => { if (p.kind === 'studio' && p.tab === 'production' && p.view) { onView(p.view); return true; } return false; })} />}
      {!lock && view === 'shots' && <ShotListView />}
      {!lock && view === 'weather' && <WeatherView />}
      {!lock && view === 'catering' && <CateringView />}
      {!lock && view === 'safety' && <SafetyView />}
      {!lock && view === 'props' && <PropsView />}
      {!lock && view === 'makeup' && <MakeupView />}
      {!lock && view === 'stills' && <StillsView />}
      {!lock && view === 'extras' && <ExtrasView />}
      {!lock && view === 'editorial' && <EditorialView />}
      {!lock && view === 'claims' && <ClaimsView />}
      {!lock && view === 'mediaoffload' && <MediaOffloadView />}
      {!lock && view === 'po' && <PoView />}
      {!lock && view === 'scriptsup' && <ScriptSupView />}
      {!lock && view === 'permit' && <PermitView />}
      {!lock && view === 'costume' && <CostumeView />}
      {!lock && view === 'vfx' && <VfxView />}
      {!lock && view === 'sound' && <SoundReportView />}
      {!lock && view === 'camera' && <CameraReportView />}
      {!lock && view === 'risk' && <RiskRegisterView />}
      {!lock && view === 'director' && <DirectorNotebookView />}
      {!lock && view === 'revisions' && <RevisionsView />}
      {!lock && view === 'scout' && <ScoutView />}
      {!lock && view === 'rehearsal' && <RehearsalView />}
      {!lock && view === 'wrap' && <WrapView />}
      {!lock && view === 'gear' && <GearView />}
      {!lock && view === 'dood' && <DoodView />}
      {!lock && view === 'comms' && <CommsView />}
      {!lock && view === 'cast' && <CastBreakdownView />}
      {!lock && view === 'transport' && <TransportView />}
      {!lock && view === 'reports' && <ProductionReportView />}
      {!lock && view === 'schedule' && <ScheduleView crew={crew.map((c) => ({ ...c, username: c.profiles?.username ?? undefined }))} />}
      {!lock && view === 'crew' && <CrewView crew={crew} onChanged={() => void loadCrew()} />}
      </ToolActionsContext.Provider>
    </section>
  );
}
