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
import { parseScript } from '@/lib/scriptos/parser';
import { createJob, getBudgetItemIdsWithJobs } from '@/lib/supabase/jobs';

// Rough indie default rates used to seed budget suggestions from the script
// breakdown. They are starting points the user edits after inserting.
const BUDGET_RATES = { cast: 500, props: 75, wardrobe: 120, vehicles: 400, sfx: 300, vfx: 500, perPage: 200 };

// Map the DB project.status to the production phase used by the header rail.
function mapStatusToPhase(status?: string): Phase {
  switch (status) {
    case 'concept': return 'development';
    case 'pre-prod':
    case 'pre-production': return 'pre-production';
    case 'production': return 'production';
    case 'post':
    case 'post-production': return 'post-production';
    case 'released':
    case 'completed':
    case 'delivery': return 'delivery';
    default: return 'development';
  }
}

// ─── Types ──────────────────────────────────────────────────────────────────

type Phase = 'development' | 'pre-production' | 'production' | 'post-production' | 'delivery';

interface Project {
  id: string;
  title: string;
  type: string;
  phase: Phase;
  progress: number;
  deadline: string;
  team: { name: string; role: string; online?: boolean }[];
  description: string;
  color: string;
  scriptPages?: number;
  scriptDraft?: number;
  assetCount?: number;
  assetGB?: number;
  publishedWork?: number;
}

// ─── Production phases ───────────────────────────────────────────────────────

const PHASES: { id: Phase; label: string; short: string }[] = [
  { id: 'development',     label: 'Development',     short: 'DEV'  },
  { id: 'pre-production',  label: 'Pre-Production',  short: 'PRE'  },
  { id: 'production',      label: 'Production',      short: 'PROD' },
  { id: 'post-production', label: 'Post-Production', short: 'POST' },
  { id: 'delivery',        label: 'Delivery',        short: 'DEL'  },
];

const phaseIndex = (p: Phase) => PHASES.findIndex(ph => ph.id === p);

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

function DeptWindow({ title, tag, color, href, stats, preview, delay = 0, span = 'single' }: DeptWindowProps) {
  const [hovered, setHovered] = useState(false);

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
      {/* Corner accent glow */}
      <div style={{
        position: 'absolute', top: -40, right: -40, width: 140, height: 140,
        borderRadius: '50%', pointerEvents: 'none',
        background: `radial-gradient(circle, ${color}12 0%, transparent 65%)`,
        opacity: hovered ? 1 : 0.5, transition: 'opacity 0.4s',
      }} />

      {/* Window chrome */}
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

      {/* Preview content */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {preview}
        {/* Bottom fade */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, background: 'linear-gradient(transparent, rgba(10,10,10,0.9))', pointerEvents: 'none' }} />
      </div>

      {/* Footer */}
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

// Abstract, data-driven peek — reflects the project's real script counts
// without fabricating any screenplay content.
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

// Abstract tile grid whose fill reflects the real concept/scene counts — no
// invented filenames.
function AssetPreview({ concepts, scenes }: { concepts: number; scenes: number }) {
  const total = concepts + scenes;
  const filled = Math.min(6, concepts);
  const palette = ['#6366f1', '#ff3c00', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
  return (
    <div style={{ padding: '10px 12px' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>{concepts} concept{concepts === 1 ? '' : 's'} · {scenes} scene{scenes === 1 ? '' : 's'}</div>
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

function CrewPreview({ team }: { team: Project['team'] }) {
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

function TimelinePreview({ deadline, progress, phase }: { deadline: string; progress: number; phase: Phase }) {
  const dl = deadline ? new Date(deadline).getTime() : NaN;
  const daysLeft = isNaN(dl) ? 0 : Math.max(0, Math.ceil((dl - Date.now()) / 86400000));
  const milestones = [
    { label: 'Script Lock',     done: true  },
    { label: 'Cast Confirmed',  done: phaseIndex(phase) >= 1 },
    { label: 'Principal Shoot', done: phaseIndex(phase) >= 2 },
    { label: 'Picture Lock',    done: phaseIndex(phase) >= 3 },
    { label: 'Delivery',        done: phaseIndex(phase) >= 4 },
  ];

  return (
    <div style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 700, color: daysLeft < 30 ? '#ff3c00' : 'var(--fg)', lineHeight: 1 }}>{daysLeft}</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)', letterSpacing: 2, textTransform: 'uppercase' }}>days to deadline</span>
      </div>

      {/* Progress rail */}
      <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginBottom: 14, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ height: '100%', background: 'var(--accent)', borderRadius: 2 }}
        />
      </div>

      {/* Milestones */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {milestones.map((m, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: m.done ? '#10b981' : 'rgba(255,255,255,0.1)',
            }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: m.done ? 'var(--fg-muted)' : 'var(--fg-dim)', textDecoration: m.done ? 'line-through' : 'none', opacity: m.done ? 0.5 : 1 }}>{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Portfolio preview ───────────────────────────────────────────────────────

function PortfolioPreview({ published }: { published: number }) {
  return (
    <div style={{ padding: '10px 12px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 6, height: 100 }}>
        <div style={{
          borderRadius: 8, overflow: 'hidden', position: 'relative',
          background: 'linear-gradient(135deg, #1a0f00, #0d0d14)',
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 60%, rgba(245,158,11,0.18) 0%, transparent 60%)' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '16%', background: 'rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '16%', background: 'rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'absolute', bottom: 6, right: 8, fontFamily: 'var(--mono)', fontSize: 6.5, color: 'rgba(240,236,228,0.3)', letterSpacing: 2 }}>2.35:1</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[0, 1].map(i => (
            <div key={i} style={{ flex: 1, borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {published > i ? (
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
              ) : (
                <div style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--fg-dim)' }}>DRAFT</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function ProjectHubPage() {
  const confirm = useConfirm();
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);

  const [realProject, setRealProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  // Always load the actual project from Supabase and show the live production
  // manager. Unknown ids redirect back to the projects list.
  useEffect(() => {
    let active = true;
    supabase.from('projects').select('*').eq('id', id).single().then(({ data, error }) => {
      if (!active) return;
      if (error || !data) { router.push('/projects'); return; }
      const phase = mapStatusToPhase(data.status);
      setRealProject({
        id: data.id,
        title: data.title,
        type: data.project_type || 'Project',
        phase,
        progress: Math.round((phaseIndex(phase) / (PHASES.length - 1)) * 100),
        deadline: data.end_date || '',
        description: data.description || '',
        color: data.accent_color || '#ff3c00',
        team: [],
      });
      setLoading(false);
    });
    return () => { active = false; };
  }, [id, router]);

  // Live cross-suite counts for real projects, so the hub tiles reflect the
  // actual scripts / crew / tasks / budget / timeline managed elsewhere.
  const [counts, setCounts] = useState({ scripts: 0, pages: 0, crew: 0, tasks: 0, tasksDone: 0, budget: 0, timeline: 0, scenes: 0, concepts: 0 });
  useEffect(() => {
    let active = true;
    (async () => {
      const [sc, cr, tk, bd, tl, scn, cn] = await Promise.all([
        supabase.from('scripts').select('page_count').eq('project_id', id),
        supabase.from('project_crew').select('id', { count: 'exact', head: true }).eq('project_id', id),
        supabase.from('project_tasks').select('completed').eq('project_id', id),
        supabase.from('budget_items').select('amount').eq('project_id', id),
        supabase.from('timeline_items').select('id', { count: 'exact', head: true }).eq('project_id', id),
        supabase.from('scenes').select('id', { count: 'exact', head: true }).eq('project_id', id),
        supabase.from('concept_assets').select('id', { count: 'exact', head: true }).eq('project_id', id),
      ]);
      if (!active) return;
      const tasks = (tk.data as { completed: boolean }[]) || [];
      setCounts({
        scripts: sc.data?.length || 0,
        pages: (sc.data as { page_count: number }[] | null)?.reduce((s, x) => s + (x.page_count || 0), 0) || 0,
        crew: cr.count || 0,
        tasks: tasks.length,
        tasksDone: tasks.filter(t => t.completed).length,
        budget: (bd.data as { amount: number }[] | null)?.reduce((s, x) => s + Number(x.amount || 0), 0) || 0,
        timeline: tl.count || 0,
        scenes: scn.count || 0,
        concepts: cn.count || 0,
      });
    })();
    return () => { active = false; };
  }, [id]);

  const project = realProject;

  if (loading || !project) {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 3, opacity: 0.4 }}>LOADING</div>
      </main>
    );
  }

  const isRealProject = true;
  const currentPhaseIdx = phaseIndex(project.phase);
  const onlineCount = project.team.filter(m => m.online).length;

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', overflow: 'hidden' }}>
      <GrainOverlay />

      {/* Ambient project glow */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: '50vh', pointerEvents: 'none', zIndex: 0,
        background: `radial-gradient(ellipse at 50% -20%, ${project.color}0a 0%, transparent 65%)`,
      }} />

      {/* ── Header ── */}
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
          <Link href="/projects" style={{ color: 'var(--fg-dim)', display: 'flex', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--fg)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--fg-dim)'}
          >
            <ArrowLeft size={16} />
          </Link>
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.07)' }} />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontFamily: 'var(--display)', fontSize: '1.2rem', letterSpacing: 4 }}>{project.title}</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 3, textTransform: 'uppercase', color: project.color, opacity: 0.8 }}>{project.type}</span>
          </div>
        </div>

        {/* Phase rail */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {PHASES.map((phase, i) => {
            const isDone   = i < currentPhaseIdx;
            const isActive = i === currentPhaseIdx;
            const isFuture = i > currentPhaseIdx;
            return (
              <React.Fragment key={phase.id}>
                <div style={{
                  padding: '5px 12px', borderRadius: 9999,
                  fontFamily: 'var(--mono)', fontSize: 7.5, letterSpacing: 2.5, textTransform: 'uppercase',
                  background: isActive ? `${project.color}18` : 'transparent',
                  color: isActive ? project.color : isDone ? 'rgba(240,236,228,0.4)' : 'rgba(240,236,228,0.2)',
                  border: isActive ? `1px solid ${project.color}35` : '1px solid transparent',
                  transition: 'all 0.3s', whiteSpace: 'nowrap',
                }}>
                  {isDone && <span style={{ marginRight: 4 }}>✓</span>}
                  {phase.short}
                </div>
                {i < PHASES.length - 1 && (
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
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)', letterSpacing: 1.5,
            padding: '5px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.04)',
          }}>
            {project.progress}% complete
          </div>
        </div>
      </motion.header>

      {/* ── Department Grid ── */}
      <div style={{ padding: '28px 28px 120px', position: 'relative', zIndex: 1 }}>

        {/* Title block */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{ marginBottom: 24 }}
        >
          <div style={{ fontFamily: 'var(--mono)', fontSize: 7.5, color: 'var(--fg-dim)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>Production Hub</div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 'clamp(2.5rem, 6vw, 4rem)', letterSpacing: 2, lineHeight: 0.9 }}>{project.title}</div>
          <p style={{ fontFamily: 'var(--serif)', fontSize: '0.95rem', color: 'var(--fg-dim)', marginTop: 10, maxWidth: 560 }}>{project.description}</p>
        </motion.div>

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

          {/* ─ ScriptOS ─ */}
          <DeptWindow
            title="ScriptOS"
            tag="Screenplay"
            color="#ff3c00"
            href="/editor"
            delay={0.05}
            stats={[
              { label: 'Pages', value: counts.pages },
              { label: 'Scripts', value: counts.scripts },
            ]}
            preview={<ScriptPreview pages={counts.pages} scripts={counts.scripts} scenes={counts.scenes} />}
          />

          {/* ─ Studio ─ */}
          <DeptWindow
            title="Studio"
            tag="Assets"
            color="#6366f1"
            href="/studio"
            delay={0.1}
            stats={[
              { label: 'Concepts', value: counts.concepts },
              { label: 'Scenes',   value: counts.scenes },
            ]}
            preview={<AssetPreview concepts={counts.concepts} scenes={counts.scenes} />}
          />

          {/* ─ Lounge / Crew ─ */}
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
            preview={<CrewPreview team={project.team} />}
          />

          {/* ─ Timeline ─ */}
          <DeptWindow
            title="Timeline"
            tag="Schedule"
            color="#f59e0b"
            href="/projects"
            delay={0.2}
            stats={[
              { label: 'Milestones', value: counts.timeline },
              { label: 'Budget', value: counts.budget > 0 ? `$${(counts.budget / 1000).toFixed(1)}k` : '$0' },
            ]}
            preview={<TimelinePreview deadline={project.deadline} progress={project.progress} phase={project.phase} />}
          />

          {/* ─ Portfolio ─ */}
          <DeptWindow
            title="Portfolio"
            tag="Showcase"
            color="#8b5cf6"
            href="/portfolio"
            delay={0.25}
            stats={[
              { label: 'Phase', value: PHASES[currentPhaseIdx].short },
              { label: 'Type',  value: project.type },
            ]}
            preview={<PortfolioPreview published={project.progress === 100 ? 2 : currentPhaseIdx >= 3 ? 1 : 0} />}
          />

          {/* ─ Jobs / Distribution ─ */}
          <DeptWindow
            title="Distribution"
            tag="Launch"
            color="#ec4899"
            href="/jobs"
            delay={0.3}
            stats={[
              { label: 'Phase',  value: PHASES[currentPhaseIdx].short },
              { label: 'Status', value: project.progress === 100 ? 'Done' : 'Active' },
            ]}
            preview={
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Picture Lock', ready: currentPhaseIdx >= 3 },
                  { label: 'Trailer Cut',  ready: currentPhaseIdx >= 3 },
                  { label: 'Press Kit',    ready: currentPhaseIdx >= 4 },
                  { label: 'Delivered',    ready: project.progress === 100 },
                ].map(({ label, ready }) => ({ label, value: ready ? 'Ready' : 'Not yet', color: ready ? '#10b981' : '#4b5563' })).map(({ label, value, color }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-dim)' }}>{label}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color, background: `${color}12`, padding: '2px 8px', borderRadius: 4 }}>{value}</span>
                  </div>
                ))}
              </div>
            }
          />

        </div>

        {isRealProject && <ProductionManager projectId={id} accent={project.color} />}
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </main>
  );
}

// ─── Production Manager (live Supabase CRUD: tasks, budget, timeline, crew) ────

interface TaskRow { id: string; title: string; completed: boolean }
interface BudgetRow { id: string; category: string; amount: number; actual_cost?: number | null }
interface TimelineRow { id: string; title: string; start_date: string | null; end_date: string | null }
interface CrewRow { id: string; role: string; profiles?: { username: string } | null }

function ProductionManager({ projectId, accent }: { projectId: string; accent: string }) {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [budget, setBudget] = useState<BudgetRow[]>([]);
  const [timeline, setTimeline] = useState<TimelineRow[]>([]);
  const [crew, setCrew] = useState<CrewRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<{ category: string; amount: number }[] | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  // Budget line items that already have a job posted from them, so the
  // "Post as Job" action can't be fired twice for the same line by accident.
  const [postedBudgetIds, setPostedBudgetIds] = useState<Set<string>>(new Set());
  const [postingBudgetId, setPostingBudgetId] = useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const [t, b, tl, c] = await Promise.all([
        supabase.from('project_tasks').select('id,title,completed').eq('project_id', projectId).order('created_at'),
        supabase.from('budget_items').select('id,category,amount,actual_cost').eq('project_id', projectId).order('created_at'),
        supabase.from('timeline_items').select('id,title,start_date,end_date').eq('project_id', projectId).order('start_date', { nullsFirst: true }),
        supabase.from('project_crew').select('id,role,profiles!project_crew_user_id_fkey(username)').eq('project_id', projectId),
      ]);
      setTasks((t.data as TaskRow[]) || []);
      setBudget((b.data as BudgetRow[]) || []);
      setTimeline((tl.data as TimelineRow[]) || []);
      setCrew((c.data as unknown as CrewRow[]) || []);
      setPostedBudgetIds(await getBudgetItemIdsWithJobs(projectId));
    } catch (e: any) {
      setErr(e.message);
    }
  }, [projectId]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    load();
  }, [load]);

  // ── mutations ──
  const addTask = async (title: string) => {
    const { data, error } = await supabase.from('project_tasks')
      .insert({ project_id: projectId, title }).select('id,title,completed').single();
    if (error) return setErr(error.message);
    setTasks(p => [...p, data as TaskRow]);
  };
  const toggleTask = async (t: TaskRow) => {
    setTasks(p => p.map(x => x.id === t.id ? { ...x, completed: !x.completed } : x));
    await supabase.from('project_tasks').update({ completed: !t.completed }).eq('id', t.id);
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
  // Turn a budget line ("Director fee", $2,000) straight into an open Jobs
  // posting — the category becomes both the title and the role, the amount
  // becomes the rate. This is the first link in the Jobs <-> Crew <-> Budget
  // chain: post from budget, accept an applicant, they become real crew.
  const postJobFromBudget = async (b: BudgetRow) => {
    if (!userId || postedBudgetIds.has(b.id)) return;
    setPostingBudgetId(b.id);
    try {
      await createJob(projectId, userId, b.category, b.category, '', Number(b.amount) || undefined, b.id);
      setPostedBudgetIds(prev => new Set(prev).add(b.id));
      toast(`Posted "${b.category}" to the Jobs board`, 'success');
    } catch (e: any) {
      toast(e.message || 'Could not post this as a job', 'error');
    } finally {
      setPostingBudgetId(null);
    }
  };
  const setActual = async (id: string, actual: number | null) => {
    setBudget(p => p.map(x => x.id === id ? { ...x, actual_cost: actual } : x));
    await supabase.from('budget_items').update({ actual_cost: actual }).eq('id', id);
  };

  // Build budget suggestions from the project's screenplay breakdown.
  const analyzeBudget = async () => {
    setAnalyzing(true); setErr(null);
    try {
      const { data } = await supabase.from('scripts').select('content').eq('project_id', projectId).order('updated_at', { ascending: false });
      const withContent = (data || []).find((s: any) => s.content && s.content.trim().length > 0);
      if (!withContent) { setErr('No script content yet — write one in ScriptOS first.'); setSuggestions([]); return; }
      const parsed = parseScript(withContent.content);
      const uniq = (key: 'props' | 'wardrobe' | 'vehicles' | 'sfx' | 'vfx') => {
        const set = new Set<string>();
        parsed.scenes.forEach(sc => (sc.elements?.[key] || []).forEach(v => set.add(v)));
        return set.size;
      };
      const castN = parsed.characters?.length || 0;
      const pages = Math.max(1, Math.round(parsed.scenes.reduce((s, sc) => s + (sc.eighths || 0), 0) / 8));
      const props = uniq('props'), wardrobe = uniq('wardrobe'), vehicles = uniq('vehicles'), sfx = uniq('sfx'), vfx = uniq('vfx');
      const existing = new Set(budget.map(b => b.category.toLowerCase()));
      const sugg = [
        castN && { category: `Cast (${castN} roles)`, amount: castN * BUDGET_RATES.cast },
        props && { category: `Props (${props} items)`, amount: props * BUDGET_RATES.props },
        wardrobe && { category: `Wardrobe (${wardrobe} items)`, amount: wardrobe * BUDGET_RATES.wardrobe },
        vehicles && { category: `Vehicles (${vehicles})`, amount: vehicles * BUDGET_RATES.vehicles },
        sfx && { category: `Special FX (${sfx})`, amount: sfx * BUDGET_RATES.sfx },
        vfx && { category: `Visual FX (${vfx})`, amount: vfx * BUDGET_RATES.vfx },
        { category: `Camera & Crew (${pages} pg)`, amount: pages * BUDGET_RATES.perPage },
      ].filter(Boolean) as { category: string; amount: number }[];
      setSuggestions(sugg.filter(s => !existing.has(s.category.toLowerCase())));
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const acceptSuggestion = async (s: { category: string; amount: number }) => {
    await addBudget(s.category, s.amount);
    setSuggestions(prev => prev ? prev.filter(x => x.category !== s.category) : prev);
  };
  const acceptAllSuggestions = async () => {
    const list = suggestions || [];
    for (const s of list) await addBudget(s.category, s.amount);
    setSuggestions([]);
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

  const addCrew = async (username: string, role: string) => {
    const { data: prof, error: pErr } = await supabase.from('profiles').select('id,username').eq('username', username).single();
    if (pErr || !prof) return setErr(`No user "${username}"`);
    const { error } = await supabase.from('project_crew')
      .insert({ project_id: projectId, user_id: prof.id, role: role || 'team member' });
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

  const totalBudget = budget.reduce((s, b) => s + Number(b.amount || 0), 0);
  const totalActual = budget.reduce((s, b) => s + Number(b.actual_cost || 0), 0);
  const hasActuals = budget.some(b => b.actual_cost != null);

  return (
    <div style={{ marginTop: 40 }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 7.5, color: 'var(--fg-dim)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 14 }}>Production Management</div>
      {err && <div style={{ color: '#ff5555', fontFamily: 'var(--mono)', fontSize: 10, marginBottom: 12 }}>⚠ {err}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>

        {/* Tasks */}
        <Panel title="Tasks" accent={accent}>
          {tasks.length === 0 && <Empty>No tasks yet</Empty>}
          {tasks.map(t => (
            <Row key={t.id}>
              <button onClick={() => toggleTask(t)} aria-label="toggle" style={{ background: 'none', border: `1px solid ${t.completed ? '#10b981' : 'rgba(255,255,255,0.25)'}`, borderRadius: 4, width: 15, height: 15, cursor: 'pointer', color: '#10b981', fontSize: 10, lineHeight: 1, flexShrink: 0 }}>{t.completed ? '✓' : ''}</button>
              <span style={{ flex: 1, fontSize: 11, color: t.completed ? 'var(--fg-dim)' : 'var(--fg)', textDecoration: t.completed ? 'line-through' : 'none' }}>{t.title}</span>
              <DelBtn onClick={() => delTask(t.id)} />
            </Row>
          ))}
          <AddForm placeholder="Add a task…" fields={['text']} onSubmit={(v) => v[0] && addTask(v[0])} accent={accent} />
        </Panel>

        {/* Budget */}
        <Panel title="Budget" accent={accent} headerRight={totalBudget > 0 ? `$${totalBudget.toLocaleString()}` : undefined}>
          {budget.length === 0 && <Empty>No budget items</Empty>}
          {budget.map(b => {
            const over = b.actual_cost != null && Number(b.actual_cost) > Number(b.amount);
            return (
            <Row key={b.id}>
              <span style={{ flex: 1, fontSize: 11 }}>{b.category}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--fg-dim)' }} title="planned">${Number(b.amount).toLocaleString()}</span>
              <input
                type="number"
                defaultValue={b.actual_cost ?? ''}
                placeholder="actual"
                onBlur={(e) => { const v = e.target.value.trim(); setActual(b.id, v === '' ? null : Number(v)); }}
                style={{ width: 64, background: 'rgba(255,255,255,0.04)', border: `1px solid ${over ? 'rgba(255,80,80,0.5)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 4, padding: '3px 5px', color: over ? '#ff6b6b' : 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 10, textAlign: 'right', outline: 'none' }}
              />
              <button
                onClick={() => postJobFromBudget(b)}
                disabled={postedBudgetIds.has(b.id) || postingBudgetId === b.id}
                title={postedBudgetIds.has(b.id) ? 'Already posted to Jobs' : 'Post this line as an open Jobs listing'}
                aria-label="Post as job"
                style={{
                  background: postedBudgetIds.has(b.id) ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${postedBudgetIds.has(b.id) ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 4, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: postedBudgetIds.has(b.id) ? 'default' : 'pointer', flexShrink: 0,
                  color: postedBudgetIds.has(b.id) ? '#10b981' : 'var(--fg-dim)',
                  opacity: postingBudgetId === b.id ? 0.5 : 1,
                }}
              >
                <Briefcase size={11} />
              </button>
              <DelBtn onClick={() => delBudget(b.id)} />
            </Row>
            );
          })}
          {hasActuals && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.06)', fontFamily: 'var(--mono)', fontSize: 10 }}>
              <span style={{ color: 'var(--fg-dim)' }}>Actual ${totalActual.toLocaleString()} / Planned ${totalBudget.toLocaleString()}</span>
              <span style={{ color: totalActual > totalBudget ? '#ff6b6b' : '#10b981' }}>{totalActual > totalBudget ? '+' : ''}{(totalActual - totalBudget).toLocaleString()}</span>
            </div>
          )}
          <AddForm placeholder="Category" second="Amount" fields={['text', 'number']} onSubmit={(v) => v[0] && addBudget(v[0], Number(v[1] || 0))} accent={accent} />

          {/* Budget-from-breakdown: suggest line items from the script */}
          <button onClick={analyzeBudget} disabled={analyzing} style={{ marginTop: 8, width: '100%', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', borderRadius: 6, padding: '6px 10px', cursor: analyzing ? 'wait' : 'pointer', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1 }}>
            {analyzing ? 'ANALYZING SCRIPT…' : '✦ SUGGEST FROM SCRIPT BREAKDOWN'}
          </button>
          {suggestions && suggestions.length > 0 && (
            <div style={{ marginTop: 8, padding: 8, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: '#a5b4fc', letterSpacing: 1 }}>SUGGESTED — from tagged elements</span>
                <button onClick={acceptAllSuggestions} style={{ fontFamily: 'var(--mono)', fontSize: 8, color: '#a5b4fc', background: 'none', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 4, padding: '2px 6px', cursor: 'pointer' }}>+ Add all</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {suggestions.map(s => (
                  <Row key={s.category}>
                    <span style={{ flex: 1, fontSize: 10.5 }}>{s.category}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg-muted)' }}>${s.amount.toLocaleString()}</span>
                    <button onClick={() => acceptSuggestion(s)} aria-label="add" style={{ background: `${accent}1a`, border: `1px solid ${accent}40`, color: accent, borderRadius: 4, padding: '0 7px', cursor: 'pointer', fontSize: 12 }}>+</button>
                  </Row>
                ))}
              </div>
            </div>
          )}
          {suggestions && suggestions.length === 0 && !analyzing && (
            <div style={{ marginTop: 6, fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--fg-dim)' }}>No new suggestions — all categories already added.</div>
          )}
        </Panel>

        {/* Timeline */}
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

        {/* Crew */}
        <Panel title="Crew" accent={accent}>
          {crew.length === 0 && <Empty>No crew yet</Empty>}
          {crew.map(c => (
            <Row key={c.id}>
              <span style={{ flex: 1, fontSize: 11 }}>{c.profiles?.username || 'Unknown'}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--fg-dim)' }}>{c.role}</span>
              <DelBtn onClick={() => delCrew(c.id)} />
            </Row>
          ))}
          <AddForm placeholder="Username" second="Role" fields={['text', 'text']} onSubmit={(v) => v[0] && addCrew(v[0], v[1])} accent={accent} />
        </Panel>
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
  return <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-dim)', opacity: 0.6, padding: '2px 0' }}>{children}</div>;
}
function DelBtn({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} aria-label="delete" style={{ background: 'none', border: 'none', color: 'var(--fg-dim)', cursor: 'pointer', fontSize: 13, lineHeight: 1, opacity: 0.5, flexShrink: 0 }} onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}>×</button>;
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
