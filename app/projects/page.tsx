'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, ArrowUpRight, Clock, Archive, ArchiveRestore, Search } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import GrainOverlay from '@/components/GrainOverlay';
import { supabase } from '@/lib/supabase/client';
import { getProjectCardFacts, getUserProjects } from '@/lib/supabase/projects';
import { fetchProjectsSignals, setProjectArchived } from '@/lib/supabase/progress';
import type { ProjectSignals } from '@/lib/os/progress';
import { SORTS, matchesQuery as matches, readinessOf, sortProjects, type Readiness, type SortKey } from '@/lib/os/board';
import { startProject } from '@/lib/onboarding';
import EmptyState from '@/components/EmptyState';
import { useToast } from '@/components/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useProject, type Phase, mapStatusToPhase, PHASE_STATUS, PHASES } from '@/lib/os';
import { FormatIcon, FormatPicker, useFormatIcon } from '@/components/formats/FormatPicker';
import { usePillStage } from '@/lib/context/PillContext';
import { useOSGate } from '@/lib/os';
import { useEscapeKey } from '@/lib/useEscapeKey';
import { logActivity } from '@/lib/supabase/activity';
import { readable } from '@/lib/color';
import { awaitOSUser, osUserId } from '@/lib/os';

function NewProjectModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (title: string, type: string, logline: string) => Promise<void> }) {
  useEscapeKey(onClose, open);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Feature');
  const [logline, setLogline] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => { if (!title.trim()) return; setBusy(true); try { await onCreate(title.trim(), type, logline.trim()); setTitle(''); setLogline(''); } finally { setBusy(false); } };
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()}
            style={{ width: 560, maxWidth: '100%', maxHeight: '92dvh', overflowY: 'auto', background: 'var(--bg-3)', border: '1px solid rgba(var(--ink-rgb), 0.1)', borderRadius: 14, padding: 28 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', letterSpacing: 3, color: 'var(--fg-muted)', textTransform: 'uppercase', marginBottom: 6 }}>New Production</div>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.8rem', letterSpacing: 2, marginBottom: 20 }}>Start a project</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Input
                autoFocus
                label="Title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
                placeholder="e.g. Femme Fatale"
              />
              <FormatPicker value={type} onChange={setType} />
              <Textarea
                label="Logline (optional)"
                value={logline}
                onChange={e => setLogline(e.target.value)}
                placeholder="One sentence that sells the story."
                rows={2}
              />
              <Button onClick={submit} disabled={busy || !title.trim()} isLoading={busy} fullWidth style={{ marginTop: 6 }}>
                Create project
              </Button>
              <p style={{ fontFamily: 'var(--mono)', fontSize: 'max(9.5px, var(--mc-min-font, 0px))', color: 'var(--fg-muted)', margin: 0, textAlign: 'center' }}>
                It opens where the first step is. Prefer a few questions first? <Link href="/welcome" style={{ color: 'var(--fg)', textDecoration: 'underline' }}>Guided start</Link>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ProjectCardViewModel {
  id: string;
  title: string;
  type: string;
  phase: Phase;
  creatorId: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  /** Tasks completed / total; null when the project has no tasks. */
  progress: { done: number; total: number } | null;
  /** How far the current phase has come (lib/os/progress), and its next step. */
  readiness: Readiness | null;
  /** The project's end date, if one is set — never invented. */
  deadline: string | null;
  /** Usernames of the owner and crew. */
  team: string[];
  description: string;
  color: string;
}

const PHASE_COLORS: Record<Phase, string> = {
  'development':     '#818cf8',
  'pre-production':  '#a78bfa',
  'production':      '#e8431a',
  'post-production': '#f59e0b',
  'delivery':        '#10b981',
};

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function ProjectCard({ project, canArchive, onArchive }: { project: ProjectCardViewModel; canArchive: boolean; onArchive: (p: ProjectCardViewModel) => void }) {
  const [hovered, setHovered] = useState(false);
  const phase = PHASE_COLORS[project.phase];
  const icon = useFormatIcon(project.type);
  // A delivered project has no deadline left to count down to.
  const days = project.deadline && project.phase !== 'delivery' ? daysUntil(project.deadline) : null;
  const overdue = days !== null && days < 0;
  const r = project.readiness;
  const pct = r && r.total ? Math.round((r.done / r.total) * 100) : null;

  return (
    <div style={{ position: 'relative' }}>
    {canArchive && (
      <button
        type="button"
        onClick={() => onArchive(project)}
        aria-label={`${project.archived ? 'Restore' : 'Archive'} “${project.title}”`}
        title={project.archived ? 'Restore to the board' : 'Archive — off the board until restored'}
        style={{
          position: 'absolute', top: 12, right: 12, zIndex: 2,
          width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--glass)', border: '1px solid rgba(var(--ink-rgb), 0.1)', color: 'var(--fg-muted)', cursor: 'pointer',
        }}
      >
        {project.archived ? <ArchiveRestore size={12} aria-hidden /> : <Archive size={12} aria-hidden />}
      </button>
    )}
    <Link href={`/projects/${project.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <motion.div
        draggable
        onDragStart={e => {
          (e as any).dataTransfer.setData('projectId', project.id);
          (e as any).dataTransfer.effectAllowed = 'move';
        }}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        animate={{ y: hovered ? -3 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{
          background: 'var(--glass)',
          border: `1px solid ${hovered ? phase + '44' : 'rgba(var(--ink-rgb), 0.06)'}`,
          borderRadius: 14,
          padding: 18,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: hovered ? `0 16px 48px rgba(0,0,0,0.7), 0 0 32px ${phase}12` : '0 2px 12px rgba(0,0,0,0.4)',
          transition: 'border-color 0.3s, box-shadow 0.3s',
          cursor: 'grab',
        }}
      >
        <div style={{
          position: 'absolute', top: 0, right: 0, width: 80, height: 80,
          background: `radial-gradient(circle at top right, ${phase}18 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: `${phase}18`,
              border: `1px solid ${phase}33`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: readable(phase), display: 'flex' }}><FormatIcon icon={icon} size={13} /></span>
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', letterSpacing: 2, color: readable(phase), textTransform: 'uppercase' }}>
              {project.type}
            </div>
          </div>
          {!canArchive && (
          <motion.div
            animate={{ opacity: hovered ? 1 : 0, x: hovered ? 0 : 4 }}
            transition={{ duration: 0.2 }}
          >
            <ArrowUpRight size={13} color="rgba(var(--ink-rgb), 0.4)" />
          </motion.div>
          )}
        </div>

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

        <div style={{
          fontFamily: 'var(--mono)',
          fontSize: 'max(9.5px, var(--mc-min-font, 0px))',
          lineHeight: 1.6,
          color: 'var(--fg-dim)',
          marginBottom: 16,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {project.description}
        </div>

        {r && pct !== null && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', letterSpacing: 0.5, color: 'var(--fg-muted)', marginBottom: 5 }}>
            <span>{r.phaseLabel}</span>
            <span>{r.done === r.total ? 'Ready for the next phase' : `${r.done} of ${r.total} done`}</span>
          </div>
          <div role="progressbar" aria-label={`${r.phaseLabel} progress`} aria-valuemin={0} aria-valuemax={r.total} aria-valuenow={r.done}
            style={{ height: 3, background: 'rgba(var(--ink-rgb), 0.06)', borderRadius: 4, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${pct}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              style={{ height: '100%', background: `linear-gradient(90deg, ${phase}88, ${phase})`, borderRadius: 4 }}
            />
          </div>
          {r.next && (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', color: 'var(--fg-muted)', marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Next: <span style={{ color: 'var(--fg)' }}>{r.next}</span>
            </div>
          )}
        </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: -4 }}>
            {project.team.slice(0, 3).map((name, i) => (
              <div key={name} title={name} style={{
                width: 20, height: 20, borderRadius: '50%',
                background: `${phase}22`,
                border: `1.5px solid var(--surface)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--mono)', fontSize: 'max(7px, var(--mc-min-font, 0px))', color: readable(phase),
                marginLeft: i > 0 ? -6 : 0,
                zIndex: project.team.length - i,
                position: 'relative',
              }}>
                {name.slice(0, 2).toUpperCase()}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {project.progress && (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', color: 'var(--fg-muted)' }}>
              {project.progress.done}/{project.progress.total} tasks
            </div>
          )}
          {days !== null && (
          <div title={`Ends ${new Date(project.deadline!).toLocaleDateString()}`} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))',
            color: overdue ? 'var(--danger)' : days < 30 ? 'var(--warn)' : 'var(--fg-dim)',
          }}>
            <Clock size={9} />
            {overdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `${days}d`}
          </div>
          )}
          </div>
        </div>
      </motion.div>
    </Link>
    </div>
  );
}

function PhaseColumn({ phase, projects, onDropProject, canArchive, onArchive }: { phase: typeof PHASES[0]; projects: ProjectCardViewModel[]; onDropProject: (projectId: string, targetPhase: Phase) => void; canArchive: (p: ProjectCardViewModel) => boolean; onArchive: (p: ProjectCardViewModel) => void }) {
  const color = PHASE_COLORS[phase.id];
  const [dragOver, setDragOver] = useState(false);

  return (
    <div className="mc-board-col" style={{ minWidth: 260, flex: '0 0 260px' }}>
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
        <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', letterSpacing: 2.5, color: readable(color), textTransform: 'uppercase' }}>
          {phase.abbr}
        </div>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', letterSpacing: 1,
          color: 'var(--fg-dim)',
          paddingLeft: 4,
        }}>
          {phase.label}
        </div>
        <div style={{
          marginLeft: 'auto',
          fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', letterSpacing: 1,
          color: 'var(--fg-dim)',
          background: 'rgba(var(--ink-rgb), 0.04)',
          border: '1px solid rgba(var(--ink-rgb), 0.06)',
          borderRadius: 8,
          padding: '2px 7px',
        }}>
          {projects.length}
        </div>
      </div>

      <div
        onDragOver={e => { e.preventDefault(); if (!dragOver) setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault();
          setDragOver(false);
          const pid = e.dataTransfer.getData('projectId');
          if (pid) onDropProject(pid, phase.id);
        }}
        style={{
          display: 'flex', flexDirection: 'column', gap: 10, minHeight: '60vh',
          background: dragOver ? 'rgba(var(--ink-rgb), 0.015)' : 'transparent',
          border: dragOver ? `1px dashed ${color}33` : '1px solid transparent',
          borderRadius: 14,
          padding: 8,
          transition: 'background 0.25s, border-color 0.25s'
        }}
      >
        <AnimatePresence>
          {projects.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ delay: i * 0.07, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <ProjectCard project={p} canArchive={canArchive(p)} onArchive={onArchive} />
            </motion.div>
          ))}
        </AnimatePresence>

        {projects.length === 0 && (
          <div style={{
            height: 80, borderRadius: 14,
            border: '1px dashed rgba(var(--ink-rgb), 0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', letterSpacing: 1.5,
            color: 'var(--fg-dim)',
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
  useOSGate();
  const [projectsList, setProjectsList] = useState<ProjectCardViewModel[]>([]);
  const [user, setUser] = useState<any>(null);
  const [showNew, setShowNew] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const { toast } = useToast();
  const { setActiveProject } = useProject();
  const router = useRouter();

  usePillStage(
    {
      module: 'home',
      title: 'Projects',
      accent: '#e8431a',
      fields: [
        { label: 'Total', value: `${projectsList.filter((p) => !p.archived).length}`, color: 'var(--accent)' },
      ],
      actions: user ? [
        { id: 'new-project', label: '+ New Project', onClick: () => setShowNew(true) },
      ] : [],
    },
    [projectsList, user],
  );

  useEffect(() => {

    awaitOSUser().then((user) => {
      if (!user) { setLoaded(true); return; }
      setUser(user);
      getUserProjects(user.id).then(async data => {
        const rows = data || [];
        const [facts, signals] = await Promise.all([
          getProjectCardFacts(rows).catch(() => ({} as Awaited<ReturnType<typeof getProjectCardFacts>>)),
          fetchProjectsSignals(rows.map((p) => p.id)).catch(() => ({} as Record<string, ProjectSignals>)),
        ]);
        const fetched: ProjectCardViewModel[] = rows.map(p => ({
          id: p.id,
          title: p.title,
          type: p.project_type || 'Project',
          phase: mapStatusToPhase(p.status ?? undefined),
          creatorId: p.creator_id,
          archived: !!p.archived_at,
          createdAt: p.created_at ?? '',
          updatedAt: p.updated_at ?? p.created_at ?? '',
          readiness: readinessOf(signals[p.id]),
          progress: facts[p.id]?.tasksTotal ? { done: facts[p.id].tasksDone, total: facts[p.id].tasksTotal } : null,
          deadline: p.end_date || null,
          team: facts[p.id]?.team ?? [],
          description: p.description || 'No description.',
          color: readable(p.accent_color || 'var(--accent)'),
        }));
        setProjectsList(fetched);
        setLoaded(true);
      }).catch(() => setLoaded(true));
    }).catch(err => {
      console.error('Failed to load current user:', err);
      setLoaded(true);
    });
  }, []);

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('updated');
  const [showArchived, setShowArchived] = useState(false);

  const active = useMemo(() => projectsList.filter((p) => !p.archived), [projectsList]);
  const archived = useMemo(() => projectsList.filter((p) => p.archived), [projectsList]);
  const shown = useMemo(
    () => sortProjects((showArchived ? archived : active).filter((p) => matches(p, query.trim())), sort),
    [active, archived, showArchived, query, sort],
  );

  const byPhase = useMemo(() => {
    const map: Record<Phase, ProjectCardViewModel[]> = {
      development: [], 'pre-production': [], production: [], 'post-production': [], delivery: [],
    };
    (showArchived ? [] : shown).forEach(p => map[p.phase].push(p));
    return map;
  }, [shown, showArchived]);

  const canArchive = (p: ProjectCardViewModel) => !!user?.id && p.creatorId === user.id;

  const toggleArchived = async (p: ProjectCardViewModel) => {
    const next = !p.archived;
    setProjectsList((prev) => prev.map((x) => (x.id === p.id ? { ...x, archived: next } : x)));
    try {
      await setProjectArchived(p.id, next);
      toast(next ? `Archived “${p.title}” — find it under Archived` : `“${p.title}” is back on the board`, 'success');
    } catch (e) {
      setProjectsList((prev) => prev.map((x) => (x.id === p.id ? { ...x, archived: p.archived } : x)));
      toast(e instanceof Error ? e.message : 'Could not archive the project', 'error');
    }
  };

  // The page's own `user` is read once on mount; fall back to the live session
  // so a user who signed in after mount is never told to sign in.
  const currentUserId = () => user?.id ?? osUserId();

  const handleNewProject = () => {
    if (!currentUserId()) { toast('Sign in to create projects', 'error'); return; }
    setShowNew(true);
  };

  // Opens the tool for the new project's first step (lib/onboarding).
  const createFromModal = async (title: string, type: string, logline: string) => {
    const uid = currentUserId();
    if (!uid) { toast('Sign in to create projects', 'error'); return; }
    try {
      const { project: p, href } = await startProject(uid, { title, format: type, logline });
      setActiveProject(p as any);
      setShowNew(false);
      toast(`“${p.title}” is ready`, 'success');
      router.push(href);
    } catch {
      toast('Failed to create project', 'error');
    }
  };

  const handleDropProject = async (projectId: string, targetPhase: Phase) => {
    const oldList = [...projectsList];
    const targetProj = projectsList.find(p => p.id === projectId);
    setProjectsList(prev => prev.map(p => p.id === projectId ? { ...p, phase: targetPhase } : p));

    try {
      const dbStatus = PHASE_STATUS[targetPhase];

      const { error } = await supabase.from('projects').update({ status: dbStatus }).eq('id', projectId);
      if (error) throw error;
      toast(`Project moved to ${targetPhase}`, 'success');

      if (targetProj) {
        void logActivity(`moved project "${targetProj.title}" to ${targetPhase}`, 'project', projectId);
      }
    } catch (err: any) {
      console.error('Failed to move project:', err);
      toast('Failed to move project', 'error');
      setProjectsList(oldList);
    }
  };

  const total = active.length;
  const inFlight = active.filter(p => p.phase !== 'delivery').length;

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--fg)', minHeight: '100vh', overflow: 'hidden' }}>
      <h1 className="sr-only">Projects</h1>
      <GrainOverlay />
      <NewProjectModal open={showNew} onClose={() => setShowNew(false)} onCreate={createFromModal} />

      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: 58,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px',
        background: 'var(--surface)',
        backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(var(--ink-rgb), 0.04)',
        zIndex: 200,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/" style={{
            fontFamily: 'var(--display)', fontSize: '0.9rem', letterSpacing: 6,
            color: 'var(--fg-dim)', textDecoration: 'none',
            transition: 'opacity 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
          >
            MC
          </Link>

          <div style={{ width: 1, height: 16, background: 'rgba(var(--ink-rgb), 0.08)' }} />

          <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 3, color: 'var(--fg-dim)', textTransform: 'uppercase' }}>
            Production Board
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: 'Total', value: total },
              { label: 'Active', value: inFlight },
            ].map(({ label, value }) => (
              <div key={label} style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--display)', fontSize: '1rem', letterSpacing: 1, lineHeight: 1 }}>
                  {value}
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(7.5px, var(--mc-min-font, 0px))', letterSpacing: 1.5, color: 'var(--fg-dim)', textTransform: 'uppercase' }}>
                  {label}
                </div>
              </div>
            ))}
          </div>

          <div style={{ width: 1, height: 16, background: 'rgba(var(--ink-rgb), 0.08)' }} />

          <button
            onClick={handleNewProject}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--accent)', color: 'var(--on-accent)',
              border: 'none', borderRadius: 9999,
              fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', letterSpacing: 2,
              textTransform: 'uppercase', fontWeight: 600,
              padding: '8px 16px', cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.3s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(232, 67, 26,0.35)';
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

      <div style={{
        position: 'fixed', top: 58, left: 0, width: '100%', height: 32,
        display: 'flex', alignItems: 'center',
        background: 'var(--surface)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(var(--ink-rgb), 0.03)',
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
                  background: count > 0 ? color : 'var(--fg-dim)',
                  boxShadow: count > 0 ? `0 0 6px ${color}` : 'none',
                  transition: 'background 0.3s, box-shadow 0.3s',
                }} />
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: 'max(7.5px, var(--mc-min-font, 0px))', letterSpacing: 2,
                  textTransform: 'uppercase',
                  color: count > 0 ? readable(color) : 'var(--fg-dim)',
                  transition: 'color 0.3s',
                }}>
                  {phase.abbr}
                </span>
                {count > 0 && (
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 'max(7px, var(--mc-min-font, 0px))', letterSpacing: 0.5,
                    color: 'var(--fg-dim)',
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

      <div style={{
        paddingTop: 90 + 32,
        paddingBottom: 'calc(var(--taskbar-height, 94px) + 20px)',
        paddingLeft: 24,
        paddingRight: 24,
        overflowX: 'auto',
        minHeight: '100vh',
      }} className="mc-board">
        {!loaded ? (
          <div style={{ display: 'flex', gap: 18, padding: '4px 2px' }}>
            {[0, 1, 2, 3].map(c => (
              <div key={c} style={{ width: 260, flexShrink: 0 }}>
                <div className="skeleton" style={{ height: 14, width: '50%', borderRadius: 4, marginBottom: 16 }} />
                {[0, 1].map(r => <div key={r} className="skeleton" style={{ height: 96, borderRadius: 14, marginBottom: 12 }} />)}
              </div>
            ))}
          </div>
        ) : loaded && user && projectsList.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 20 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', letterSpacing: 4, color: 'var(--fg-dim)', textTransform: 'uppercase' }}>Welcome to the cavern</div>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(2.4rem, 6vw, 4rem)', letterSpacing: 2, lineHeight: 1, margin: 0, fontWeight: 400 }}>Start your first<br />production</h2>
            <p style={{ fontFamily: 'var(--serif)', fontSize: '1.05rem', color: 'var(--fg-muted)', maxWidth: 460, lineHeight: 1.6 }}>
              One project ties your screenplay, schedule, budget, concept board, characters and pitch together. Create one to begin — everything flows from it.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Button onClick={() => setShowNew(true)} variant="solid" size="lg">Start Project</Button>
              <Button href="/welcome" variant="outline" size="lg">Guided start</Button>
            </div>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-muted)', margin: 0 }}>
              Here to join a crew instead? <Link href="/jobs" style={{ color: 'var(--fg)', textDecoration: 'underline' }}>Browse jobs</Link> or <Link href="/crew" style={{ color: 'var(--fg)', textDecoration: 'underline' }}>the crew directory</Link>.
            </p>
          </motion.div>
        ) : (
        <>
        <div role="search" aria-label="Projects" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
          <div style={{ position: 'relative', flex: '0 1 280px', minWidth: 180 }}>
            <Search size={12} aria-hidden style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} />
            <input
              type="search"
              aria-label="Search projects"
              placeholder="Search projects, people…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ width: '100%', padding: '7px 10px 7px 28px', borderRadius: 8, border: '1px solid rgba(var(--ink-rgb), 0.1)', background: 'rgba(var(--ink-rgb), 0.03)', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 11 }}
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--fg-muted)' }}>
            Sort
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}
              style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid rgba(var(--ink-rgb), 0.1)', background: 'var(--bg-3)', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'none', letterSpacing: 0 }}>
              {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          <button type="button" aria-pressed={showArchived} onClick={() => setShowArchived((v) => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 9999, cursor: 'pointer',
              border: `1px solid ${showArchived ? 'var(--accent)' : 'rgba(var(--ink-rgb), 0.1)'}`,
              background: showArchived ? 'rgba(232,67,26,0.12)' : 'transparent', color: showArchived ? 'var(--fg)' : 'var(--fg-muted)',
              fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 1.5, textTransform: 'uppercase',
            }}>
            <Archive size={11} aria-hidden /> Archived{archived.length ? ` (${archived.length})` : ''}
          </button>
          <span aria-live="polite" style={{ fontFamily: 'var(--mono)', fontSize: 'max(9.5px, var(--mc-min-font, 0px))', color: 'var(--fg-muted)' }}>
            {query.trim() ? `${shown.length} match${shown.length === 1 ? '' : 'es'}` : ''}
          </span>
        </div>

        {showArchived ? (
          shown.length === 0 ? (
            <div style={{ maxWidth: 'var(--w-form)' }}>
              <EmptyState icon={<Archive size={26} />}
                title={query.trim() ? 'No archived project matches' : 'Nothing archived'}
                subtitle={query.trim() ? 'Try other words, or clear the search.' : 'Archive a project from its card when it’s wrapped or on hold — it leaves the board and pickers, and nothing in it changes.'}
                action={<Button variant="outline" size="sm" onClick={() => { setShowArchived(false); setQuery(''); }}>Back to the board</Button>} />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, maxWidth: 'var(--w-content)' }}>
              {shown.map((p) => <ProjectCard key={p.id} project={p} canArchive={canArchive(p)} onArchive={toggleArchived} />)}
            </div>
          )
        ) : query.trim() && shown.length === 0 ? (
          <div style={{ maxWidth: 'var(--w-form)' }}>
            <EmptyState icon={<Search size={26} />} title={`No project matches “${query.trim()}”`}
              subtitle={archived.some((p) => matches(p, query.trim())) ? 'An archived project does — look under Archived.' : 'Search looks at titles, loglines, formats and people.'}
              action={<Button variant="outline" size="sm" onClick={() => setQuery('')}>Clear search</Button>} />
          </div>
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
            <PhaseColumn key={phase.id} phase={phase} projects={byPhase[phase.id]} onDropProject={handleDropProject} canArchive={canArchive} onArchive={toggleArchived} />
          ))}
        </motion.div>
        )}
        </>
        )}
      </div>

      <style>{`
        ::-webkit-scrollbar { height: 4px; width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(var(--ink-rgb), 0.08); border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(var(--ink-rgb), 0.16); }
      `}</style>
    </div>
  );
}
