'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, PenTool, Layers, Users, Film, Briefcase,
  ChevronRight, Clock, Calendar, FileText, Image, Video,
  Music, Plus, ExternalLink, Circle,
} from 'lucide-react';
import GrainOverlay from '@/components/GrainOverlay';
import { useConfirm } from '@/components/Confirm';
import { useToast } from '@/components/Toast';
import { supabase } from '@/lib/supabase/client';
import type { Json } from '@/lib/supabase/database.types';
import { breakdown, costByCategory } from '@/lib/breakdown';
import { createJob, getBudgetItemIdsWithJobs } from '@/lib/supabase/jobs';
import { updateProjectVisibility, PROJECT_VISIBILITY } from '@/lib/supabase/projects';
import { notify } from '@/lib/supabase/notifications';
import { usePillZone } from '@/lib/context/PillContext';
import { type Phase, mapStatusToPhase, phaseIndexIn, useProject } from '@/lib/os';
import { findFormat, formatPhases, useFormats } from '@/lib/formats';
import type { ProjectSettings } from '@/lib/types/settings';
import { getProjectModules, SCRIPT_FORMAT_LABELS } from '@/lib/types/settings';
import type { ScriptFormat } from '@/lib/scriptos/parser';
import { awaitOSUser } from '@/lib/os';
import { readable } from '@/lib/color';
import { useOnlinePresence } from '@/lib/hooks/usePresence';
import { useProjectProgress } from '@/lib/hooks/useProjectProgress';
import { useProjectBrief, useCanShape } from '@/lib/brief';
import { BriefPanel } from '@/components/brief/BriefPanel';
import { PhasePanel } from '@/components/progress/PhasePanel';
import { announceProgressChange } from '@/lib/supabase/progress';
import { LoglineEditor } from '@/components/progress/LoglineEditor';
import { CraftPicker } from '@/components/crafts/CraftPicker';
import { loadCrafts, suggestCraft } from '@/lib/crafts';


// ─── Types ──────────────────────────────────────────────────────────────────

interface ProjectHubViewModel {
  id: string;
  title: string;
  type: string;
  phase: Phase;
  deadline: string;
  team: { name: string; role: string; online?: boolean }[];
  description: string;
  color: string;
  scriptPages?: number;
  scriptDraft?: number;
  assetCount?: number;
  assetGB?: number;
  publishedWork?: number;
  settings?: ProjectSettings;
  visibility: 'private' | 'team' | 'link' | 'public';
  shareUrl: string;
  isOwner: boolean;
}

// ─── Department window ───────────────────────────────────────────────────────

interface DeptWindowProps {
  title: string;
  tag: string;
  color: string;
  href: string;
  stats: { label: string; value: string | number }[];
  preview: React.ReactNode;
  delay?: number;
  span?: 'single' | 'double';
}

function DeptWindow({ title, tag, color: rawColor, href, stats, preview, delay = 0, span = 'single' }: DeptWindowProps) {
  const [hovered, setHovered] = useState(false);
  const color = readable(rawColor);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{
        gridColumn: span === 'double' ? 'span 2' : 'span 1',
        background: 'rgba(10,10,10,0.8)',
        border: `1px solid ${hovered ? color + '30' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 16,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color 0.4s',
        boxShadow: hovered ? `0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px ${color}18` : 'none',
        position: 'relative',
      }}
    >
      <div style={{
        position: 'absolute', top: -40, right: -40, width: 140, height: 140,
        borderRadius: '50%', pointerEvents: 'none',
        background: `radial-gradient(circle, ${color}12 0%, transparent 65%)`,
        opacity: hovered ? 1 : 0.5, transition: 'opacity 0.4s',
      }} />

      <div style={{
        padding: '10px 14px',
        borderBottom: `1px solid ${hovered ? color + '18' : 'rgba(255,255,255,0.04)'}`,
        display: 'flex', alignItems: 'center', gap: 8,
        transition: 'border-color 0.4s', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#3a3a3a', '#3a3a3a', '#3a3a3a'].map((c, i) => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
          ))}
        </div>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 7.5, color: color, letterSpacing: 3, textTransform: 'uppercase', marginLeft: 6, opacity: 0.85 }}>{tag}</span>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {preview}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, background: 'linear-gradient(transparent, rgba(10,10,10,0.9))', pointerEvents: 'none' }} />
      </div>

      <div style={{
        padding: '12px 16px',
        borderTop: `1px solid rgba(255,255,255,0.04)`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 18 }}>
          {stats.map(s => (
            <div key={s.label}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: 'var(--fg)', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--fg-dim)', letterSpacing: 2, textTransform: 'uppercase', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <Link href={href} style={{ textDecoration: 'none' }}>
          <motion.div
            whileHover={{ scale: 1.06, x: 2 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: 2,
              textTransform: 'uppercase', color: color,
              padding: '6px 12px', borderRadius: 9999,
              background: `${color}12`, border: `1px solid ${color}28`,
            }}
          >
            Open <ExternalLink size={9} />
          </motion.div>
        </Link>
      </div>
    </motion.div>
  );
}

// ─── Script preview ──────────────────────────────────────────────────────────

function ScriptPreview({ pages, scripts, scenes }: { pages: number; scripts: number; scenes: number }) {
  const bars = Math.min(14, Math.max(scenes || scripts || 0, pages > 0 ? 8 : 0));
  return (
    <div style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 700, color: 'var(--fg)', lineHeight: 1 }}>{pages}</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)', letterSpacing: 2, textTransform: 'uppercase' }}>pages · {scripts} script{scripts === 1 ? '' : 's'} · {scenes} scene{scenes === 1 ? '' : 's'}</span>
      </div>
      {bars > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {Array.from({ length: bars }).map((_, i) => (
            <div key={i} style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)', width: `${40 + ((i * 53) % 60)}%` }} />
          ))}
        </div>
      ) : (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-dim)', letterSpacing: 1 }}>No script yet — open ScriptOS to start.</div>
      )}
    </div>
  );
}

// ─── Asset preview ───────────────────────────────────────────────────────────

function AssetPreview({ concepts, scenes }: { concepts: number; scenes: number }) {
  const total = concepts + scenes;
  const filled = Math.min(6, concepts);
  const palette = ['#6366f1', '#e8431a', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
  return (
    <div style={{ padding: '10px 12px' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>{concepts} reference{concepts === 1 ? '' : 's'} · {scenes} scene{scenes === 1 ? '' : 's'}</div>
      {total > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ aspectRatio: '1/1', borderRadius: 8, background: i < filled ? `${palette[i]}22` : 'rgba(255,255,255,0.03)', border: `1px solid ${i < filled ? palette[i] + '44' : 'rgba(255,255,255,0.05)'}` }} />
          ))}
        </div>
      ) : (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-dim)', letterSpacing: 1 }}>No assets yet — add them in Studio.</div>
      )}
    </div>
  );
}

// ─── Crew preview ─────────────────────────────────────────────────────────────

function CrewPreview({ team }: { team: ProjectHubViewModel['team'] }) {
  return (
    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {team.map((member, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: `hsl(${(i * 97) % 360}, 40%, 30%)`,
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg)',
          }}>
            {member.name.charAt(0)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.name}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 7.5, color: 'var(--fg-dim)', letterSpacing: 1 }}>{member.role}</div>
          </div>
          {member.online && (
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', flexShrink: 0, boxShadow: '0 0 6px #10b981' }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Timeline preview ────────────────────────────────────────────────────────

interface MilestoneRow { id: string; title: string; end_date: string | null; status: string | null }

function TimelinePreview({ deadline, milestones }: { deadline: string; milestones: MilestoneRow[] }) {
  const dl = deadline ? new Date(deadline).getTime() : NaN;
  const daysLeft = isNaN(dl) ? null : Math.ceil((dl - Date.now()) / 86400000);
  const upcoming = [...milestones].sort((a, b) => String(a.end_date ?? '9999').localeCompare(String(b.end_date ?? '9999'))).slice(0, 5);

  return (
    <div style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
        {daysLeft === null ? (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-dim)', letterSpacing: 1.5, textTransform: 'uppercase' }}>No end date set</span>
        ) : (
          <>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 700, color: daysLeft < 30 ? '#e8431a' : 'var(--fg)', lineHeight: 1 }}>{Math.abs(daysLeft)}</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)', letterSpacing: 2, textTransform: 'uppercase' }}>{daysLeft < 0 ? 'days past the end date' : 'days to the end date'}</span>
          </>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {upcoming.length === 0 && <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-dim)' }}>No milestones yet — add them below.</span>}
        {upcoming.map((m) => {
          const done = m.status === 'done' || m.status === 'completed';
          return (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: done ? '#10b981' : 'rgba(255,255,255,0.1)' }} />
              <span style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 9, color: done ? 'var(--fg-muted)' : 'var(--fg-dim)', textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.5 : 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</span>
              {m.end_date && <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)' }}>{new Date(m.end_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Portfolio preview ───────────────────────────────────────────────────────

function PortfolioPreview({ pieces }: { pieces: { id: string; title: string }[] }) {
  return (
    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {pieces.length === 0 && <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-dim)' }}>Not in your portfolio yet.</span>}
      {pieces.slice(0, 4).map((p) => (
        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--fg-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function ProjectHubPage() {
  const confirm = useConfirm();
  const { toast } = useToast();
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const { activeProject, setActiveProject, refreshProject } = useProject();

  const [realProject, setRealProject] = useState<ProjectHubViewModel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      supabase.from('projects').select('*').eq('id', id).single().then(async ({ data, error }) => {
        if (!active) return;
        if (error || !data) { router.push('/projects'); return; }
        const row = data;
        const phase = mapStatusToPhase(row.status ?? undefined);
        const me = (await awaitOSUser()) || null;
        const token = row.share_token || '';
        setRealProject({
          id: row.id,
          title: row.title,
          type: row.project_type || 'Project',
          phase,
          deadline: row.end_date || '',
          description: row.description || '',
          color: readable(row.accent_color || '#e8431a'),
          team: [],
          settings: row.settings as unknown as ProjectSettings,
          visibility: (row.visibility as ProjectHubViewModel['visibility']) || 'team',
          shareUrl: token ? `/shared/${token}` : '',
          isOwner: me?.id === row.creator_id,
        });
        setLoading(false);
        if (activeProject?.id !== data.id) refreshProject(data.id);
      });
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refreshProject is stable from context; activeProject?.id intentionally omitted to avoid re-fetch loop
  }, [id, router]);

  const [counts, setCounts] = useState({ scripts: 0, pages: 0, crew: 0, tasks: 0, tasksDone: 0, budget: 0, timeline: 0, scenes: 0, concepts: 0, festivalsSubmitted: 0, festivalsAccepted: 0, campaigns: 0 });
  const [milestones, setMilestones] = useState<MilestoneRow[]>([]);
  const [portfolioPieces, setPortfolioPieces] = useState<{ id: string; title: string }[]>([]);
  const [crewTeam, setCrewTeam] = useState<{ id: string; name: string; role: string }[]>([]);
  const onlineIds = useOnlinePresence(realProject ? 'me' : null);
  const progressState = useProjectProgress(id);
  const briefFormat = progressState.signals?.project_type ?? null;
  const brief = useProjectBrief(realProject ? id : null, briefFormat, progressState.progress?.current.id ?? null);
  const canShape = useCanShape(realProject ? id : null, !!realProject?.isOwner);
  const { formats } = useFormats();
  useEffect(() => {
    let active = true;
    (async () => {
      const [sc, cr, tk, bd, tl, scn, cn, pf, pr, cp] = await Promise.all([
        supabase.from('scripts').select('id').eq('project_id', id),
        supabase.from('project_crew').select('id, user_id, role, craft, profiles!project_crew_user_id_fkey(username)').eq('project_id', id),
        supabase.from('project_tasks').select('completed').eq('project_id', id),
        supabase.from('budget_items').select('amount').eq('project_id', id),
        supabase.from('timeline_items').select('id, title, end_date, status').eq('project_id', id),
        supabase.from('scenes').select('est_duration').eq('project_id', id).is('removed_at', null),
        supabase.from('media').select('id', { count: 'exact', head: true }).eq('project_id', id),
        supabase.from('portfolio_projects').select('id, title').eq('source_project_id', id),
        supabase.from('projects').select('festival_submissions').eq('id', id).single(),
        supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('project_id', id),
      ]);
      if (!active) return;
      const tasks = tk.data || [];
      // Page count from the scene index: each scene's length in eighths.
      const eighths = (scn.data || []).reduce((n, row) => n + (Number(String(row.est_duration || '').match(/(\d+)\s*\/\s*8/)?.[1]) || 0), 0);
      const festivals = (Array.isArray(pr.data?.festival_submissions) ? pr.data!.festival_submissions : []) as { status?: string }[];
      setCounts({
        scripts: sc.data?.length || 0,
        // Short scripts in tenths (3/8 pg → 0.4), longer ones in whole pages.
        pages: eighths < 80 ? Math.round(eighths / 0.8) / 10 : Math.round(eighths / 8),
        crew: cr.data?.length || 0,
        tasks: tasks.length,
        tasksDone: tasks.filter(t => t.completed).length,
        budget: (bd.data || []).reduce((n, x) => n + Number(x.amount || 0), 0),
        timeline: tl.data?.length || 0,
        scenes: scn.data?.length || 0,
        concepts: cn.count || 0,
        festivalsSubmitted: festivals.filter(f => f.status === 'submitted' || f.status === 'accepted').length,
        festivalsAccepted: festivals.filter(f => f.status === 'accepted').length,
        campaigns: cp.count || 0,
      });
      setMilestones(tl.data || []);
      setPortfolioPieces(pf.data || []);
      setCrewTeam((cr.data || []).map(c => ({ id: c.user_id, name: c.profiles?.username || 'Crew', role: c.craft || (c.role === 'lead' ? 'Lead' : 'Crew') })));
    })();
    return () => { active = false; };
  }, [id]);

  const project = realProject;

  if (loading || !project) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 3, color: 'var(--fg-dim)' }}>LOADING</div>
      </div>
    );
  }

  const isRealProject = true;
  const team = crewTeam.map(m => ({ ...m, online: onlineIds.has(m.id) }));
  const onlineCount = team.filter(m => m.online).length;

  // The phase panel re-reads the project after a phase or format change; the header follows it.
  const format = findFormat(formats, project.type);
  const typePhases = progressState.progress?.phases ?? formatPhases(format);
  const typePhaseIdx = progressState.progress?.currentIndex ?? phaseIndexIn(format?.rules, project.phase);
  const modules = getProjectModules(project.settings);

  const changeVisibility = async (v: 'private' | 'team' | 'link' | 'public') => {
    try {
      const shareUrl = await updateProjectVisibility(id, v);
      setRealProject(p => p ? { ...p, visibility: v, shareUrl: shareUrl || p.shareUrl } : p);
      const msg = v === 'private' ? 'Project is now private (you only).'
        : v === 'team' ? 'Project is now team-only.'
        : v === 'link' ? 'Anyone with the link can now view this project.'
        : 'Project is now public.';
      toast(msg, 'success');
      refreshProject(id);
    } catch (e: any) {
      toast(e?.message || 'Could not update visibility', 'error');
    }
  };

  const copyShareLink = async () => {
    if (!project.shareUrl) { toast('Share link is not ready yet.', 'error'); return; }
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${project.shareUrl}`);
      toast('Share link copied.', 'success');
    } catch {
      toast('Could not copy — copy it manually: ' + window.location.origin + project.shareUrl, 'info');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', overflow: 'hidden' }}>
      <GrainOverlay />

      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: '50vh', pointerEvents: 'none', zIndex: 0,
        background: `radial-gradient(ellipse at 50% -20%, ${project.color}0a 0%, transparent 65%)`,
      }} />

      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: 'rgba(6,6,6,0.92)', backdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          padding: '0 28px', height: 58,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/projects" aria-label="Back to projects" style={{ color: 'var(--fg-dim)', display: 'flex', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--fg)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--fg-dim)'}
          >
            <ArrowLeft size={16} />
          </Link>
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.07)' }} />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontFamily: 'var(--display)', fontSize: '1.2rem', letterSpacing: 4 }}>{project.title}</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 3, textTransform: 'uppercase', color: project.color }}>{project.type}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {typePhases.map((phase, i) => {
            const isDone   = i < typePhaseIdx;
            const isActive = i === typePhaseIdx;
            const isFuture = i > typePhaseIdx;
            return (
              <React.Fragment key={phase.id}>
                <div style={{
                  padding: '5px 12px', borderRadius: 9999,
                  fontFamily: 'var(--mono)', fontSize: 7.5, letterSpacing: 2.5, textTransform: 'uppercase',
                  background: isActive ? `${project.color}18` : 'transparent',
                  color: isActive ? project.color : isDone ? 'var(--fg-muted)' : 'var(--fg-dim)',
                  border: isActive ? `1px solid ${project.color}35` : '1px solid transparent',
                  transition: 'all 0.3s', whiteSpace: 'nowrap',
                }}>
                  {isDone && <span style={{ marginRight: 4 }}>✓</span>}
                  {phase.abbr}
                </div>
                {i < typePhases.length - 1 && (
                  <div style={{
                    width: 16, height: 1,
                    background: isDone ? `${project.color}60` : 'rgba(255,255,255,0.08)',
                    transition: 'background 0.4s',
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {onlineCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 8, color: '#10b981', letterSpacing: 1.5 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 2.5s ease-in-out infinite' }} />
              {onlineCount} online
            </div>
          )}
          {counts.tasks > 0 && (
          <div title="Tasks completed" style={{
            fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)', letterSpacing: 1.5,
            padding: '5px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.04)',
          }}>
            {counts.tasksDone}/{counts.tasks} tasks done
          </div>
          )}
          {project.isOwner && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <select
                value={project.visibility}
                onChange={e => changeVisibility(e.target.value as 'private' | 'team' | 'link' | 'public')}
                aria-label="Project visibility"
                title="Who can see this project"
                style={{
                  fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 1.2, color: 'var(--fg-muted)',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6, padding: '5px 8px', cursor: 'pointer', outline: 'none',
                }}
              >
                {PROJECT_VISIBILITY.map(v => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </select>
              {project.visibility === 'link' && (
                <button
                  onClick={copyShareLink}
                  title="Copy the share link — anyone with it can view this project"
                  style={{
                    fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 1.2, color: readable('#8b5cf6', 4.5, '#161024'),
                    background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)',
                    borderRadius: 6, padding: '5px 10px', cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >Copy link</button>
              )}
            </div>
          )}
        </div>
      </motion.header>

      <div style={{ padding: '28px 28px 120px', position: 'relative', zIndex: 1 }}>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{ marginBottom: 24 }}
        >
          <div style={{ fontFamily: 'var(--mono)', fontSize: 7.5, color: 'var(--fg-dim)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>Production Hub</div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: 400, letterSpacing: 2, lineHeight: 0.9, margin: 0 }}>{project.title}</h1>
          <LoglineEditor
            projectId={id}
            value={project.description}
            isOwner={project.isOwner}
            onSaved={(logline) => setRealProject(p => p ? { ...p, description: logline } : p)}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{ marginBottom: 24 }}
        >
          <PhasePanel projectId={id} state={progressState} isOwner={project.isOwner} accent={project.color}
            onFormatChanged={(type) => { setRealProject(p => p ? { ...p, type } : p); refreshProject(id); }} />
        </motion.div>

        {isRealProject && progressState.progress && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.7, ease: [0.16, 1, 0.3, 1] }} style={{ marginBottom: 24 }}>
            <BriefPanel brief={brief} projectTitle={project.title} format={briefFormat} phase={progressState.progress.current.id}
              canEdit={canShape} accent={project.color} />
          </motion.div>
        )}

        {/*
          Grid layout — control room:
          ┌─────────────────┬──────────────┐
          │  ScriptOS (2×)  │  Studio      │  row 1
          ├────────┬────────┤              │
          │  Crew  │ Sched  ├──────────────┤  row 2
          └────────┴────────┴──────────────┘

          Actually let's do a clean responsive grid:
          Top row:   [ScriptOS large] [Studio]
          Mid row:   [Crew] [Timeline] [Portfolio]
        */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>

          {modules.scriptos && (
            <DeptWindow
              title="ScriptOS"
              tag="Screenplay"
              color="#e8431a"
              href="/editor"
              delay={0.05}
              stats={[
                { label: 'Pages', value: counts.pages },
                { label: 'Scripts', value: counts.scripts },
              ]}
              preview={<ScriptPreview pages={counts.pages} scripts={counts.scripts} scenes={counts.scenes} />}
            />
          )}

          {modules.studio && (
            <DeptWindow
              title="Studio"
              tag="Assets"
              color="#6366f1"
              href="/studio"
              delay={0.1}
              stats={[
                { label: 'References', value: counts.concepts },
                { label: 'Scenes',   value: counts.scenes },
              ]}
              preview={<AssetPreview concepts={counts.concepts} scenes={counts.scenes} />}
            />
          )}

          {modules.lounge && (
            <DeptWindow
              title="Lounge"
              tag="Crew"
              color="#10b981"
              href="/lounge"
              delay={0.15}
              stats={[
                { label: 'Crew',  value: counts.crew },
                { label: 'Tasks', value: `${counts.tasksDone}/${counts.tasks}` },
              ]}
              preview={<CrewPreview team={team} />}
            />
          )}

          <DeptWindow
            title="Timeline"
            tag="Schedule"
            color="#f59e0b"
            href="#production"
            delay={0.2}
            stats={[
              { label: 'Milestones', value: counts.timeline },
              { label: 'Budget', value: counts.budget > 0 ? `$${(counts.budget / 1000).toFixed(1)}k` : '$0' },
            ]}
            preview={<TimelinePreview deadline={project.deadline} milestones={milestones} />}
          />

          {modules.portfolio && (
            <DeptWindow
              title="Portfolio"
              tag="Showcase"
              color="#8b5cf6"
              href="/portfolio"
              delay={0.25}
              stats={[
                { label: 'Phase', value: typePhases[typePhaseIdx].abbr },
                { label: 'Type',  value: project.type },
              ]}
              preview={<PortfolioPreview pieces={portfolioPieces} />}
            />
          )}

          {modules.distribution && (
            <DeptWindow
              title="Distribution"
              tag="Launch"
              color="#ec4899"
              href="/studio?tab=promos"
              delay={0.3}
              stats={[
                { label: 'Festivals', value: counts.festivalsSubmitted },
                { label: 'Campaigns', value: counts.campaigns },
              ]}
              preview={
                <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { label: 'Festival submissions', value: String(counts.festivalsSubmitted) },
                    { label: 'Accepted', value: String(counts.festivalsAccepted) },
                    { label: 'Campaigns planned', value: String(counts.campaigns) },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-dim)' }}>{label}</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-muted)' }}>{value}</span>
                    </div>
                  ))}
                </div>
              }
            />
          )}

        </div>

        {isRealProject && <div id="production" />}
        {isRealProject && <ProductionManager projectId={id} projectTitle={project.title} accent={project.color} isOwner={project.isOwner} />}
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );
}

// ─── Production Manager (live Supabase CRUD: tasks, budget, timeline, crew) ────

interface TaskRow { id: string; title: string; completed: boolean; assigned_to: string | null; due_date: string | null }
interface BudgetRow { id: string; category: string; amount: number; actual_cost?: number | null }
interface TimelineRow { id: string; title: string; start_date: string | null; end_date: string | null }
interface CrewRow { id: string; user_id: string; role: string; craft: string | null; profiles?: { username: string } | null }
interface PortfolioRow { id: string; title: string; share_token: string }
interface FestivalRow { id: string; name: string; deadline?: string; status: 'planned' | 'submitted' | 'accepted' | 'rejected'; notes?: string }

const SCRIPT_FORMATS: ScriptFormat[] = ['screenplay', 'teleplay', 'stage-play', 'treatment', 'podcast', 'doc-outline'];
const FESTIVAL_STATUSES: FestivalRow['status'][] = ['planned', 'submitted', 'accepted', 'rejected'];
const FESTIVAL_STATUS_COLOR: Record<FestivalRow['status'], string> = {
  planned: '#6b7280', submitted: '#f59e0b', accepted: '#10b981', rejected: '#ef4444',
};

const MINI_INPUT: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '2px 4px', fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--fg-dim)', colorScheme: 'dark' };

// Crew work tasks, budget and milestones with the owner; the crew list, festivals
// and project settings live on the project row, which only its owner can change.
function ProductionManager({ projectId, projectTitle, accent, isOwner }: { projectId: string; projectTitle: string; accent: string; isOwner: boolean }) {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [budget, setBudget] = useState<BudgetRow[]>([]);
  const [timeline, setTimeline] = useState<TimelineRow[]>([]);
  const [crew, setCrew] = useState<CrewRow[]>([]);
  const [owner, setOwner] = useState<{ id: string; username: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [breakdownNote, setBreakdownNote] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const [postedBudgetIds, setPostedBudgetIds] = useState<Set<string>>(new Set());
  const [postingBudgetId, setPostingBudgetId] = useState<string | null>(null);

  const [portfolio, setPortfolio] = useState<PortfolioRow[]>([]);
  const [settings, setSettings] = useState<ProjectSettings>({ modules: { scriptos: true, studio: true, lounge: true, portfolio: true, distribution: true } });
  const [festivals, setFestivals] = useState<FestivalRow[]>([]);

  const load = React.useCallback(async () => {
    try {
      const [t, b, tl, c, pf, proj] = await Promise.all([
        supabase.from('project_tasks').select('id,title,completed,assigned_to,due_date').eq('project_id', projectId).order('created_at'),
        supabase.from('budget_items').select('id,category,amount,actual_cost').eq('project_id', projectId).order('created_at'),
        supabase.from('timeline_items').select('id,title,start_date,end_date').eq('project_id', projectId).order('start_date', { nullsFirst: true }),
        supabase.from('project_crew').select('id,user_id,role,craft,profiles!project_crew_user_id_fkey(username)').eq('project_id', projectId),
        supabase.from('portfolio_projects').select('id,title,share_token').eq('source_project_id', projectId).order('created_at', { ascending: false }),
        supabase.from('projects').select('settings,festival_submissions,creator_id').eq('id', projectId).single(),
      ]);
      setTasks((t.data as TaskRow[]) || []);
      setBudget((b.data as BudgetRow[]) || []);
      setTimeline((tl.data as TimelineRow[]) || []);
      setCrew((c.data as unknown as CrewRow[]) || []);
      setPortfolio((pf.data as PortfolioRow[]) || []);
      setPostedBudgetIds(await getBudgetItemIdsWithJobs(projectId));
      if (proj.data?.settings) setSettings(proj.data.settings as unknown as ProjectSettings);
      setFestivals((proj.data?.festival_submissions as unknown as FestivalRow[]) || []);
      if (proj.data?.creator_id) {
        const { data: owner } = await supabase.from('profiles').select('id,username').eq('id', proj.data.creator_id).maybeSingle();
        setOwner(owner ? { id: owner.id, username: owner.username } : null);
      }
    } catch (e: any) {
      setErr(e.message);
    }
  }, [projectId]);

  useEffect(() => {
    awaitOSUser().then((user) => setUserId(user?.id ?? null));
    load();
  }, [load]);

  // Tasks, budget, crew and festivals count toward the phase milestones.
  const progressKey = `${tasks.map(t => (t.completed ? 1 : 0)).join('')}|${budget.length}|${crew.length}|${festivals.map(f => f.status).join(',')}`;
  useEffect(() => { announceProgressChange(projectId); }, [projectId, progressKey]);

  const addTask = async (title: string) => {
    const { data, error } = await supabase.from('project_tasks')
      .insert({ project_id: projectId, title }).select('id,title,completed,assigned_to,due_date').single();
    if (error) return setErr(error.message);
    setTasks(p => [...p, data as TaskRow]);
  };
  const toggleTask = async (t: TaskRow) => {
    setTasks(p => p.map(x => x.id === t.id ? { ...x, completed: !t.completed } : x));
    const { error } = await supabase.from('project_tasks').update({ completed: !t.completed }).eq('id', t.id);
    if (error) { setErr(error.message); setTasks(p => p.map(x => x.id === t.id ? { ...x, completed: t.completed } : x)); }
  };
  const setTaskField = async (t: TaskRow, patch: Partial<Pick<TaskRow, 'assigned_to' | 'due_date'>>) => {
    setTasks(p => p.map(x => x.id === t.id ? { ...x, ...patch } : x));
    const { error } = await supabase.from('project_tasks').update(patch).eq('id', t.id);
    if (error) { setErr(error.message); setTasks(p => p.map(x => x.id === t.id ? t : x)); return; }
    if (patch.assigned_to && patch.assigned_to !== t.assigned_to) {
      notify(patch.assigned_to, { type: 'task', title: `You were assigned “${t.title}”`, body: projectTitle, link: `/projects/${projectId}` }, userId);
    }
  };
  const delTask = async (id: string) => {
    if (!await confirm('Delete this task? This cannot be undone.')) return;
    const prev = tasks;
    setTasks(p => p.filter(x => x.id !== id));
    const { error } = await supabase.from('project_tasks').delete().eq('id', id);
    if (error) { setErr(error.message); setTasks(prev); }
  };

  const addBudget = async (category: string, amount: number) => {
    const { data, error } = await supabase.from('budget_items')
      .insert({ project_id: projectId, category, amount, created_by: userId }).select('id,category,amount').single();
    if (error) return setErr(error.message);
    setBudget(p => [...p, data as BudgetRow]);
  };
  const delBudget = async (id: string) => {
    if (!await confirm('Delete this budget line? This cannot be undone.')) return;
    const prev = budget;
    setBudget(p => p.filter(x => x.id !== id));
    const { error } = await supabase.from('budget_items').delete().eq('id', id);
    if (error) { setErr(error.message); setBudget(prev); }
  };

  const postJobFromBudget = async (b: BudgetRow) => {
    if (!userId || postedBudgetIds.has(b.id)) return;
    setPostingBudgetId(b.id);
    try {
      // The job's craft: the one this budget line is about (a job needs one from the crafts list).
      const craft = suggestCraft(b.category, await loadCrafts());
      await createJob(projectId, userId, b.category.replace(/^Breakdown · /, ''), craft, '', Number(b.amount) || undefined, b.id);
      setPostedBudgetIds(prev => new Set(prev).add(b.id));
      toast(`Posted "${b.category}" to the Jobs board`, 'success');
    } catch (e: any) {
      toast(e.message || 'Could not post this as a job', 'error');
    } finally {
      setPostingBudgetId(null);
    }
  };
  const setActual = async (id: string, actual: number | null) => {
    const before = budget.find(x => x.id === id)?.actual_cost ?? null;
    setBudget(p => p.map(x => x.id === id ? { ...x, actual_cost: actual } : x));
    const { error } = await supabase.from('budget_items').update({ actual_cost: actual }).eq('id', id);
    if (error) { setErr(error.message); setBudget(p => p.map(x => x.id === id ? { ...x, actual_cost: before } : x)); }
  };

  // The budget's breakdown lines come from the breakdown itself: each
  // element's cost, or its category's unit cost (Studio › Production › Breakdown).
  const syncFromBreakdown = async () => {
    setAnalyzing(true); setErr(null);
    try {
      const [cats, els] = await Promise.all([breakdown.listCategories(projectId), breakdown.listElements(projectId)]);
      const costs = costByCategory(cats, els);
      if (!els.length) { setBreakdownNote('Nothing tagged yet — break the script down in ScriptOS (tag mode) first.'); return; }
      const r = await breakdown.syncBudget(projectId, costs.map((c) => ({ label: c.category.label, amount: c.amount })));
      await load();
      const unpriced = costs.reduce((n, c) => n + c.unpriced, 0);
      setBreakdownNote(`${els.length} elements · $${Math.round(costs.reduce((n, c) => n + c.amount, 0)).toLocaleString()}${unpriced ? ` · ${unpriced} still unpriced` : ''}${r.added + r.updated + r.removed ? '' : ' · already up to date'}`);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const addTimeline = async (title: string, start: string, end: string) => {
    const { data, error } = await supabase.from('timeline_items')
      .insert({ project_id: projectId, title, start_date: start || null, end_date: end || null, created_by: userId })
      .select('id,title,start_date,end_date').single();
    if (error) return setErr(error.message);
    setTimeline(p => [...p, data as TimelineRow]);
  };
  const delTimeline = async (id: string) => {
    if (!await confirm('Delete this milestone? This cannot be undone.')) return;
    const prev = timeline;
    setTimeline(p => p.filter(x => x.id !== id));
    const { error } = await supabase.from('timeline_items').delete().eq('id', id);
    if (error) { setErr(error.message); setTimeline(prev); }
  };

  const addCrew = async (username: string, craft: string | null) => {
    const { data: prof, error: pErr } = await supabase.from('profiles').select('id,username').eq('username', username.trim()).single();
    if (pErr || !prof) return setErr(`No user "${username}"`);
    const { error } = await supabase.from('project_crew')
      .insert({ project_id: projectId, user_id: prof.id, craft });
    if (error) return setErr(error.message);
    setErr(null);
    load();
  };
  const delCrew = async (id: string) => {
    if (!await confirm('Remove this crew member from the project?')) return;
    const prev = crew;
    setCrew(p => p.filter(x => x.id !== id));
    const { error } = await supabase.from('project_crew').delete().eq('id', id);
    if (error) { setErr(error.message); setCrew(prev); }
  };

  const saveSettings = async (next: ProjectSettings) => {
    const prev = settings;
    setSettings(next);
    const { error } = await supabase.from('projects').update({ settings: next as unknown as Json }).eq('id', projectId);
    if (error) { setErr(error.message); setSettings(prev); }
  };
  const setDefaultFormat = (format: ScriptFormat | '') => {
    saveSettings({ ...settings, defaultScriptFormat: format || undefined });
  };
  const toggleModule = (key: keyof ProjectSettings['modules']) => {
    saveSettings({ ...settings, modules: { ...settings.modules, [key]: !settings.modules[key] } });
  };

  // Festivals live in one jsonb column: write the whole list, roll back on failure.
  const saveFestivals = async (next: FestivalRow[]) => {
    const prev = festivals;
    setFestivals(next);
    const { error } = await supabase.from('projects').update({ festival_submissions: next as unknown as Json }).eq('id', projectId);
    if (error) { setErr(error.message); setFestivals(prev); }
  };
  const addFestival = (name: string, deadline: string) => {
    if (!name.trim()) return;
    saveFestivals([...festivals, { id: crypto.randomUUID(), name: name.trim(), deadline: deadline || undefined, status: 'planned' }]);
  };
  const setFestivalStatus = (id: string, status: FestivalRow['status']) =>
    saveFestivals(festivals.map(f => f.id === id ? { ...f, status } : f));
  const delFestival = async (id: string) => {
    if (!await confirm('Remove this festival submission?')) return;
    saveFestivals(festivals.filter(f => f.id !== id));
  };

  // Who a task can go to: the owner and the crew.
  const people = [
    ...(owner ? [owner] : []),
    ...crew.filter(c => c.user_id !== owner?.id).map(c => ({ id: c.user_id, username: c.profiles?.username || 'Crew' })),
  ];

  const totalBudget = budget.reduce((s, b) => s + Number(b.amount || 0), 0);
  const totalActual = budget.reduce((s, b) => s + Number(b.actual_cost || 0), 0);
  const hasActuals = budget.some(b => b.actual_cost != null);

  return (
    <div style={{ marginTop: 40 }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 7.5, color: 'var(--fg-dim)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 14 }}>Production Management</div>
      {err && <div style={{ color: '#ff5555', fontFamily: 'var(--mono)', fontSize: 10, marginBottom: 12 }}>⚠ {err}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>

        <Panel title="Tasks" accent={accent}>
          {tasks.length === 0 && <Empty>No tasks yet</Empty>}
          {tasks.map(t => (
            <div key={t.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Row>
              <button onClick={() => toggleTask(t)} aria-label="toggle" style={{ background: 'none', border: `1px solid ${t.completed ? '#10b981' : 'rgba(255,255,255,0.25)'}`, borderRadius: 4, width: 15, height: 15, cursor: 'pointer', color: '#10b981', fontSize: 10, lineHeight: 1, flexShrink: 0 }}>{t.completed ? '✓' : ''}</button>
              <span style={{ flex: 1, minWidth: 0, fontSize: 11, color: t.completed ? 'var(--fg-dim)' : 'var(--fg)', textDecoration: t.completed ? 'line-through' : 'none' }}>{t.title}</span>
              <DelBtn onClick={() => delTask(t.id)} />
            </Row>
            <div style={{ display: 'flex', gap: 6, paddingLeft: 23 }}>
                <input
                  type="date"
                  value={t.due_date ?? ''}
                  onChange={e => setTaskField(t, { due_date: e.target.value || null })}
                  aria-label={`Due date for ${t.title}`}
                  title="Due date"
                  style={{ ...MINI_INPUT, width: 104, color: !t.completed && t.due_date && t.due_date < new Date().toISOString().slice(0, 10) ? '#ff6b6b' : 'var(--fg-dim)' }}
                />
                <select
                  value={t.assigned_to ?? ''}
                  onChange={e => setTaskField(t, { assigned_to: e.target.value || null })}
                  aria-label={`Assignee for ${t.title}`}
                  style={{ ...MINI_INPUT, width: 92 }}
                >
                  <option value="">Unassigned</option>
                  {people.map(p => <option key={p.id} value={p.id}>{p.username}</option>)}
                </select>
            </div>
            </div>
          ))}
          <AddForm placeholder="Add a task…" fields={['text']} onSubmit={(v) => v[0] && addTask(v[0])} accent={accent} />
        </Panel>

        <Panel title="Budget" accent={accent} headerRight={totalBudget > 0 ? `$${totalBudget.toLocaleString()}` : undefined}>
          {budget.length === 0 && <Empty>No budget items</Empty>}
          {budget.length > 0 && (
            <p style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--fg-muted)', margin: '0 0 8px' }}>
              Actuals follow what’s paid in <Link href="/studio?tab=production&view=money" style={{ color: 'var(--fg)', textDecoration: 'underline' }}>Studio › Money</Link> — spend, vendors and timesheets.
            </p>
          )}
          {budget.map(b => (
            <BudgetRowItem
              key={b.id} item={b} posted={postedBudgetIds.has(b.id)} posting={postingBudgetId === b.id}
              onSetActual={actual => setActual(b.id, actual)}
              onPostJob={() => postJobFromBudget(b)}
              onDelete={() => delBudget(b.id)}
            />
          ))}
          {hasActuals && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.06)', fontFamily: 'var(--mono)', fontSize: 10 }}>
              <span style={{ color: 'var(--fg-dim)' }}>Actual ${totalActual.toLocaleString()} / Planned ${totalBudget.toLocaleString()}</span>
              <span style={{ color: totalActual > totalBudget ? '#ff6b6b' : '#10b981' }}>{totalActual > totalBudget ? '+' : ''}{(totalActual - totalBudget).toLocaleString()}</span>
            </div>
          )}
          <AddForm placeholder="Category" second="Amount" fields={['text', 'number']} onSubmit={(v) => v[0] && addBudget(v[0], Number(v[1] || 0))} accent={accent} />

          <button onClick={syncFromBreakdown} disabled={analyzing} style={{ marginTop: 8, width: '100%', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', borderRadius: 6, padding: '6px 10px', cursor: analyzing ? 'wait' : 'pointer', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1 }}>
            {analyzing ? 'READING THE BREAKDOWN…' : '✦ UPDATE FROM THE BREAKDOWN'}
          </button>
          <div style={{ marginTop: 6, fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--fg-dim)', lineHeight: 1.5 }}>
            {breakdownNote ?? 'Writes one “Breakdown · …” line per category from element costs. '}
            {' '}<Link href="/studio?tab=production&view=breakdown" style={{ color: '#a5b4fc', textDecoration: 'underline', textUnderlineOffset: 2 }}>Open the breakdown →</Link>
          </div>
        </Panel>

        <Panel title="Timeline" accent={accent}>
          {timeline.length === 0 && <Empty>No milestones</Empty>}
          {timeline.map(tl => (
            <Row key={tl.id}>
              <span style={{ flex: 1, fontSize: 11 }}>{tl.title}</span>
              {tl.start_date && <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--fg-dim)' }}>{new Date(tl.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
              <DelBtn onClick={() => delTimeline(tl.id)} />
            </Row>
          ))}
          <AddForm placeholder="Milestone" fields={['text', 'date', 'date']} dateLabels={['Start', 'End']} onSubmit={(v) => v[0] && addTimeline(v[0], v[1], v[2])} accent={accent} />
        </Panel>

        <Panel title="Crew" accent={accent}>
          {crew.length === 0 && <Empty>No crew yet</Empty>}
          {crew.map(c => (
            <Row key={c.id}>
              <span style={{ flex: 1, fontSize: 11 }}>{c.profiles?.username || 'Unknown'}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--fg-dim)' }}>{c.craft || (c.role === 'lead' ? 'Lead' : 'Crew')}</span>
              {isOwner && <DelBtn onClick={() => delCrew(c.id)} />}
            </Row>
          ))}
          {isOwner && <AddCrewForm accent={accent} onAdd={addCrew} />}
        </Panel>

        <Panel title="Portfolio" accent={accent}>
          {portfolio.length === 0 ? (
            <>
              <Empty>No pitch board yet</Empty>
              <Link href={`/projects/${projectId}/pitch`} style={{ marginTop: 4, width: '100%', boxSizing: 'border-box', display: 'block', textAlign: 'center', textDecoration: 'none', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', color: '#c4b5fd', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1 }}>
                ✦ BUILD PITCH BOARD
              </Link>
            </>
          ) : (
            portfolio.map(p => (
              <Row key={p.id}>
                <span style={{ flex: 1, fontSize: 11 }}>{p.title}</span>
                <Link href={`/projects/${projectId}/pitch`} style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: accent, textDecoration: 'none' }}>EDIT BOARD</Link>
                <Link href={`/p/${p.share_token}`} aria-label="view" style={{ color: 'var(--fg-dim)', display: 'flex' }}><ExternalLink size={12} /></Link>
              </Row>
            ))
          )}
        </Panel>

        <Panel title="Festival Submissions" accent={accent}>
          {festivals.length === 0 && <Empty>No submissions tracked yet</Empty>}
          {festivals.map(f => (
            <Row key={f.id}>
              <span style={{ flex: 1, fontSize: 11 }}>{f.name}</span>
              {f.deadline && <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--fg-dim)' }}>{new Date(f.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
              <select
                value={f.status}
                disabled={!isOwner}
                onChange={e => setFestivalStatus(f.id, e.target.value as FestivalRow['status'])}
                aria-label={`${f.name} submission status`}
                style={{ background: `${FESTIVAL_STATUS_COLOR[f.status]}18`, border: `1px solid ${FESTIVAL_STATUS_COLOR[f.status]}40`, color: FESTIVAL_STATUS_COLOR[f.status], borderRadius: 4, padding: '2px 4px', fontFamily: 'var(--mono)', fontSize: 8.5, textTransform: 'uppercase' }}
              >
                {FESTIVAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {isOwner && <DelBtn onClick={() => delFestival(f.id)} />}
            </Row>
          ))}
          {isOwner && <AddForm placeholder="Festival name" fields={['text', 'date']} dateLabels={['Deadline']} onSubmit={(v) => v[0] && addFestival(v[0], v[1])} accent={accent} />}
        </Panel>

        {isOwner && <Panel title="Settings" accent={accent}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)', letterSpacing: 1, marginBottom: 4 }}>Default script format</div>
          <select
            value={settings.defaultScriptFormat || ''}
            onChange={e => setDefaultFormat(e.target.value as ScriptFormat | '')}
            aria-label="Default script format"
            style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '6px 8px', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 10, marginBottom: 12 }}
          >
            <option value="">Use the format’s default</option>
            {SCRIPT_FORMATS.map(f => <option key={f} value={f}>{SCRIPT_FORMAT_LABELS[f]}</option>)}
          </select>

          <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)', letterSpacing: 1, marginBottom: 6 }}>Ecosystem modules</div>
          {([
            ['scriptos', 'ScriptOS'], ['studio', 'Studio'], ['lounge', 'Lounge'],
            ['portfolio', 'Portfolio'], ['distribution', 'Distribution'],
          ] as [keyof ProjectSettings['modules'], string][]).map(([key, label]) => (
            <Row key={key}>
              <span style={{ flex: 1, fontSize: 11 }}>{label}</span>
              <button
                onClick={() => toggleModule(key)}
                aria-label={`toggle ${label}`}
                style={{
                  width: 32, height: 18, borderRadius: 9999, position: 'relative', cursor: 'pointer', flexShrink: 0,
                  background: settings.modules[key] ? `${accent}40` : 'rgba(255,255,255,0.08)',
                  border: `1px solid ${settings.modules[key] ? accent : 'rgba(255,255,255,0.15)'}`,
                }}
              >
                <div style={{
                  width: 12, height: 12, borderRadius: '50%', background: settings.modules[key] ? accent : 'var(--fg-dim)',
                  position: 'absolute', top: 2, left: settings.modules[key] ? 17 : 2, transition: 'left 0.18s',
                }} />
              </button>
            </Row>
          ))}
        </Panel>}
      </div>
    </div>
  );
}

function Panel({ title, accent, headerRight, children }: { title: string; accent: string; headerRight?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(10,10,10,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: accent }}>{title}</span>
        {headerRight && <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: 'var(--fg)' }}>{headerRight}</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>{children}</div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{children}</div>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-dim)', padding: '2px 0' }}>{children}</div>;
}
function DelBtn({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-label="Delete" style={{ background: 'none', border: 'none', color: 'var(--fg-dim)', cursor: 'pointer', fontSize: 13, lineHeight: 1, flexShrink: 0, minWidth: 24, minHeight: 24 }} onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}>×</button>;
}

function BudgetRowItem({
  item, posted, posting, onSetActual, onPostJob, onDelete,
}: {
  item: BudgetRow;
  posted: boolean;
  posting: boolean;
  onSetActual: (actual: number | null) => void;
  onPostJob: () => void;
  onDelete: () => void;
}) {
  const over = item.actual_cost != null && Number(item.actual_cost) > Number(item.amount);
  const zoneHandlers = usePillZone({
    module: 'home',
    title: item.category,
    accent: over ? '#ff6b6b' : '#8b5cf6',
    fields: [
      { label: 'Planned', value: `$${Number(item.amount).toLocaleString()}` },
      ...(item.actual_cost != null ? [{ label: 'Actual', value: `$${Number(item.actual_cost).toLocaleString()}`, color: over ? '#ff6b6b' : undefined }] : []),
    ],
    actions: posted ? [] : [{ id: 'post-job', label: '→ Post as Job', onClick: onPostJob }],
  }, 2);

  return (
    <div onMouseEnter={zoneHandlers.onMouseEnter} onMouseLeave={zoneHandlers.onMouseLeave} onClick={zoneHandlers.onClick}>
      <Row>
        <span style={{ flex: 1, fontSize: 11 }}>{item.category}</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--fg-dim)' }} title="planned">${Number(item.amount).toLocaleString()}</span>
        <input
          type="number"
          defaultValue={item.actual_cost ?? ''}
          placeholder="actual"
          onBlur={(e) => { const v = e.target.value.trim(); onSetActual(v === '' ? null : Number(v)); }}
          style={{ width: 64, background: 'rgba(255,255,255,0.04)', border: `1px solid ${over ? 'rgba(255,80,80,0.5)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 4, padding: '3px 5px', color: over ? '#ff6b6b' : 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 10, textAlign: 'right', outline: 'none' }}
        />
        <button
          onClick={onPostJob}
          disabled={posted || posting}
          title={posted ? 'Already posted to Jobs' : 'Post this line as an open Jobs listing'}
          aria-label="Post as job"
          style={{
            background: posted ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${posted ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 4, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: posted ? 'default' : 'pointer', flexShrink: 0,
            color: posted ? '#10b981' : 'var(--fg-dim)',
            opacity: posting ? 0.5 : 1,
          }}
        >
          <Briefcase size={11} />
        </button>
        <DelBtn onClick={onDelete} />
      </Row>
    </div>
  );
}

function AddForm({ placeholder, second, fields, dateLabels, onSubmit, accent }: { placeholder: string; second?: string; fields: string[]; dateLabels?: string[]; onSubmit: (vals: string[]) => void; accent: string }) {
  const [vals, setVals] = useState<string[]>(fields.map(() => ''));
  const set = (i: number, v: string) => setVals(p => p.map((x, idx) => idx === i ? v : x));
  const submit = () => { onSubmit(vals); setVals(fields.map(() => '')); };
  const inputStyle: React.CSSProperties = { flex: 1, minWidth: 0, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '6px 8px', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 10, outline: 'none' };
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
      {fields.map((f, i) => (
        <input
          key={i}
          type={f === 'number' ? 'number' : f === 'date' ? 'date' : 'text'}
          value={vals[i]}
          onChange={e => set(i, e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder={i === 0 ? placeholder : i === 1 ? (second || dateLabels?.[0] || '') : (dateLabels?.[1] || '')}
          style={{ ...inputStyle, flex: f === 'date' ? '0 0 110px' : f === 'number' ? '0 0 90px' : 1 }}
        />
      ))}
      <button onClick={submit} aria-label="add" style={{ flexShrink: 0, background: `${accent}1a`, border: `1px solid ${accent}40`, color: accent, borderRadius: 6, padding: '0 12px', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>+</button>
    </div>
  );
}

/** Add someone by username, with their craft on this project. */
function AddCrewForm({ accent, onAdd }: { accent: string; onAdd: (username: string, craft: string | null) => Promise<void> }) {
  const [username, setUsername] = useState('');
  const [craft, setCraft] = useState<string | null>(null);
  const submit = async () => {
    if (!username.trim()) return;
    await onAdd(username, craft);
    setUsername('');
    setCraft(null);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
      <label className="sr-only" htmlFor="add-crew-username">Username</label>
      <input id="add-crew-username" value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void submit(); }} placeholder="Username" style={{ ...MINI_INPUT, padding: '6px 8px', fontSize: 10 }} />
      <CraftPicker label="Their craft" value={craft} onChange={setCraft} placeholder="Their craft (optional)" noneLabel="No craft" />
      <button type="button" onClick={() => void submit()} disabled={!username.trim()} style={{ background: `${accent}1a`, border: `1px solid ${accent}40`, color: accent, borderRadius: 6, padding: '5px 10px', cursor: username.trim() ? 'pointer' : 'default', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1 }}>ADD TO CREW</button>
    </div>
  );
}
