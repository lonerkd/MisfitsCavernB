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

export function MarketingTab({ ctx }: { ctx: StudioCtx }) {
  const { activeProject, adding, campaignBudget, campaignDemo, campaignPlatform, campaignTitle, confirm, refreshProject, setAdding, setCampaignBudget, setCampaignDemo, setCampaignPlatform, setCampaignTitle, setShowAddCampaign, showAddCampaign, toast, user } = ctx;
  if (!activeProject) return null;
  return (

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
              <div>
                <SectionLabel text="Delivery & Promotion" />
                <h2 style={{ fontFamily: 'var(--display)', fontSize: '2.5rem', letterSpacing: 2 }}>Marketing Hub</h2>
              </div>
              <button className="link-btn" onClick={() => setShowAddCampaign((s: boolean) => !s)}>+ New Campaign</button>
            </div>

            <div className="mc-collapse" style={{ gridTemplateColumns: '2fr 1fr', display: 'grid', gap: 40 }}>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {showAddCampaign && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }}>
                      <input autoFocus placeholder="Campaign title" value={campaignTitle} onChange={e => setCampaignTitle(e.target.value)} style={{ flex: '1 1 160px', padding: 10, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 12 }} />
                      <select value={campaignPlatform} onChange={e => setCampaignPlatform(e.target.value)} style={{ padding: 10, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 12 }}>
                        <option>Instagram</option>
                        <option>X / Twitter</option>
                        <option>YouTube</option>
                        <option>TikTok</option>
                      </select>
                      <input placeholder="Target demographic" value={campaignDemo} onChange={e => setCampaignDemo(e.target.value)} style={{ flex: '1 1 140px', padding: 10, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 12 }} />
                      <input type="number" placeholder="Budget $" value={campaignBudget} onChange={e => setCampaignBudget(e.target.value)} style={{ width: 100, padding: 10, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 12 }} />
                      <button
                        className="link-btn"
                        disabled={adding || !campaignTitle.trim()}
                        onClick={async () => {
                          if (!activeProject || !campaignTitle.trim() || adding) return;
                          setAdding(true);
                          try {
                            const user = await awaitOSUser();
                            const { error } = await supabase.from('campaigns').insert({
                              project_id: activeProject.id, title: campaignTitle.trim(), platform: campaignPlatform, status: 'drafting', created_by: user?.id,
                              target_demographic: campaignDemo.trim() || null, budget: Number(campaignBudget) || 0,
                            });
                            if (error) { toast(error.message || 'Could not add campaign', 'error'); return; }
                            await refreshProject(activeProject.id);
                            setCampaignTitle(''); setCampaignDemo(''); setCampaignBudget(''); setShowAddCampaign(false);
                          } finally { setAdding(false); }
                        }}
                      >{adding ? 'Adding…' : 'Add'}</button>
                    </div>
                  )}

                  {(activeProject?.campaigns && activeProject.campaigns.length > 0) ? (
                    activeProject.campaigns.map((campaign) => (
                      <div
                        key={campaign.id}
                        style={{ padding: 24, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'border-color 0.3s, box-shadow 0.3s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(215, 52, 11,0.25)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.boxShadow = 'none'; }}
                      >
                         <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                               <span style={{ fontSize: 9, fontFamily: 'var(--mono)', padding: '2px 6px', background: 'rgba(255,255,255,0.08)', color: '#fff', borderRadius: 4, textTransform: 'uppercase' }}>{campaign.platform}</span>
                               <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{campaign.status}</span>
                               {campaign.target_demographic && <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: '#a5b4fc' }}>{campaign.target_demographic}</span>}
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{campaign.title}</div>
                            {!!campaign.budget && (
                              <div style={{ fontSize: 10.5, fontFamily: 'var(--mono)', color: 'var(--fg-dim)', marginTop: 4 }}>
                                ${Number(campaign.spend || 0).toLocaleString()} spent / ${Number(campaign.budget).toLocaleString()} budget
                              </div>
                            )}
                         </div>
                         <button title="Delete campaign" onClick={async () => { if (!await confirm(`Delete campaign "${campaign.title}"?`)) return; await supabase.from('campaigns').delete().eq('id', campaign.id); await refreshProject(activeProject.id); }} style={{ background: 'none', border: 'none', color: '#666', fontSize: 12, cursor: 'pointer' }}>✕</button>
                      </div>
                    ))
                  ) : (
                    <EmptyState icon={<Megaphone size={28} />} title="No campaigns planned yet" subtitle="Use + New Campaign above" />
                  )}
               </div>

               {(() => {
                 const camps = (activeProject?.campaigns || []) as any[];
                 const byStatus: Record<string, number> = {};
                 const byPlatform: Record<string, number> = {};
                 camps.forEach(c => { byStatus[c.status || 'planned'] = (byStatus[c.status || 'planned'] || 0) + 1; byPlatform[c.platform || 'Other'] = (byPlatform[c.platform || 'Other'] || 0) + 1; });
                 const totalCampaignBudget = camps.reduce((s, c) => s + Number(c.budget || 0), 0);
                 const totalCampaignSpend = camps.reduce((s, c) => s + Number(c.spend || 0), 0);
                 return (
                   <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 24 }}>
                     <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Megaphone size={16} /> Campaign Overview</div>
                     {camps.length === 0 ? (
                       <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg-dim)' }}>No campaigns yet — create one to start planning your rollout.</div>
                     ) : (
                       <>
                         <div style={{ fontFamily: 'var(--display)', fontSize: '2rem', letterSpacing: 2 }}>{camps.length}<span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--fg-dim)', marginLeft: 8 }}>campaigns</span></div>
                         <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                           {Object.entries(byStatus).map(([st, n]) => (
                             <div key={st} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'var(--mono)' }}><span style={{ color: 'var(--fg-muted)', textTransform: 'capitalize' }}>{st}</span><span>{n}</span></div>
                           ))}
                         </div>
                         <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                           {Object.entries(byPlatform).map(([pl, n]) => (
                             <span key={pl} style={{ fontFamily: 'var(--mono)', fontSize: 9, color: '#a5b4fc', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 99, padding: '2px 8px' }}>{pl} · {n}</span>
                           ))}
                         </div>
                         {totalCampaignBudget > 0 && (
                           <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 11 }}>
                             <span style={{ color: 'var(--fg-dim)' }}>${totalCampaignSpend.toLocaleString()} spent / ${totalCampaignBudget.toLocaleString()} budget</span>
                             <span style={{ color: totalCampaignSpend > totalCampaignBudget ? '#ff6b6b' : '#10b981' }}>{Math.round((totalCampaignSpend / totalCampaignBudget) * 100)}%</span>
                           </div>
                         )}
                       </>
                     )}
                   </div>
                 );
               })()}
            </div>
          </motion.div>
        
  );
}
