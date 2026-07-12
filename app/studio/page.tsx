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
import { AssetsTab } from '@/components/studio/tabs/AssetsTab';
import { ConceptTab } from '@/components/studio/tabs/ConceptTab';
import { MarketingTab } from '@/components/studio/tabs/MarketingTab';
import { OverviewTab } from '@/components/studio/tabs/OverviewTab';
import { PitchTab } from '@/components/studio/tabs/PitchTab';
import { ProductionTab } from '@/components/studio/tabs/ProductionTab';
import type { StudioCtx } from '@/components/studio/tabs/ctx';

export default function StudioPage() {
  useOSGate();
  const { toast } = useToast();
  const confirm = useConfirm();
  const { activeProject, setActiveProject, projects, updateProject, refreshProject } = useProject();
  const [activeTab, setActiveTab] = useState<'overview' | 'concept' | 'production' | 'assets' | 'marketing' | 'pitch'>('overview');

  const [prodTab, setProdTab] = useState<'story' | 'schedule' | 'crew'>('story');
  const [filter, setFilter] = useState<string>('all');
  const [user, setUser] = useState<any>(null);
  const [assetsList, setAssetsList] = useState<Asset[]>([]);
  const [showIntake, setShowIntake] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState<any>(null);
  const [reviewAsset, setReviewAsset] = useState<Asset | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [boards, setBoards] = useState<any[]>([]);
  const [activeBoard, setActiveBoard] = useState<any>(null);
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [beats, setBeats] = useState<any[]>([]);
  const [crewList, setCrewList] = useState<any[]>([]);
  const [showRecruit, setShowRecruit] = useState(false);
  const onlineIds = useOnlinePresence(user?.id);

  const STUDIO_TABS = ['overview', 'concept', 'production', 'assets', 'marketing', 'pitch'] as const;
  usePillStage(
    {
      module: 'studio',
      title: activeProject?.title || 'Studio',
      accent: activeProject?.accent_color || '#6366f1',
      fields: [
        { label: 'Tab', value: activeTab, color: '#6366f1' },
        { label: 'Crew', value: `${crewList.length}` },
        { label: 'Assets', value: `${assetsList.length}` },
      ],
      actions: [
        {
          id: 'next-tab',
          label: 'Next Tab →',
          onClick: () => setActiveTab(STUDIO_TABS[(STUDIO_TABS.indexOf(activeTab) + 1) % STUDIO_TABS.length]),
        },
      ],
    },
    [activeProject?.title, activeProject?.accent_color, activeTab, crewList.length, assetsList.length],
  );

  const [showAddConcept, setShowAddConcept] = useState(false);
  const [conceptTitle, setConceptTitle] = useState('');
  const [conceptUrl, setConceptUrl] = useState('');
  const [conceptBoard, setConceptBoard] = useState('');
  const [showRefSearch, setShowRefSearch] = useState(false);
  const [activeConceptBoard, setActiveConceptBoard] = useState<string>('All');

  const addReferenceToBoard = async (ref: ReferenceResult) => {
    if (!user || !activeProject) return;
    const existing = (activeProject.concept_assets || []) as any[];
    if (existing.some(c => c.image_url === ref.url)) return;
    try {
      const { error } = await supabase.from('concept_assets').insert({
        project_id: activeProject.id,
        title: ref.title || null,
        image_url: ref.url,
        board: activeConceptBoard !== 'All' ? activeConceptBoard : null,
        created_by: user.id,
      });
      if (error) { toast(error.message || 'Could not add reference', 'error'); return; }
      await refreshProject(activeProject.id);
      toast('Reference added', 'success');
    } catch {  }
  };
  const [adding, setAdding] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const [showAddBeat, setShowAddBeat] = useState(false);
  const [beatTitle, setBeatTitle] = useState('');
  const [beatContent, setBeatContent] = useState('');

  const [showAddScene, setShowAddScene] = useState(false);
  const [sceneTitle, setSceneTitle] = useState('');
  const [sceneLocation, setSceneLocation] = useState('');
  const [sceneDay, setSceneDay] = useState('1');
  const [editSceneId, setEditSceneId] = useState<string | null>(null);
  const [editScene, setEditScene] = useState<{ title: string; location: string; time_of_day: string; shoot_day: string }>({ title: '', location: '', time_of_day: 'DAY', shoot_day: '1' });

  const startEditScene = (s: any) => {
    setEditSceneId(s.id);
    setEditScene({ title: s.title || '', location: s.location || '', time_of_day: s.time_of_day || 'DAY', shoot_day: String(s.shoot_day || 1) });
  };
  const saveScene = async () => {
    if (!editSceneId || !activeProject) return;
    const { error } = await supabase.from('scenes').update({
      title: editScene.title.trim(),
      location: editScene.location.trim() || null,
      time_of_day: editScene.time_of_day,
      shoot_day: Number(editScene.shoot_day) || 1,
    }).eq('id', editSceneId);
    if (error) { toast(error.message || 'Could not save scene', 'error'); return; }
    setEditSceneId(null);
    await refreshProject(activeProject.id);
  };

  const printSchedule = () => {
    if (!activeProject) return;
    const scenes = (activeProject.scenes || []) as any[];
    if (scenes.length === 0) { toast('No scenes to export yet.', 'info'); return; }
    const esc = (s: any) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
    const days = Array.from(new Set(scenes.map(s => s.shoot_day || 1))).sort((a, b) => a - b);
    const w = window.open('', '_blank', 'width=860,height=1100');
    if (!w) return;
    const body = days.map(day => {
      const ds = scenes.filter(s => (s.shoot_day || 1) === day).sort((a, b) => a.scene_number - b.scene_number);
      return `<h2>DAY ${day}</h2><table><tr><th>#</th><th>Scene</th><th>Location</th><th>I/E·T</th><th>Cast</th><th>Pages</th><th>Status</th></tr>
        ${ds.map(s => `<tr><td>${s.scene_number}</td><td>${esc(s.title)}</td><td>${esc(s.location || '—')}</td><td>${esc(s.time_of_day || '')}</td><td>${esc(s.cast_list || '—')}</td><td>${esc(s.est_duration || '')}</td><td>${esc(s.status || 'planned')}</td></tr>`).join('')}</table>`;
    }).join('');
    w.document.write(`<!doctype html><html><head><title>${esc(activeProject.title)} — Shooting Schedule</title>
      <style>body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#111;margin:40px}h1{font-size:22px;letter-spacing:2px;margin:0 0 4px}
      h2{font-size:11px;letter-spacing:3px;color:#b45309;margin:24px 0 8px}table{width:100%;border-collapse:collapse;font-size:12px}
      th{text-align:left;color:#888;font-size:9px;letter-spacing:1px;border-bottom:1px solid #ccc;padding:4px}td{padding:5px 4px;border-bottom:1px solid #eee}</style></head><body>
      <h1>${esc(activeProject.title).toUpperCase()} — SHOOTING SCHEDULE</h1><div style="color:#888;font-size:11px">${scenes.length} scenes · ${days.length} days</div>
      ${body}<script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  };

  const [autoScheduling, setAutoScheduling] = useState(false);
  const eighthsOf = (s: any) => { const m = String(s.est_duration || '').match(/(\d+)\s*\/\s*8/); return m ? Number(m[1]) : 8; };
  const autoSchedule = async () => {
    if (!activeProject) return;
    const scenes = ((activeProject.scenes || []) as any[]).slice();
    if (scenes.length === 0) { toast('No scenes to schedule yet — import from the screenplay first.', 'info'); return; }
    const CAP = 40;

    const groups = new Map<string, any[]>();
    for (const s of scenes) {
      const key = (s.location || '').trim().toUpperCase() || '￿UNSET';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    }

    const ordered = Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length);
    const nightRank = (s: any) => /NIGHT|DUSK|NUIT/i.test(String(s.time_of_day || '')) ? 1 : 0;
    let day = 0, used = CAP + 1;
    const updates: { id: string; shoot_day: number }[] = [];
    for (const [, list] of ordered) {
      list.sort((a, b) => nightRank(a) - nightRank(b) || a.scene_number - b.scene_number);
      let first = true;
      for (const s of list) {
        const e = eighthsOf(s);

        if (first || used + e > CAP) { day += 1; used = 0; first = false; }
        used += e;
        if ((s.shoot_day || 1) !== day) updates.push({ id: s.id, shoot_day: day });
      }
    }
    if (updates.length === 0) { toast(`Schedule is already optimal — ${day} shoot day${day === 1 ? '' : 's'}, grouped by location.`, 'info'); return; }
    if (!await confirm(`Auto-schedule will reorganise ${scenes.length} scenes into ${day} shoot day${day === 1 ? '' : 's'}, grouped by location to minimise company moves (~5 pages/day). Reassign ${updates.length} scene${updates.length === 1 ? '' : 's'}?`)) return;
    setAutoScheduling(true);
    try {
      for (const u of updates) await supabase.from('scenes').update({ shoot_day: u.shoot_day }).eq('id', u.id);
      await refreshProject(activeProject.id);
    } finally {
      setAutoScheduling(false);
    }
  };

  const cycleSceneStatus = async (s: any) => {
    if (!activeProject) return;
    const order = ['planned', 'shot', 'wrapped'];
    const next = order[(order.indexOf(s.status || 'planned') + 1) % order.length];
    const { error } = await supabase.from('scenes').update({ status: next }).eq('id', s.id);
    if (error) { toast(error.message || 'Could not update status', 'error'); return; }
    await refreshProject(activeProject.id);
  };

  const [importingScenes, setImportingScenes] = useState(false);
  const importScenesFromScript = async () => {
    if (!activeProject) return;
    setImportingScenes(true);
    try {
      const { data } = await supabase.from('scripts').select('content').eq('project_id', activeProject.id).order('updated_at', { ascending: false });
      const withContent = (data || []).find((s: any) => s.content && s.content.trim().length > 0);
      if (!withContent) { toast('No script content yet — write one in ScriptOS first.', 'info'); return; }
      const parsed = parseScript(withContent.content ?? '');
      const existingNums = new Set((activeProject.scenes || []).map((s: any) => s.scene_number));
      const rows = parsed.scenes
        .filter((s: any) => !s.omitted)
        .map((s: any, i: number) => ({ s, num: i + 1 }))
        .filter(({ num }: any) => !existingNums.has(num))
        .map(({ s, num }: any) => ({
          project_id: activeProject.id,
          scene_number: num,
          title: (s.heading || s.location || `Scene ${num}`).slice(0, 200),
          location: s.location || null,
          time_of_day: s.timeOfDay && s.timeOfDay !== 'UNKNOWN' ? s.timeOfDay : 'DAY',
          cast_list: (s.characters || []).join(', ') || null,
          est_duration: `${s.eighths || 1}/8 pg`,
          shoot_day: 1,
          elements: s.elements || {},
        }));
      if (rows.length === 0) { toast('Schedule is already in sync with the script.', 'info'); return; }
      const { error } = await supabase.from('scenes').insert(rows);
      if (error) { toast(error.message, 'error'); return; }
      await refreshProject(activeProject.id);
    } finally {
      setImportingScenes(false);
    }
  };

  const [syncingBreakdown, setSyncingBreakdown] = useState(false);
  const syncBreakdown = async () => {
    if (!activeProject) return;
    const scenes = (activeProject.scenes || []) as any[];
    if (scenes.length === 0) { toast('No scenes scheduled yet — import from the screenplay first.', 'info'); return; }
    setSyncingBreakdown(true);
    try {
      const elementsById = await syncSceneElementsFromScript(activeProject.id, scenes);
      const withElements = scenes.map(s => ({ ...s, elements: elementsById[s.id] ?? s.elements ?? {} }));
      const synced = await syncBudgetFromSceneElements(activeProject.id, withElements, (activeProject.budget_items || []) as any[]);
      await refreshProject(activeProject.id);
      toast(synced.length > 0 ? `Breakdown synced — ${synced.length} budget categor${synced.length === 1 ? 'y' : 'ies'} updated` : 'Breakdown synced — no production elements detected', 'success');
    } catch (e: any) {
      toast(e?.message || 'Could not sync breakdown', 'error');
    } finally {
      setSyncingBreakdown(false);
    }
  };

  const [showAddCampaign, setShowAddCampaign] = useState(false);
  const [campaignTitle, setCampaignTitle] = useState('');
  const [campaignPlatform, setCampaignPlatform] = useState('Instagram');
  const [campaignDemo, setCampaignDemo] = useState('');
  const [campaignBudget, setCampaignBudget] = useState('');

  type SceneRef = { id: string; concept_asset_id: string; image_url: string; title: string | null };
  const [sceneRefs, setSceneRefs] = useState<Record<string, SceneRef[]>>({});
  const [linkScene, setLinkScene] = useState<string | null>(null);

  const loadSceneRefs = async (projectId: string) => {
    const { data } = await supabase
      .from('scene_references')
      .select('id,scene_id,concept_asset_id,concept_assets(image_url,title)')
      .eq('project_id', projectId);
    const map: Record<string, SceneRef[]> = {};
    (data || []).forEach((r: any) => {
      (map[r.scene_id] ||= []).push({ id: r.id, concept_asset_id: r.concept_asset_id, image_url: r.concept_assets?.image_url, title: r.concept_assets?.title });
    });
    setSceneRefs(map);
  };
  useEffect(() => {
    if (activeProject?.id) loadSceneRefs(activeProject.id);
    else setSceneRefs({});
  }, [activeProject?.id, activeProject?.scenes]); // eslint-disable-line react-hooks/exhaustive-deps

  const linkConceptToScene = async (sceneId: string, conceptId: string) => {
    if (!activeProject) return;
    const { error } = await supabase.from('scene_references').insert({ project_id: activeProject.id, scene_id: sceneId, concept_asset_id: conceptId, created_by: user?.id });
    if (error) { toast(error.message || 'Could not link reference', 'error'); return; }
    setLinkScene(null); loadSceneRefs(activeProject.id);
  };
  const unlinkConcept = async (refId: string) => {
    await supabase.from('scene_references').delete().eq('id', refId);
    if (activeProject) loadSceneRefs(activeProject.id);
  };

  const studioModules = getProjectModules(activeProject?.settings);
  const tabs = [
    { id: 'overview', name: 'Overview', icon: LayoutGrid },
    { id: 'concept', name: 'Concept', icon: Image },
    { id: 'production', name: 'Production', icon: Video },
    { id: 'assets', name: 'Library', icon: Archive },
    ...(studioModules.distribution ? [{ id: 'marketing', name: 'Promos', icon: Megaphone }] : []),
    { id: 'pitch', name: 'Pitch', icon: Maximize2 },
  ];

  const types = ['all', 'image', 'video', 'document', 'audio'];

  useEffect(() => {
    const init = async () => {
      const user = await awaitOSUser();
      if (!user) return;
      setUser(user);

      if (activeProject) {
        setLoadingBoards(true);
        try {
          const projectBoards = await getProjectBoards(activeProject.id);
          setBoards(projectBoards);

          let currentBoard = projectBoards[0];
          if (projectBoards.length > 0) {
            setActiveBoard(currentBoard);
          } else {

            currentBoard = await createStudioBoard({
              user_id: user.id,
              project_id: activeProject.id,
              name: 'Project Mood Board',
              description: `Main mood board for ${activeProject.title}`
            });
            setBoards([currentBoard]);
            setActiveBoard(currentBoard);
          }

          const boardAssets = await getStudioAssets(currentBoard.id);
          setAssetsList(boardAssets.map((a: any) => ({
            id: a.id,
            name: a.title || 'Untitled',
            type: (a.asset_type as any) || 'image',
            category: a.category || 'Studio',
            url: a.asset_url,
            size: 'Unknown',
            dateAdded: (a.created_at ? new Date(a.created_at) : new Date()).toISOString().split('T')[0]
          })));

        } catch (err) {
          console.error('Error loading boards:', err);
        } finally {
          setLoadingBoards(false);
        }
      }

      try {
        const acts = await getActivities(5);
        setActivities(acts);
      } catch (err) {
        console.error('Error loading activities:', err);
      }

      if (activeProject) {
        try {
          const projectBeats = await getProjectBeats(activeProject.id);
          setBeats(projectBeats);
        } catch (err) {
          console.error('Error loading beats:', err);
        }

        try {
          const crew = await getProjectCrew(activeProject.id);
          setCrewList(crew);
        } catch (err) {
          console.error('Error loading crew:', err);
        }
      }
    };
    init();

    const sub = subscribeToActivities((payload) => {
      getActivities(5).then(setActivities);
    });

    return () => {
      supabase.removeChannel(sub);
    };
  }, [activeProject?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = filter === 'all' ? assetsList : assetsList.filter(a => a.type === filter);

  const refreshAssets = async () => {
    if (!user || !activeBoard) return;
    try {
      const data = await getStudioAssets(activeBoard.id);
      if (data) {
        setAssetsList(data.map(a => ({
          id: a.id,
          name: a.title || 'Untitled',
          type: (a.asset_type as any) || 'image',
          category: a.category || 'Studio',
          url: a.asset_url,
          size: 'Unknown',
          dateAdded: (a.created_at ? new Date(a.created_at) : new Date()).toISOString().split('T')[0]
        })));
      }
    } catch (err) {
      console.error('Error refreshing assets:', err);
    }
  };

  const refreshBeats = async () => {
    if (!activeProject) return;
    try {
      const projectBeats = await getProjectBeats(activeProject.id);
      setBeats(projectBeats);
    } catch (err) {
      console.error('Error refreshing beats:', err);
    }
  };

  const handleAddBeat = async () => {
    if (!activeProject) return;
    const title = prompt('Beat Title:');
    if (!title) return;
    const content = prompt('Beat Content:');
    try {
      await createProjectBeat({
        project_id: activeProject.id,
        title,
        content,
        order_index: beats.length
      });
      refreshBeats();
    } catch (err) {
      console.error('Error adding beat:', err);
    }
  };

  const handlePushToScript = async (beat: any) => {
    if (!activeProject || !user) return;
    try {
      const sceneTitle = beat.title.toUpperCase().startsWith('EXT.') || beat.title.toUpperCase().startsWith('INT.')
        ? beat.title.toUpperCase()
        : `INT. ${beat.title.toUpperCase()} - DAY`;

      const content = `${sceneTitle}\n\n${beat.content}`;

      const newScript = await saveScript({
        title: `${activeProject.title} - ${beat.title}`,
        content,
        project_id: activeProject.id
      });

      if (newScript) {
        toast('Beat pushed to ScriptOS! You can find it in your scripts list.', 'success');
      }
    } catch (err) {
      console.error('Error pushing beat to script:', err);
    }
  };

  const handleDeleteBeat = async (id: string) => {
    if (!await confirm('Delete this beat?')) return;
    try {
      await deleteProjectBeat(id);
      refreshBeats();
    } catch (err) {
      console.error('Error deleting beat:', err);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!await confirm('Delete this asset?')) return;
    try {
      await deleteStudioAsset(id);
      refreshAssets();
    } catch (err) {
      console.error('Error deleting asset:', err);
    }
  };

  const refreshCrew = async () => {
    if (!activeProject) return;
    const crew = await getProjectCrew(activeProject.id);
    setCrewList(crew);
  };

  const studioCtx: StudioCtx = { activeConceptBoard, activeProject, activities, adding, assetsList, autoSchedule, autoScheduling, beatContent, beatTitle, beats, boards, campaignBudget, campaignDemo, campaignPlatform, campaignTitle, conceptBoard, conceptTitle, conceptUrl, confirm, crewList, cycleSceneStatus, editScene, editSceneId, filter, filtered, handlePushToScript, importScenesFromScript, importingScenes, lightboxIdx, linkConceptToScene, linkScene, loadingBoards, onlineIds, printSchedule, prodTab, projects, refreshProject, saveScene, sceneDay, sceneLocation, sceneRefs, sceneTitle, setActiveConceptBoard, setAdding, setBeatContent, setBeatTitle, setCampaignBudget, setCampaignDemo, setCampaignPlatform, setCampaignTitle, setConceptBoard, setConceptTitle, setConceptUrl, setEditScene, setEditSceneId, setFilter, setLightboxIdx, setLinkScene, setProdTab, setReviewAsset, setSceneDay, setSceneLocation, setSceneTitle, setShowAddBeat, setShowAddCampaign, setShowAddConcept, setShowAddScene, setShowRecruit, setShowRefSearch, showAddBeat, showAddCampaign, showAddConcept, showAddScene, startEditScene, syncBreakdown, syncingBreakdown, tabs, toast, types, unlinkConcept, user };

  return (
    <main style={{ background: 'var(--bg)', color: 'var(--fg)', minHeight: '100vh' }}>
      <GrainOverlay />

      <nav style={{
        position: 'fixed', top: 0, left: 0, width: '100%',
        padding: '0 28px', height: 62,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        zIndex: 100,
        background: 'rgba(6,6,6,0.92)',
        backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        boxShadow: '0 1px 0 rgba(99,102,241,0.08) inset',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ fontFamily: 'var(--display)', fontSize: '0.9rem', letterSpacing: 6, color: 'var(--fg)', opacity: 0.7, transition: 'opacity 0.2s' }}
              onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => (e.currentTarget.style.opacity = '0.7')}
            >MC</div>
          </Link>
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 3, color: '#6366f1', textTransform: 'uppercase' }}>Studio</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.03)', padding: '4px 12px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 8, fontFamily: 'var(--mono)', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Project:</span>
            <select
              value={activeProject?.id || ''}
              onChange={(e) => {
                const p = projects.find(p => p.id === e.target.value);
                if (p) setActiveProject(p);
              }}
              style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 11, fontWeight: 600, outline: 'none', cursor: 'pointer' }}
            >
              {projects.map(p => <option key={p.id} value={p.id} style={{ background: '#111' }}>{p.title}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="link-btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setShowIntake(true)}>
            <Upload size={11} /> Intake
          </button>
        </div>
      </nav>

      <IntakeModal
        isOpen={showIntake}
        onClose={() => setShowIntake(false)}
        boardId={activeBoard?.id}
        userId={user?.id}
        onSuccess={refreshAssets}
      />
      <RecruitModal
        isOpen={showRecruit}
        onClose={() => setShowRecruit(false)}
        projectId={activeProject?.id ?? ''}
        onSuccess={refreshCrew}
      />
      <AssetReviewModal asset={reviewAsset} isOpen={!!reviewAsset} onClose={() => setReviewAsset(null)} />
      <ReferenceSearchModal
        isOpen={showRefSearch}
        onClose={() => setShowRefSearch(false)}
        projectTitle={activeProject?.title}
        addedUrls={new Set(((activeProject?.concept_assets || []) as any[]).map(c => c.image_url))}
        onAdd={addReferenceToBoard}
      />

      <div className="mc-studio-tabs" style={{
        position: 'fixed', top: 62, left: 0, width: '100%',
        height: 52, background: 'rgba(6,6,6,0.88)',
        backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.04)',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        zIndex: 90,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 2,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 9999, padding: '4px 6px', flexShrink: 0,
        }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  position: 'relative',
                  height: 34, padding: '0 16px',
                  background: 'transparent', border: 'none', borderRadius: 9999,
                  display: 'flex', alignItems: 'center', gap: 6,
                  color: isActive ? 'var(--fg)' : 'var(--fg-dim)',
                  cursor: 'pointer', transition: 'color 0.25s',
                  fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1.5,
                  textTransform: 'uppercase',
                }}
                whileHover={{ color: 'var(--fg-muted)' } as any}
              >
                {isActive && (
                  <motion.div
                    layoutId="studio-tab-pill"
                    style={{
                      position: 'absolute', inset: 0, borderRadius: 9999,
                      background: 'rgba(99,102,241,0.14)',
                      border: '1px solid rgba(99,102,241,0.2)',
                      zIndex: -1,
                    }}
                    transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                  />
                )}
                <Icon size={11} color={isActive ? '#6366f1' : undefined} />
                {tab.name}
              </motion.button>
            );
          })}
        </div>
      </div>

      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '130px 20px 80px' }}>

        {!activeProject && (
          <div style={{ minHeight: '50vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 18 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 4, color: 'var(--fg-dim)', textTransform: 'uppercase' }}>Production Suite</div>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(2rem, 5vw, 3rem)', letterSpacing: 2, lineHeight: 1, margin: 0 }}>No active project</h2>
            <p style={{ fontFamily: 'var(--serif)', fontSize: '1rem', color: 'var(--fg-muted)', maxWidth: 420, lineHeight: 1.6 }}>
              Studio works on your active production — its scenes, schedule, concept board and crew. Pick or create one to get started.
            </p>
            <Link href="/projects" className="link-btn" style={{ marginTop: 6 }}>Choose a project →</Link>
          </div>
        )}

        {activeTab === 'overview' && activeProject && <OverviewTab ctx={studioCtx} />}

        {activeTab === 'concept' && <ConceptTab ctx={studioCtx} />}

        {activeTab === 'production' && <ProductionTab ctx={studioCtx} />}

        {activeTab === 'assets' && <AssetsTab ctx={studioCtx} />}

        {activeTab === 'pitch' && <PitchTab ctx={studioCtx} />}
        {activeTab === 'marketing' && studioModules.distribution && <MarketingTab ctx={studioCtx} />}
      </section>
    </main>
  );
}
