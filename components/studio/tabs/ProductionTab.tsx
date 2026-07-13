'use client';
import React, { useState } from 'react';
import { ArrowLeft, FolderOpen, Image, Video, FileText, Music, Upload, Plus } from 'lucide-react';
import Link from 'next/link';
import NextImage from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import GrainOverlay from '@/components/GrainOverlay';
import ParticleBackground from '@/components/ParticleBackground';
import { useColorExtractor } from '@/hooks/useColorExtractor';
import { AmbientGradient } from '@/components/ui/AmbientGradient';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import AnimatedSection from '@/components/AnimatedSection';
import SectionLabel from '@/components/SectionLabel';
import { supabase } from '@/lib/supabase/client';
import { getUserProjects } from '@/lib/supabase/projects';
import { notify } from '@/lib/supabase/notifications';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/Confirm';
import { useEscapeKey } from '@/lib/useEscapeKey';
import Avatar from '@/components/Avatar';
import { useEffect, useMemo } from 'react';
import { useProject } from '@/lib/os';
import { getProjectModules } from '@/lib/types/settings';
import { usePillStage, usePillZone } from '@/lib/context/PillContext';
import { useOnlinePresence } from '@/lib/hooks/usePresence';
import { saveScript } from '@/lib/scriptos/storage';
import { parseScript } from '@/lib/scriptos/parser';
import { getActivities, subscribeToActivities, type Activity } from '@/lib/supabase/activity';
import { getAllStudioAssets, getStudioBoards, getProjectBoards, createStudioBoard, getStudioAssets, deleteStudioAsset, addStudioAsset, getProjectBeats, createProjectBeat, deleteProjectBeat, uploadStudioFile } from '@/lib/supabase/studio';
import { searchProfiles, inviteToCrew } from '@/lib/supabase/profiles';
import { getProjectCrew } from '@/lib/supabase/crew-management';
import { getCastingsForProject, setCasting, removeCasting, type Casting } from '@/lib/supabase/casting';
import { syncSceneElementsFromScript, syncBudgetFromSceneElements, ELEMENT_CATEGORIES, type ElementCategory } from '@/lib/supabase/breakdown';
import { LayoutGrid, ClipboardList, BookOpen, Layers, Archive, CheckCircle2, Maximize2, Filter, Grid, List as ListIcon, Info, DollarSign, Calendar, MessageSquare, Clock, MapPin, Download, Megaphone, Share2, Eye, TrendingUp, Users, Trash2, Search, AlertCircle, ChevronLeft, ChevronRight, X, Tags } from 'lucide-react';
import { searchReferences, type ReferenceResult } from '@/lib/references/search';
import EmptyState from '@/components/EmptyState';
import { useOSGate } from '@/lib/os';
import { awaitOSUser } from '@/lib/os';
import type { Asset } from '@/components/studio/constants';
import { STAGES, TYPE_ICONS, TYPE_COLORS } from '@/components/studio/constants';
import { AssetCard, AssetReviewModal, IntakeModal } from '@/components/studio/AssetLibrary';
import { ProjectCard, StageIndicator } from '@/components/studio/ProjectCards';
import { ConceptLightbox, ConceptCard, ReferenceSearchModal } from '@/components/studio/ConceptBoard';
import { ProjectPitchDeck } from '@/components/studio/PitchDeck';
import { CharacterBible } from '@/components/studio/CharacterBible';
import { CastingBoard } from '@/components/studio/CastingBoard';
import { Stripboard, CallSheets } from '@/components/studio/ProductionBoards';
import { BeatCard, CrewMemberCard, RecruitModal } from '@/components/studio/CrewBoards';
import type { StudioCtx } from './ctx';

export function ProductionTab({ ctx }: { ctx: StudioCtx }) {
  const { activeProject, adding, autoSchedule, autoScheduling, beatContent, beatTitle, beats, confirm, crewList, cycleSceneStatus, editScene, editSceneId, filter, handlePushToScript, importScenesFromScript, importingScenes, linkConceptToScene, linkScene, onlineIds, printSchedule, prodTab, refreshProject, saveScene, sceneDay, sceneLocation, sceneRefs, sceneTitle, setAdding, setBeatContent, setBeatTitle, setEditScene, setEditSceneId, setLinkScene, setProdTab, setSceneDay, setSceneLocation, setSceneTitle, setShowAddBeat, setShowAddScene, setShowRecruit, showAddBeat, showAddScene, startEditScene, syncBreakdown, syncingBreakdown, toast, unlinkConcept, user } = ctx;
  if (!activeProject) return null;
  return (

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
              <div>
                <SectionLabel text="Pre-Production" />
                <h2 style={{ fontFamily: 'var(--display)', fontSize: '2.5rem', letterSpacing: 2 }}>Production Suite</h2>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {prodTab === 'schedule' && <button className="link-btn" onClick={printSchedule}>⎙ Export Schedule</button>}
                {prodTab === 'story' && <button className="link-btn" onClick={() => setShowAddBeat((s: boolean) => !s)}>+ New Beat</button>}
                {prodTab === 'crew' && <button className="link-btn" onClick={() => setShowRecruit(true)}>+ Recruit Crew</button>}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 4, marginBottom: 36, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {([
                ['story', 'Story', BookOpen],
                ['schedule', 'Schedule', Calendar],
                ['crew', 'Crew', Users],
              ] as const).map(([key, label, Icon]) => {
                const active = prodTab === key;
                return (
                  <button key={key} onClick={() => setProdTab(key)} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    borderBottom: active ? '2px solid #6366f1' : '2px solid transparent',
                    color: active ? 'var(--fg)' : 'var(--fg-dim)', marginBottom: -1,
                    fontSize: 13, fontWeight: 600, letterSpacing: 0.5, transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--fg-muted)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--fg-dim)'; }}
                  >
                    <Icon size={15} /> {label}
                  </button>
                );
              })}
            </div>

            {prodTab === 'story' && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
               <div>
                 <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--fg-muted)' }}>
                   <BookOpen size={16} /> Beat Board / Outline
                 </div>
                 {showAddBeat && (
                   <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, padding: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }}>
                     <input autoFocus placeholder="Beat title" value={beatTitle} onChange={e => setBeatTitle(e.target.value)} style={{ padding: 10, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 12 }} />
                     <textarea placeholder="What happens in this beat?" value={beatContent} onChange={e => setBeatContent(e.target.value)} style={{ padding: 10, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 12, minHeight: 60, resize: 'vertical' }} />
                     <button
                       className="link-btn"
                       disabled={adding || !beatTitle.trim()}
                       onClick={async () => {
                         if (!activeProject || !beatTitle.trim() || adding) return;
                         setAdding(true);
                         try {
                           const { error } = await supabase.from('project_beats').insert({ project_id: activeProject.id, title: beatTitle.trim(), content: beatContent.trim() });
                           if (error) { toast(error.message || 'Could not add beat', 'error'); return; }
                           await refreshProject(activeProject.id);
                           setBeatTitle(''); setBeatContent(''); setShowAddBeat(false);
                         } finally { setAdding(false); }
                       }}
                     >{adding ? 'Adding…' : 'Add Beat'}</button>
                   </div>
                 )}

                 {(activeProject?.beats && activeProject.beats.length > 0) ? (
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                     {activeProject.beats.map((beat, i) => (
                       <BeatCard key={beat.id} beat={beat} index={i} onDelete={async (id) => { if (!await confirm('Delete this beat?')) return; await supabase.from('project_beats').delete().eq('id', id); await refreshProject(activeProject.id); }} onPush={handlePushToScript} />
                     ))}
                   </div>
                 ) : (
                   <EmptyState icon={<BookOpen size={28} />} title="No beats outlined yet" subtitle="Break the story into beats above" />
                 )}
               </div>

               {activeProject && <CharacterBible projectId={activeProject.id} userId={user?.id ?? null} concepts={(activeProject.concept_assets || []) as any[]} />}
             </div>
            )}

            {prodTab === 'crew' && (
               <div>
                 <div style={{ maxWidth: 720 }}>
                   <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--fg-muted)' }}>
                     <Users size={16} /> Cast & Crew Hub
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {crewList.length > 0 ? crewList.map((member, i) => (
                        <CrewMemberCard key={member.id} member={{
                          name: member.profiles?.username || 'Unknown',
                          role: member.role,
                          status: member.status,
                          avatar: member.profiles?.avatar_url,
                          userId: member.user_id,
                        }} index={i} isOnline={onlineIds.has(member.user_id)} />
                      )) : (
                        <EmptyState icon={<Users size={28} />} title="No crew members recruited yet" />
                      )}
                      <button
                        onClick={() => setShowRecruit(true)}
                        style={{ padding: 12, border: '1px dashed rgba(255,255,255,0.1)', background: 'transparent', color: '#666', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}
                      >
                        + Recruit Crew / Invite Talent
                      </button>
                    </div>
                 </div>

                 {activeProject && (
                   <div style={{ marginTop: 44, maxWidth: 'none' }}>
                     <CastingBoard
                       projectId={activeProject.id}
                       userId={user?.id ?? null}
                       concepts={(activeProject.concept_assets || []) as any[]}
                       scenes={(activeProject.scenes || []) as any[]}
                       crew={crewList}
                     />
                   </div>
                 )}
               </div>
            )}

            {prodTab === 'schedule' && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
                 <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 24, overflowX: 'auto' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                     {(() => {
                       const all = activeProject?.scenes || [];
                       const wrapped = all.filter((s: any) => s.status === 'wrapped').length;
                       const pct = all.length ? Math.round((wrapped / all.length) * 100) : 0;
                       return (
                         <div>
                           <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Shooting Schedule</div>
                           {all.length > 0 && (
                             <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                               <div style={{ width: 120, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                                 <div style={{ width: `${pct}%`, height: '100%', background: '#10b981' }} />
                               </div>
                               <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)' }}>{wrapped}/{all.length} wrapped</span>
                             </div>
                           )}
                         </div>
                       );
                     })()}
                     <div style={{ display: 'flex', gap: 8 }}>
                       <button className="link-btn" style={{ fontSize: 9, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(215, 52, 11,0.12)', borderColor: 'rgba(215, 52, 11,0.3)', color: '#ff7a4d' }} onClick={importScenesFromScript} disabled={importingScenes}><FileText size={12}/> {importingScenes ? 'Importing…' : 'Import from screenplay'}</button>
                       <button className="link-btn" style={{ fontSize: 9, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.3)', color: '#34d399' }} onClick={autoSchedule} disabled={autoScheduling} title="Group scenes by location and pack into shoot days (~5 pg/day)"><Calendar size={12}/> {autoScheduling ? 'Optimising…' : 'Auto-schedule'}</button>
                       <button className="link-btn" style={{ fontSize: 9, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.3)', color: '#a5b4fc' }} onClick={syncBreakdown} disabled={syncingBreakdown} title="Re-tag every scene's production elements from the script and roll them into the budget by category"><Tags size={12}/> {syncingBreakdown ? 'Syncing…' : 'Sync Breakdown → Budget'}</button>
                       <button className="link-btn" style={{ fontSize: 9, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setShowAddScene((s: boolean) => !s)}><Calendar size={12}/> + Add Scene</button>
                     </div>
                   </div>

                   {showAddScene && (
                     <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                       <input autoFocus placeholder="Scene title (e.g. EXT. ABANDONED PIER)" value={sceneTitle} onChange={e => setSceneTitle(e.target.value)} style={{ padding: 10, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 12 }} />
                       <div style={{ display: 'flex', gap: 8 }}>
                         <input placeholder="Location" value={sceneLocation} onChange={e => setSceneLocation(e.target.value)} style={{ flex: 1, padding: 10, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 12 }} />
                         <input placeholder="Shoot day #" type="number" min="1" value={sceneDay} onChange={e => setSceneDay(e.target.value)} style={{ width: 100, padding: 10, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 12 }} />
                       </div>
                       <button
                         className="link-btn"
                         disabled={adding || !sceneTitle.trim()}
                         onClick={async () => {
                           if (!activeProject || !sceneTitle.trim() || adding) return;
                           setAdding(true);
                           try {
                             const nextNum = (activeProject.scenes?.length || 0) + 1;
                             const { error } = await supabase.from('scenes').insert({ project_id: activeProject.id, scene_number: nextNum, title: sceneTitle.trim(), time_of_day: 'DAY', location: sceneLocation.trim() || null, shoot_day: Number(sceneDay) || 1 });
                             if (error) { toast(error.message || 'Could not add scene', 'error'); return; }
                             await refreshProject(activeProject.id);
                             setSceneTitle(''); setSceneLocation(''); setSceneDay('1'); setShowAddScene(false);
                           } finally { setAdding(false); }
                         }}
                       >Add Scene</button>
                     </div>
                   )}

                   {(activeProject?.scenes && activeProject.scenes.length > 0) ? (
                     <>
                       <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 8, marginBottom: 12, fontSize: 10, fontFamily: 'var(--mono)', color: '#888' }}>
                         <div style={{ width: 60 }}>Scene</div>
                         <div style={{ flex: 1, minWidth: 200 }}>Location</div>
                         <div style={{ width: 80 }}>Day</div>
                         <div style={{ width: 30 }}></div>
                       </div>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                         {activeProject.scenes.map(s => {
                           const refs = sceneRefs[s.id] || [];
                           const concepts = (activeProject.concept_assets || []) as any[];
                           const linkedIds = new Set(refs.map(r => r.concept_asset_id));
                           const available = concepts.filter(c => !linkedIds.has(c.id));
                           const picking = linkScene === s.id;
                           return (
                           <div key={s.id} style={{ padding: '8px 0', borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
                             {editSceneId === s.id ? (
                               <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                 <div style={{ width: 54, fontSize: 11, fontWeight: 700 }}>{s.scene_number}</div>
                                 <input value={editScene.title} onChange={e => setEditScene((p: any) => ({ ...p, title: e.target.value }))} placeholder="Title" style={{ flex: 2, minWidth: 0, padding: '6px 8px', background: '#0a0a0a', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 6, color: '#fff', fontSize: 11 }} />
                                 <input value={editScene.location} onChange={e => setEditScene((p: any) => ({ ...p, location: e.target.value }))} placeholder="Location" style={{ flex: 1, minWidth: 0, padding: '6px 8px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 11 }} />
                                 <select value={editScene.time_of_day} onChange={e => setEditScene((p: any) => ({ ...p, time_of_day: e.target.value }))} style={{ padding: '6px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 10 }}>
                                   {['DAY', 'NIGHT', 'DAWN', 'DUSK', 'MORNING', 'EVENING', 'CONTINUOUS'].map(t => <option key={t} value={t}>{t}</option>)}
                                 </select>
                                 <input type="number" min="1" value={editScene.shoot_day} onChange={e => setEditScene((p: any) => ({ ...p, shoot_day: e.target.value }))} style={{ width: 56, padding: '6px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 11 }} />
                                 <button onClick={saveScene} style={{ background: 'rgba(16,185,129,0.18)', border: '1px solid rgba(16,185,129,0.4)', color: '#10b981', borderRadius: 6, padding: '5px 9px', cursor: 'pointer', fontSize: 10 }}>Save</button>
                                 <button onClick={() => setEditSceneId(null)} style={{ background: 'none', border: 'none', color: '#666', fontSize: 12, cursor: 'pointer' }}>✕</button>
                               </div>
                             ) : (
                             <div style={{ display: 'flex', alignItems: 'center' }}>
                               <div style={{ width: 60, fontSize: 11, fontWeight: 700 }}>{s.scene_number}</div>
                               <div style={{ flex: 1, minWidth: 200 }}>
                                 <div style={{ fontSize: 11, fontWeight: 600 }}>{s.title}{s.time_of_day ? <span style={{ color: '#666', fontFamily: 'var(--mono)', fontSize: 9, marginLeft: 6 }}>{s.time_of_day}</span> : null}</div>
                                 {s.location && <div style={{ fontSize: 9, color: '#888', fontFamily: 'var(--mono)' }}>{s.location}</div>}
                               </div>
                               <div style={{ width: 80, fontSize: 10, color: '#aaa', fontFamily: 'var(--mono)' }}>Day {s.shoot_day}</div>
                               {(() => { const st = s.status || 'planned'; const col = st === 'wrapped' ? '#10b981' : st === 'shot' ? '#f59e0b' : '#6b7280'; return (
                                 <button onClick={() => cycleSceneStatus(s)} title="cycle shoot status" style={{ width: 64, fontFamily: 'var(--mono)', fontSize: 7.5, letterSpacing: 1, textTransform: 'uppercase', color: col, background: `${col}1e`, border: `1px solid ${col}40`, borderRadius: 99, padding: '2px 0', cursor: 'pointer', flexShrink: 0 }}>{st}</button>
                               ); })()}
                               <div style={{ width: 54, textAlign: 'right', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                 <button onClick={() => startEditScene(s)} aria-label="edit scene" style={{ background: 'none', border: 'none', color: '#888', fontSize: 11, cursor: 'pointer' }}>✎</button>
                                 <button title="Delete scene" onClick={async () => { if (!await confirm(`Delete scene "${s.title || s.scene_number}"? This cannot be undone.`)) return; await supabase.from('scenes').delete().eq('id', s.id); await refreshProject(activeProject.id); }} style={{ background: 'none', border: 'none', color: '#666', fontSize: 11, cursor: 'pointer' }}>✕</button>
                               </div>
                             </div>
                             )}
                             <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, paddingLeft: 60, flexWrap: 'wrap' }}>
                               {refs.map(r => (
                                 <div key={r.id} style={{ position: 'relative', width: 40, height: 28, borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)' }} title={r.title || 'reference'}>
                                   {/* eslint-disable-next-line @next/next/no-img-element */}
                                   <img src={r.image_url} alt={r.title || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                   <button onClick={() => unlinkConcept(r.id)} aria-label="unlink" style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', fontSize: 8, lineHeight: 1, cursor: 'pointer', padding: '1px 3px' }}>✕</button>
                                 </div>
                               ))}
                               {concepts.length > 0 && (
                                 <button onClick={() => setLinkScene(picking ? null : s.id)} style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: '#6366f1', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 4, padding: '3px 7px', cursor: 'pointer' }}>
                                   {picking ? 'close' : '+ ref'}
                                 </button>
                               )}
                               {refs.length === 0 && concepts.length === 0 && (
                                 <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)', opacity: 0.5 }}>add concept images to link references</span>
                               )}
                             </div>
                             {(() => {
                               const els = s.elements || {};
                               const chips = ELEMENT_CATEGORIES.flatMap((cat: ElementCategory) => (els[cat] || []).map((name: string) => ({ cat, name })));
                               if (chips.length === 0) return null;
                               const catColor: Record<ElementCategory, string> = { props: '#ffaa00', wardrobe: '#d7340b', vehicles: '#0099ff', sfx: '#a855f7', vfx: '#6366f1' };
                               return (
                                 <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, paddingLeft: 60, flexWrap: 'wrap' }}>
                                   {chips.map(({ cat, name }) => (
                                     <span key={`${cat}-${name}`} title={cat} style={{ fontFamily: 'var(--mono)', fontSize: 8, color: catColor[cat], background: `${catColor[cat]}14`, border: `1px solid ${catColor[cat]}33`, borderRadius: 4, padding: '2px 6px' }}>{name}</span>
                                   ))}
                                 </div>
                               );
                             })()}
                             {picking && (
                               <div style={{ marginTop: 8, marginLeft: 60, padding: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                 {available.length === 0 ? (
                                   <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--fg-dim)' }}>All concept images already linked.</span>
                                 ) : available.map(c => (
                                   <button key={c.id} onClick={() => linkConceptToScene(s.id, c.id)} title={c.title || 'link'} style={{ width: 52, height: 36, borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', padding: 0, background: 'none' }}>
                                     {/* eslint-disable-next-line @next/next/no-img-element */}
                                     <img src={c.image_url} alt={c.title || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                   </button>
                                 ))}
                               </div>
                             )}
                           </div>
                           );
                         })}
                       </div>
                     </>
                   ) : (
                     <EmptyState icon={<Calendar size={28} />} title="No scenes scheduled yet" />
                   )}
                 </div>

               {activeProject?.scenes && activeProject.scenes.length > 0 && (
                 <Stripboard scenes={activeProject.scenes as any[]} />
               )}
               {activeProject?.scenes && activeProject.scenes.length > 0 && (
                 <CallSheets scenes={activeProject.scenes as any[]} crew={crewList} projectTitle={activeProject.title} />
               )}
             </div>
            )}
          </motion.div>
        
  );
}
