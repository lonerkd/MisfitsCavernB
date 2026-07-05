'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, ArrowUpRight, Clock, Film, Tv, Video, Music } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import GrainOverlay from '@/components/GrainOverlay';
import { supabase } from '@/lib/supabase/client';
import { withTimeout } from '@/lib/supabase/withTimeout';
import { getUserProjects, createProject as createDBProject } from '@/lib/supabase/projects';
import { useToast } from '@/components/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useProject, type Phase, mapStatusToPhase } from '@/lib/context/ProjectContext';
import { usePillStage } from '@/lib/context/PillContext';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useEscapeKey } from '@/lib/useEscapeKey';

const PROJECT_TYPES = ['Feature', 'Short Film', 'Limited Series', 'Music Video', 'Documentary', 'Commercial'];

function NewProjectModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (title: string, type: string, logline: string) => Promise<void> }) {
  useEscapeKey(onClose, open);
  const [title, setTitle] = useState('');
  const [type, setType] = useState(PROJECT_TYPES[0]);
  const [logline, setLogline] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => { if (!title.trim()) return; setBusy(true); try { await onCreate(title.trim(), type, logline.trim()); setTitle(''); setLogline(''); } finally { setBusy(false); } };
  const inp: React.CSSProperties = { width: '100%', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '12px 14px', color: '#fff', fontSize: 14, outline: 'none' };
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()}
            style={{ width: 460, maxWidth: '100%', background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 28 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 3, color: 'var(--fg-dim)', textTransform: 'uppercase', marginBottom: 6 }}>New Production</div>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.8rem', letterSpacing: 2, marginBottom: 20 }}>Start a project</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 2, color: '#888', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Title</label>
                <input autoFocus value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="e.g. Femme Fatale" style={inp} />
              </div>
              <div>
                <label style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 2, color: '#888', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Format</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {PROJECT_TYPES.map(t => (
                    <button key={t} onClick={() => setType(t)} style={{ fontFamily: 'var(--mono)', fontSize: 9.5, padding: '6px 11px', borderRadius: 99, cursor: 'pointer', background: type === t ? 'rgba(215, 52, 11,0.16)' : 'rgba(255,255,255,0.04)', border: `1px solid ${type === t ? 'rgba(215, 52, 11,0.5)' : 'rgba(255,255,255,0.1)'}`, color: type === t ? '#ff7a4d' : 'var(--fg-muted)' }}>{t}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 2, color: '#888', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Logline <span style={{ opacity: 0.5 }}>(optional)</span></label>
                <textarea value={logline} onChange={e => setLogline(e.target.value)} placeholder="One sentence that sells the story." rows={2} style={{ ...inp, resize: 'vertical' }} />
              </div>
              <button onClick={submit} disabled={busy || !title.trim()} style={{ marginTop: 6, padding: 14, background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, cursor: title.trim() ? 'pointer' : 'default', opacity: busy || !title.trim() ? 0.6 : 1 }}>{busy ? 'Creating…' : 'Create & open studio'}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ProjectCardViewModel: this list page's card display shape (formatted color,
// deadline as a string, team as plain initials strings) — distinct from the
// raw hydrated lib/context/ProjectContext.tsx:Project entity. Was named bare
// "Project" before this consolidation, shadowing the real Project type (and
// diverging in shape from app/projects/[id]/page.tsx's own local "Project",
// which used `team: {name,role,online?}[]` instead of `team: string[]`).
interface ProjectCardViewModel {
  id: string;
  title: string;
  type: string;
  phase: Phase;
  progress: number;
  deadline: string;
  team: string[];
  description: string;
  color: string;
}

const PHASES: { id: Phase; label: string; abbr: string }[] = [
  { id: 'development',     label: 'Development',     abbr: 'DEV'  },
  { id: 'pre-production',  label: 'Pre-Production',  abbr: 'PRE'  },
  { id: 'production',      label: 'Production',      abbr: 'PROD' },
  { id: 'post-production', label: 'Post-Production', abbr: 'POST' },
  { id: 'delivery',        label: 'Delivery',        abbr: 'DEL'  },
];

const PHASE_COLORS: Record<Phase, string> = {
  'development':     '#6366f1',
  'pre-production':  '#8b5cf6',
  'production':      '#d7340b',
  'post-production': '#f59e0b',
  'delivery':        '#10b981',
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  'Feature':         Film,
  'Limited Series':  Tv,
  'Short Film':      Film,
  'Music Video':     Music,
  'Documentary':     Video,
};

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function ProjectCard({ project }: { project: ProjectCardViewModel }) {
  const [hovered, setHovered] = useState(false);
  const phase = PHASE_COLORS[project.phase];
  const Icon = TYPE_ICONS[project.type] ?? Film;
  const days = daysUntil(project.deadline);
  const overdue = days < 0;

  return (
    <Link href={`/projects/${project.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <motion.div
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        animate={{ y: hovered ? -3 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{
          background: 'rgba(12,12,12,0.8)',
          border: `1px solid ${hovered ? phase + '44' : 'rgba(255,255,255,0.06)'}`,
          borderRadius: 16,
          padding: 18,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: hovered ? `0 16px 48px rgba(0,0,0,0.7), 0 0 32px ${phase}12` : '0 2px 12px rgba(0,0,0,0.4)',
          transition: 'border-color 0.3s, box-shadow 0.3s',
          cursor: 'pointer',
        }}
      >
        {/* Ambient corner glow */}
        <div style={{
          position: 'absolute', top: 0, right: 0, width: 80, height: 80,
          background: `radial-gradient(circle at top right, ${phase}18 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: `${phase}18`,
              border: `1px solid ${phase}33`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={13} color={phase} strokeWidth={1.5} />
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 2, color: phase, textTransform: 'uppercase' }}>
              {project.type}
            </div>
          </div>
          <motion.div
            animate={{ opacity: hovered ? 1 : 0, x: hovered ? 0 : 4 }}
            transition={{ duration: 0.2 }}
          >
            <ArrowUpRight size={13} color="rgba(255,255,255,0.4)" />
          </motion.div>
        </div>

        {/* Title */}
        <div style={{
          fontFamily: 'var(--display)',
          fontSize: '1.25rem',
          letterSpacing: 2,
          color: 'var(--fg)',
          marginBottom: 8,
          lineHeight: 1.2,
        }}>
          {project.title}
        </div>

        {/* Description */}
        <div style={{
          fontFamily: 'var(--mono)',
          fontSize: 9.5,
          lineHeight: 1.6,
          color: 'rgba(224, 221, 174,0.4)',
          marginBottom: 16,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {project.description}
        </div>

        {/* Progress bar */}
        <div style={{ height: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 1, marginBottom: 12, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: `${project.progress}%` }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ height: '100%', background: `linear-gradient(90deg, ${phase}88, ${phase})`, borderRadius: 1 }}
          />
        </div>

        {/* Footer row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Team avatars */}
          <div style={{ display: 'flex', gap: -4 }}>
            {project.team.slice(0, 3).map((initials, i) => (
              <div key={i} style={{
                width: 20, height: 20, borderRadius: '50%',
                background: `${phase}22`,
                border: `1.5px solid rgba(8,8,8,0.9)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--mono)', fontSize: 7, color: phase,
                marginLeft: i > 0 ? -6 : 0,
                zIndex: project.team.length - i,
                position: 'relative',
              }}>
                {initials.slice(0, 2)}
              </div>
            ))}
          </div>

          {/* Deadline */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontFamily: 'var(--mono)', fontSize: 8.5,
            color: overdue ? '#ef4444' : days < 30 ? '#f59e0b' : 'rgba(224, 221, 174,0.3)',
          }}>
            <Clock size={9} />
            {overdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `${days}d`}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

function PhaseColumn({ phase, projects }: { phase: typeof PHASES[0]; projects: ProjectCardViewModel[] }) {
  const color = PHASE_COLORS[phase.id];

  return (
    <div style={{ minWidth: 260, flex: '0 0 260px' }}>
      {/* Column header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 14, padding: '0 2px',
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: color,
          boxShadow: `0 0 8px ${color}`,
          flexShrink: 0,
        }} />
        <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: 2.5, color, textTransform: 'uppercase' }}>
          {phase.abbr}
        </div>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 1,
          color: 'rgba(224, 221, 174,0.2)',
          paddingLeft: 4,
        }}>
          {phase.label}
        </div>
        <div style={{
          marginLeft: 'auto',
          fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 1,
          color: 'rgba(224, 221, 174,0.25)',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 6,
          padding: '2px 7px',
        }}>
          {projects.length}
        </div>
      </div>

      {/* Drop zone */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 120 }}>
        <AnimatePresence>
          {projects.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ delay: i * 0.07, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <ProjectCard project={p} />
            </motion.div>
          ))}
        </AnimatePresence>

        {projects.length === 0 && (
          <div style={{
            height: 80, borderRadius: 16,
            border: '1px dashed rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 1.5,
            color: 'rgba(224, 221, 174,0.12)',
            textTransform: 'uppercase',
          }}>
            No projects
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  useRequireAuth();
  const [projectsList, setProjectsList] = useState<ProjectCardViewModel[]>([]);
  const [user, setUser] = useState<any>(null);
  const [showNew, setShowNew] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const { toast } = useToast();
  const { setActiveProject } = useProject();
  const router = useRouter();

  // Publish the projects hub's live state to the Pill's context capsule.
  usePillStage(
    {
      module: 'home',
      title: 'Projects',
      accent: '#d7340b',
      fields: [
        { label: 'Total', value: `${projectsList.length}`, color: '#d7340b' },
      ],
      actions: user ? [
        { id: 'new-project', label: '+ New Project', onClick: () => setShowNew(true) },
      ] : [],
    },
    [projectsList.length, user],
  );

  useEffect(() => {
    // A stalled/failed getUser() call must never leave the board stuck on
    // skeleton loaders forever — always resolve `loaded`, even on failure.
    withTimeout(supabase.auth.getUser(), 12000, 'getUser timed out').then(({ data: { user } }) => {
      if (!user) { setLoaded(true); return; }
      setUser(user);
      getUserProjects(user.id).then(data => {
        const fetched: ProjectCardViewModel[] = (data || []).map(p => ({
          id: p.id,
          title: p.title,
          type: p.project_type || 'Project',
          phase: mapStatusToPhase(p.status),
          progress: 0,
          deadline: p.end_date || new Date(Date.now() + 30 * 86400000).toISOString(),
          team: ['CR'],
          description: p.description || 'No description.',
          color: p.accent_color || '#d7340b',
        }));
        setProjectsList(fetched);
        setLoaded(true);
      }).catch(() => setLoaded(true));
    }).catch(err => {
      console.error('Failed to load current user:', err);
      setLoaded(true);
    });
  }, []);

  const byPhase = useMemo(() => {
    const map: Record<Phase, ProjectCardViewModel[]> = {
      development: [], 'pre-production': [], production: [], 'post-production': [], delivery: [],
    };
    projectsList.forEach(p => map[p.phase].push(p));
    return map;
  }, [projectsList]);

  const handleNewProject = () => {
    if (!user) { toast('Sign in to create projects', 'error'); return; }
    setShowNew(true);
  };

  const createFromModal = async (title: string, type: string, logline: string) => {
    if (!user) return;
    try {
      const p = await createDBProject(user.id, title, logline, type);
      const newP: ProjectCardViewModel = {
        id: p.id, title: p.title, type, phase: 'development',
        progress: 0, deadline: new Date(Date.now() + 90 * 86400000).toISOString(),
        team: ['CR'], description: p.description || '', color: p.accent_color || '#6366f1',
      };
      setProjectsList(prev => [newP, ...prev]);
      setActiveProject(p as any);   // make it the active project across the suite
      setShowNew(false);
      toast('Project created — opening studio', 'success');
      router.push('/studio');
    } catch {
      toast('Failed to create project', 'error');
    }
  };

  const total = projectsList.length;
  const inFlight = projectsList.filter(p => p.phase !== 'delivery').length;

  return (
    <main style={{ background: 'var(--bg)', color: 'var(--fg)', minHeight: '100vh', overflow: 'hidden' }}>
      <GrainOverlay />
      <NewProjectModal open={showNew} onClose={() => setShowNew(false)} onCreate={createFromModal} />

      {/* Top bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: 58,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px',
        background: 'rgba(6,6,6,0.92)',
        backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        zIndex: 200,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/" style={{
            fontFamily: 'var(--display)', fontSize: '0.9rem', letterSpacing: 6,
            color: 'var(--fg)', textDecoration: 'none', opacity: 0.7,
            transition: 'opacity 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
          >
            MC
          </Link>

          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)' }} />

          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 3, color: 'rgba(224, 221, 174,0.4)', textTransform: 'uppercase' }}>
            Production Board
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Stats */}
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: 'Total', value: total },
              { label: 'Active', value: inFlight },
            ].map(({ label, value }) => (
              <div key={label} style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--display)', fontSize: '1rem', letterSpacing: 1, lineHeight: 1 }}>
                  {value}
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 7.5, letterSpacing: 1.5, color: 'rgba(224, 221, 174,0.3)', textTransform: 'uppercase' }}>
                  {label}
                </div>
              </div>
            ))}
          </div>

          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)' }} />

          <button
            onClick={handleNewProject}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--accent)', color: '#060606',
              border: 'none', borderRadius: 9999,
              fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: 2,
              textTransform: 'uppercase', fontWeight: 600,
              padding: '8px 16px', cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.3s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(215, 52, 11,0.35)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = '';
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}
          >
            <Plus size={11} strokeWidth={2.5} />
            New Project
          </button>
        </div>
      </div>

      {/* Phase pipeline rail — decorative */}
      <div style={{
        position: 'fixed', top: 58, left: 0, width: '100%', height: 32,
        display: 'flex', alignItems: 'center',
        background: 'rgba(8,8,8,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.03)',
        zIndex: 199,
        padding: '0 24px',
        gap: 0,
      }}>
        {PHASES.map((phase, i) => {
          const count = byPhase[phase.id].length;
          const color = PHASE_COLORS[phase.id];
          return (
            <React.Fragment key={phase.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px' }}>
                <div style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: count > 0 ? color : 'rgba(255,255,255,0.1)',
                  boxShadow: count > 0 ? `0 0 6px ${color}` : 'none',
                  transition: 'background 0.3s, box-shadow 0.3s',
                }} />
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: 7.5, letterSpacing: 2,
                  textTransform: 'uppercase',
                  color: count > 0 ? color : 'rgba(255,255,255,0.2)',
                  transition: 'color 0.3s',
                }}>
                  {phase.abbr}
                </span>
                {count > 0 && (
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 7, letterSpacing: 0.5,
                    color: 'rgba(255,255,255,0.25)',
                  }}>
                    {count}
                  </span>
                )}
              </div>
              {i < PHASES.length - 1 && (
                <div style={{
                  flex: 1, height: 1,
                  background: `linear-gradient(90deg, ${PHASE_COLORS[phase.id]}33, ${PHASE_COLORS[PHASES[i + 1].id]}33)`,
                  maxWidth: 60,
                }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Board — horizontal scroll */}
      <div style={{
        paddingTop: 90 + 32,
        paddingBottom: 100,
        paddingLeft: 24,
        paddingRight: 24,
        overflowX: 'auto',
        minHeight: '100vh',
      }}>
        {!loaded ? (
          <div style={{ display: 'flex', gap: 18, padding: '4px 2px' }}>
            {[0, 1, 2, 3].map(c => (
              <div key={c} style={{ width: 260, flexShrink: 0 }}>
                <div className="skeleton" style={{ height: 14, width: '50%', borderRadius: 4, marginBottom: 16 }} />
                {[0, 1].map(r => <div key={r} className="skeleton" style={{ height: 96, borderRadius: 12, marginBottom: 12 }} />)}
              </div>
            ))}
          </div>
        ) : loaded && user && projectsList.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 20 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 4, color: 'var(--fg-dim)', textTransform: 'uppercase' }}>Welcome to the cavern</div>
            <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(2.4rem, 6vw, 4rem)', letterSpacing: 2, lineHeight: 1, margin: 0 }}>Start your first<br />production</h1>
            <p style={{ fontFamily: 'var(--serif)', fontSize: '1.05rem', color: 'var(--fg-muted)', maxWidth: 460, lineHeight: 1.6 }}>
              One project ties your screenplay, schedule, budget, concept board, characters and pitch together. Create one to begin — everything flows from it.
            </p>
            <Button onClick={() => setShowNew(true)} variant="solid" size="lg" className="mt-2">
              Start Project
            </Button>
            <div style={{ display: 'flex', gap: 22, marginTop: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
              {['Write in ScriptOS', 'Auto-build the schedule', 'Plan budget & crew', 'Pitch it'].map((s, i) => (
                <div key={s} style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: 1, color: 'var(--fg-dim)' }}>
                  <span style={{ color: 'var(--accent)' }}>{i + 1}.</span> {s}
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{
            display: 'flex',
            gap: 18,
            width: 'max-content',
            minWidth: '100%',
          }}
        >
          {PHASES.map(phase => (
            <PhaseColumn key={phase.id} phase={phase} projects={byPhase[phase.id]} />
          ))}
        </motion.div>
        )}
      </div>

      {/* Scrollbar style */}
      <style>{`
        ::-webkit-scrollbar { height: 4px; width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.16); }
      `}</style>
    </main>
  );
}
