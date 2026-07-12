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
      const parsed = parseScript(withContent.content);
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
            dateAdded: new Date(a.created_at).toISOString().split('T')[0]
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
          dateAdded: new Date(a.created_at).toISOString().split('T')[0]
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
        projectId={activeProject?.id}
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

        {activeTab === 'overview' && activeProject && (
          <div className="mc-collapse" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 60 }}>
            <div>
              <StageIndicator currentStage={activeProject.status} />
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <SectionLabel text="Project Summary" />
                <h1 style={{ fontFamily: 'var(--display)', fontSize: '4rem', letterSpacing: 4, lineHeight: 1.1, marginBottom: 24 }}>{activeProject.title}</h1>
                <p style={{ fontFamily: 'var(--serif)', fontSize: '1.2rem', color: 'var(--fg-muted)', lineHeight: 1.6, maxWidth: 600 }}>
                  {activeProject.description || "No project description provided. Update your script metadata to populate this field."}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 60 }}>
                  <div>
                    <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 12 }}>Production Stats</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Status</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#ffaa00' }}>{activeProject.status}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Completion</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{(activeProject as any).completion || 0}%</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 12 }}>Crew</div>
                    {(activeProject.crew && activeProject.crew.length > 0) ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        {activeProject.crew.slice(0, 3).map((c, i) => (
                          <div key={c.id} title={`${c.name} — ${c.role}`}>
                            <Avatar src={c.avatar} name={c.name} size={32} accent={`hsl(${(i * 97) % 360}, 40%, 30%)`} style={{ color: '#fff' }} />
                          </div>
                        ))}
                        {activeProject.crew.length > 3 && (
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>+{activeProject.crew.length - 3}</div>
                        )}
                      </div>
                    ) : (
                      <Link href={`/projects/${activeProject.id}?tab=crew`} style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}>No crew yet — add some →</Link>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 60, padding: 32, background: 'linear-gradient(to right, rgba(255,255,255,0.02), transparent)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
                      <DollarSign size={16} color="var(--accent)" /> Production Budget
                    </div>
                    <span style={{ fontSize: 10, fontFamily: 'var(--mono)', background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: 20 }}>USD</span>
                  </div>
                  {(activeProject.budget_items && activeProject.budget_items.length > 0) ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 4 }}>Total Estimated Budget</div>
                        <div style={{ fontSize: '2.5rem', fontFamily: 'var(--display)', color: '#fff', letterSpacing: 2 }}>
                          ${activeProject.budget_items.reduce((s, b) => s + Number(b.amount || 0), 0).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
                        {activeProject.budget_items.slice(0, 4).map(b => (
                          <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'var(--mono)' }}>
                            <span style={{ color: 'var(--fg-muted)' }}>{b.category}</span>
                            <span>${Number(b.amount || 0).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontSize: 11, color: 'var(--fg-dim)' }}>No budget line items tracked for this project yet.</p>
                  )}
                </div>

                <div style={{ marginTop: 40 }}>
                   <SectionLabel text="Project Milestones" />
                   {(activeProject.timeline_items && activeProject.timeline_items.length > 0) ? (
                     <div style={{ position: 'relative', paddingLeft: 24, borderLeft: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {activeProject.timeline_items.map((m) => (
                          <div key={m.id} style={{ position: 'relative' }}>
                             <div style={{ position: 'absolute', left: -28, top: 4, width: 8, height: 8, borderRadius: '50%', background: m.completion >= 100 ? 'var(--accent)' : '#222', border: m.completion >= 100 ? 'none' : '1px solid #444' }} />
                             <div style={{ fontSize: 12, fontWeight: 700, color: m.completion >= 100 ? '#fff' : '#666' }}>{m.title}</div>
                             <div style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--fg-subtle)' }}>{new Date(m.end_date).toLocaleDateString()} · {m.completion}%</div>
                          </div>
                        ))}
                     </div>
                   ) : (
                     <Link href={`/projects/${activeProject.id}?tab=schedule`} style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}>No milestones yet — add some →</Link>
                   )}
                </div>
              </motion.div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 32 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ClipboardList size={16} /> Recent Activity
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {activities.length > 0 ? activities.map((act, i) => (
                  <div key={act.id} style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700 }}>
                      {act.profiles?.username?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#eee' }}><span style={{ fontWeight: 700 }}>{act.profiles?.username || 'Someone'}</span> {act.action}</div>
                      <div style={{ fontSize: 9, color: 'var(--fg-subtle)' }}>{new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                )) : (
                  <div style={{ fontSize: 11, color: '#444', textAlign: 'center', padding: '20px 0' }}>No recent activity</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'concept' && (
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
                <button className="link-btn" onClick={() => setShowAddConcept(s => !s)}>+ New Ref</button>
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
        )}

        {activeTab === 'production' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
              <div>
                <SectionLabel text="Pre-Production" />
                <h2 style={{ fontFamily: 'var(--display)', fontSize: '2.5rem', letterSpacing: 2 }}>Production Suite</h2>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {prodTab === 'schedule' && <button className="link-btn" onClick={printSchedule}>⎙ Export Schedule</button>}
                {prodTab === 'story' && <button className="link-btn" onClick={() => setShowAddBeat(s => !s)}>+ New Beat</button>}
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
                       <button className="link-btn" style={{ fontSize: 9, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setShowAddScene(s => !s)}><Calendar size={12}/> + Add Scene</button>
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
                                 <input value={editScene.title} onChange={e => setEditScene(p => ({ ...p, title: e.target.value }))} placeholder="Title" style={{ flex: 2, minWidth: 0, padding: '6px 8px', background: '#0a0a0a', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 6, color: '#fff', fontSize: 11 }} />
                                 <input value={editScene.location} onChange={e => setEditScene(p => ({ ...p, location: e.target.value }))} placeholder="Location" style={{ flex: 1, minWidth: 0, padding: '6px 8px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 11 }} />
                                 <select value={editScene.time_of_day} onChange={e => setEditScene(p => ({ ...p, time_of_day: e.target.value }))} style={{ padding: '6px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 10 }}>
                                   {['DAY', 'NIGHT', 'DAWN', 'DUSK', 'MORNING', 'EVENING', 'CONTINUOUS'].map(t => <option key={t} value={t}>{t}</option>)}
                                 </select>
                                 <input type="number" min="1" value={editScene.shoot_day} onChange={e => setEditScene(p => ({ ...p, shoot_day: e.target.value }))} style={{ width: 56, padding: '6px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 11 }} />
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
        )}

        {activeTab === 'assets' && (
          <AnimatedSection>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
              <div>
                <SectionLabel text="Asset Library" />
                <h2 style={{ fontFamily: 'var(--display)', fontSize: '2.5rem', letterSpacing: 2 }}>Digital Assets</h2>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 28, flexWrap: 'wrap' }}>
              {types.map(t => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  style={{
                    padding: '7px 16px',
                    background: filter === t ? 'var(--accent)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${filter === t ? 'var(--accent)' : 'rgba(255,255,255,0.06)'}`,
                    color: filter === t ? 'var(--bg)' : 'var(--fg-muted)',
                    fontFamily: 'var(--mono)',
                    fontSize: 9,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    borderRadius: 'var(--radius-full)',
                    transition: 'all 0.3s',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            {loadingBoards ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="skeleton" style={{ height: 180, borderRadius: 14 }} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={<Archive size={28} />}
                title={assetsList.length === 0 ? 'Vault is empty' : 'No assets match this filter'}
                subtitle={assetsList.length === 0 ? 'Use Intake above to track files hosted elsewhere' : undefined}
              />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                {filtered.map((asset, i) => <AssetCard key={asset.id} asset={asset} index={i} onClick={setReviewAsset} />)}
              </div>
            )}
          </AnimatedSection>
        )}

        {activeTab === 'pitch' && (
          activeProject ? (
            <ProjectPitchDeck project={activeProject} concepts={(activeProject.concept_assets || []) as any[]} beats={beats} />
          ) : (
            <div style={{ padding: '64px 0', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)', letterSpacing: 2 }}>SELECT A PROJECT TO BUILD A PITCH</div>
          )
        )}
        {activeTab === 'marketing' && studioModules.distribution && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
              <div>
                <SectionLabel text="Delivery & Promotion" />
                <h2 style={{ fontFamily: 'var(--display)', fontSize: '2.5rem', letterSpacing: 2 }}>Marketing Hub</h2>
              </div>
              <button className="link-btn" onClick={() => setShowAddCampaign(s => !s)}>+ New Campaign</button>
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
        )}
      </section>
    </main>
  );
}
