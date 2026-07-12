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

export function ConceptTab({ ctx }: { ctx: StudioCtx }) {
  const { activeConceptBoard, activeProject, adding, boards, conceptBoard, conceptTitle, conceptUrl, confirm, filter, filtered, lightboxIdx, refreshProject, sceneRefs, setActiveConceptBoard, setAdding, setConceptBoard, setConceptTitle, setConceptUrl, setLightboxIdx, setShowAddConcept, setShowRefSearch, showAddConcept, tabs, toast, user } = ctx;
  if (!activeProject) return null;
  return (

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
              <div>
                <SectionLabel text="Visual Research" />
                <h2 style={{ fontFamily: 'var(--display)', fontSize: '2.5rem', letterSpacing: 2 }}>Concept Board</h2>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="link-btn" onClick={() => setShowRefSearch(true)}>
                  <Search size={12} style={{ marginRight: 4, verticalAlign: -2 }} /> Search References
                </button>
                <button className="link-btn" onClick={() => setShowAddConcept((s: boolean) => !s)}>+ New Ref</button>
              </div>
            </div>

            {showAddConcept && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, padding: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }}>
                <input autoFocus placeholder="Title" value={conceptTitle} onChange={e => setConceptTitle(e.target.value)} style={{ flex: 1, padding: 10, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 12 }} />
                <input placeholder="Image URL" value={conceptUrl} onChange={e => setConceptUrl(e.target.value)} style={{ flex: 2, padding: 10, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 12 }} />
                <input placeholder="Board (e.g. Lighting)" value={conceptBoard} onChange={e => setConceptBoard(e.target.value)} list="mc-board-list" style={{ flex: 1, padding: 10, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 12 }} />
                <button
                  className="link-btn"
                  disabled={adding || !conceptUrl.trim()}
                  onClick={async () => {
                    if (!activeProject || !conceptUrl.trim() || adding) return;
                    setAdding(true);
                    try {
                      const user = await awaitOSUser();
                      const board = (conceptBoard.trim() || (activeConceptBoard !== 'All' ? activeConceptBoard : '')) || null;
                      const { error } = await supabase.from('concept_assets').insert({ project_id: activeProject.id, title: conceptTitle.trim() || null, image_url: conceptUrl.trim(), board, created_by: user?.id });
                      if (error) { toast(error.message || 'Could not add reference', 'error'); return; }
                      await refreshProject(activeProject.id);
                      toast('Reference added', 'success');
                      setConceptTitle(''); setConceptUrl(''); setConceptBoard(''); setShowAddConcept(false);
                    } finally { setAdding(false); }
                  }}
                >{adding ? 'Adding…' : 'Add'}</button>
              </div>
            )}

            {(() => {
              const all = (activeProject?.concept_assets || []) as any[];
              const boards = Array.from(new Set(all.map(a => (a.board || '').trim()).filter(Boolean))).sort();
              const filtered = activeConceptBoard === 'All' ? all : activeConceptBoard === 'Unsorted' ? all.filter(a => !a.board) : all.filter(a => a.board === activeConceptBoard);
              const tabs = ['All', ...boards, ...(all.some(a => !a.board) ? ['Unsorted'] : [])];
              return (
                <>
                  <datalist id="mc-board-list">{boards.map(b => <option key={b} value={b} />)}</datalist>
                  {all.length > 0 && tabs.length > 1 && (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                      {tabs.map(b => {
                        const count = b === 'All' ? all.length : b === 'Unsorted' ? all.filter(a => !a.board).length : all.filter(a => a.board === b).length;
                        const on = activeConceptBoard === b;
                        return (
                          <button key={b} onClick={() => setActiveConceptBoard(b)} style={{ padding: '6px 14px', borderRadius: 99, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1px solid ${on ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.1)'}`, background: on ? 'rgba(168,85,247,0.14)' : 'transparent', color: on ? '#c084fc' : 'var(--fg-muted)', fontFamily: 'var(--mono)', letterSpacing: 0.5, display: 'flex', gap: 6, alignItems: 'center' }}>
                            {b} <span style={{ fontSize: 9, opacity: 0.6 }}>{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {filtered.length > 0 ? (
                    <div className="mc-masonry">
                      {filtered.map((img, i) => {
                        const sceneCount = Object.values(sceneRefs).reduce((n, arr) => n + (arr.some(r => r.concept_asset_id === img.id) ? 1 : 0), 0);
                        return (
                        <ConceptCard key={img.id} image={{ id: img.id, url: img.image_url, title: img.title }} index={i} sceneCount={sceneCount} board={img.board} onOpen={() => setLightboxIdx(i)} onRemove={async () => { if (!await confirm('Delete this reference from the board?')) return; await supabase.from('concept_assets').delete().eq('id', img.id); await refreshProject(activeProject!.id); }} />
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState icon={<Image size={28} aria-label="no images" />} title={all.length === 0 ? 'No concept references yet' : `Nothing in "${activeConceptBoard}" yet`} subtitle="Paste an image URL above to start your visual moodboard. Group pins into boards like Lighting, Wardrobe or Locations." />
                  )}

                  {lightboxIdx !== null && filtered[lightboxIdx] && (
                    <ConceptLightbox
                      images={filtered}
                      index={lightboxIdx}
                      onIndex={setLightboxIdx}
                      onClose={() => setLightboxIdx(null)}
                      onSetBoard={async (id, board) => { const { error } = await supabase.from('concept_assets').update({ board }).eq('id', id); if (error) { toast(error.message || 'Could not move to board', 'error'); return; } await refreshProject(activeProject!.id); toast(board ? `Moved to "${board}"` : 'Removed from board', 'success'); }}
                      boards={boards}
                    />
                  )}
                </>
              );
            })()}
          </motion.div>
        
  );
}
