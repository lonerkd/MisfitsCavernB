'use client';

import React, { useState, useMemo } from 'react';
import { Plus, ArrowUpRight, Clock, Film, Tv, Video, Music, Mic, Megaphone, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import GrainOverlay from '@/components/GrainOverlay';
import NotificationBell from '@/components/NotificationBell';
import { supabase } from '@/lib/supabase/client';
import { createProject as createDBProject } from '@/lib/supabase/projects';
import { useProject, type Project as DBProject } from '@/lib/context/ProjectContext';
import { usePillZone } from '@/lib/context/PillContext';
import { useToast } from '@/components/Toast';
import { CURATED_PROJECT_TYPES, getPhaseTemplate, phaseIndex as getPhaseIndex } from '@/lib/projectTypes';

const TYPE_ICONS: Record<string, React.ElementType> = {
  'Feature':       Film,
  'Short Film':    Film,
  'Series':        Tv,
  'Music Video':   Music,
  'Documentary':   Video,
  'Commercial':    Megaphone,
  'Podcast':       Mic,
};

const TYPE_COLORS: Record<string, string> = {
  'Feature':       '#6366f1',
  'Short Film':    '#10b981',
  'Series':        '#8b5cf6',
  'Music Video':   '#f59e0b',
  'Documentary':   '#3b82f6',
  'Commercial':    '#ec4899',
  'Podcast':       '#d7340b',
};

function typeColor(type?: string) {
  return TYPE_COLORS[type || ''] || '#737373';
}

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function ProjectCard({ project }: { project: DBProject }) {
  const [hovered, setHovered] = useState(false);
  const { setActiveProject } = useProject();
  const color = project.accent_color || typeColor(project.project_type);
  const Icon = TYPE_ICONS[project.project_type || ''] ?? Film;
  const phases = getPhaseTemplate(project.project_type);
  const idx = getPhaseIndex(project.project_type, project.status);
  const progress = (idx / Math.max(1, phases.length - 1)) * 100;
  const days = daysUntil((project as any).end_date);

  // Per-card Pill zone: hovering a card sharpens the satellite onto that
  // project — its phase + progress — with a one-tap "Set Active" that's the
  // same act the rest of the app keys off.
  const zone = useMemo(() => ({
    module: 'studio',
    accent: color,
    title: project.title,
    fields: [
      { label: 'Phase', value: phases[idx]?.abbr || '—', color },
      { label: 'Progress', value: `${Math.round(progress)}%`, color: progress === 100 ? '#10b981' : color },
      ...(days !== null ? [{ label: 'Due', value: days < 0 ? `${Math.abs(days)}d over` : days === 0 ? 'Today' : `${days}d` }] : []),
    ],
    actions: [
      { id: 'activate', label: '◆ Set Active', onClick: () => setActiveProject(project) },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [project.id, project.title, color, phases, idx, progress, days]);
  const zoneHandlers = usePillZone(zone, 1);

  return (
    <Link href={`/projects/${project.id}`} style={{ textDecoration: 'none', display: 'block' }} {...zoneHandlers}>
      <motion.div
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        animate={{ y: hovered ? -3 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{
          background: 'rgba(12,12,12,0.8)',
          border: `1px solid ${hovered ? color + '44' : 'rgba(224,221,174,0.06)'}`,
          borderRadius: 16,
          padding: 18,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: hovered ? `0 16px 48px rgba(0,0,0,0.7), 0 0 32px ${color}12` : '0 2px 12px rgba(0,0,0,0.4)',
          transition: 'border-color 0.3s, box-shadow 0.3s',
          cursor: 'pointer',
        }}
      >
        <div style={{
          position: 'absolute', top: 0, right: 0, width: 80, height: 80,
          background: `radial-gradient(circle at top right, ${color}18 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: `${color}18`,
              border: `1px solid ${color}33`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={13} color={color} strokeWidth={1.5} />
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 2, color, textTransform: 'uppercase' }}>
              {project.project_type || 'Feature'}
            </div>
          </div>
          <motion.div animate={{ opacity: hovered ? 1 : 0, x: hovered ? 0 : 4 }} transition={{ duration: 0.2 }}>
            <ArrowUpRight size={13} color="rgba(224,221,174,0.4)" />
          </motion.div>
        </div>

        <div style={{ fontFamily: 'var(--display)', fontSize: '1.25rem', letterSpacing: 2, color: 'var(--fg)', marginBottom: 8, lineHeight: 1.2 }}>
          {project.title}
        </div>

        <div style={{
          fontFamily: 'var(--mono)', fontSize: 9.5, lineHeight: 1.6, color: 'rgba(240,236,228,0.4)',
          marginBottom: 16, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {project.description || 'No description yet.'}
        </div>

        <div style={{ height: 2, background: 'rgba(224,221,174,0.05)', borderRadius: 1, marginBottom: 12, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: `${progress}%` }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ height: '100%', background: `linear-gradient(90deg, ${color}88, ${color})`, borderRadius: 1 }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 1.5, color, textTransform: 'uppercase' }}>
            {phases[idx]?.abbr || '—'}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontFamily: 'var(--mono)', fontSize: 8.5,
            color: days === null ? 'rgba(240,236,228,0.2)' : days < 0 ? '#ef4444' : days < 30 ? '#f59e0b' : 'rgba(240,236,228,0.3)',
          }}>
            <Clock size={9} />
            {days === null ? 'No end date' : days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `${days}d`}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

function NewProjectModal({ onClose, onCreated, userId }: { onClose: () => void; onCreated: (p: DBProject) => void; userId: string }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectType, setProjectType] = useState('Feature');
  const [customType, setCustomType] = useState('');
  const [usingCustom, setUsingCustom] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const effectiveType = usingCustom ? customType.trim() : projectType;

  const handleCreate = async () => {
    if (!title.trim() || !effectiveType) return;
    setSubmitting(true);
    try {
      const p = await createDBProject(userId, title.trim(), description.trim(), effectiveType);
      onCreated(p);
      toast('Project created', 'success');
      onClose();
    } catch {
      toast('Failed to create project', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <motion.div
        initial={{ scale: 0.94, y: 16, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.94, y: 16, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 520,
          background: 'rgba(10,15,24,0.98)', border: '1px solid rgba(224,221,174,0.08)',
          borderRadius: 20, padding: 32, boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: 3, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 6 }}>
              New Project
            </div>
            <div style={{ fontFamily: 'var(--display)', fontSize: '1.4rem', letterSpacing: 2 }}>What are we making?</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(240,236,228,0.3)', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 2, color: 'rgba(240,236,228,0.3)', textTransform: 'uppercase', marginBottom: 8 }}>Title</div>
            <input
              type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Femme Fatale"
              autoFocus
              style={{
                width: '100%', padding: '12px 14px', background: 'rgba(224,221,174,0.04)',
                border: '1px solid rgba(224,221,174,0.08)', borderRadius: 10, color: 'var(--fg)',
                fontFamily: 'var(--mono)', fontSize: 12, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 2, color: 'rgba(240,236,228,0.3)', textTransform: 'uppercase', marginBottom: 8 }}>Project Type</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: usingCustom ? 10 : 0 }}>
              {CURATED_PROJECT_TYPES.map(t => {
                const active = !usingCustom && projectType === t;
                const color = typeColor(t);
                return (
                  <button
                    key={t}
                    onClick={() => { setUsingCustom(false); setProjectType(t); }}
                    style={{
                      padding: '6px 12px', borderRadius: 9999,
                      background: active ? `${color}18` : 'rgba(224,221,174,0.03)',
                      border: `1px solid ${active ? color + '55' : 'rgba(224,221,174,0.06)'}`,
                      color: active ? color : 'rgba(240,236,228,0.4)',
                      fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: 1.5,
                      textTransform: 'uppercase', cursor: 'pointer',
                    }}
                  >
                    {t}
                  </button>
                );
              })}
              <button
                onClick={() => setUsingCustom(true)}
                style={{
                  padding: '6px 12px', borderRadius: 9999,
                  background: usingCustom ? 'rgba(255,60,0,0.12)' : 'rgba(224,221,174,0.03)',
                  border: `1px solid ${usingCustom ? 'rgba(255,60,0,0.4)' : 'rgba(224,221,174,0.06)'}`,
                  color: usingCustom ? 'var(--accent)' : 'rgba(240,236,228,0.4)',
                  fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: 1.5,
                  textTransform: 'uppercase', cursor: 'pointer',
                }}
              >
                Custom…
              </button>
            </div>
            {usingCustom && (
              <input
                type="text" value={customType} onChange={e => setCustomType(e.target.value)}
                placeholder="e.g. Live Multi-Cam, Branded Content, Album Visualizer…"
                style={{
                  width: '100%', padding: '12px 14px', background: 'rgba(224,221,174,0.04)',
                  border: '1px solid rgba(224,221,174,0.08)', borderRadius: 10, color: 'var(--fg)',
                  fontFamily: 'var(--mono)', fontSize: 12, outline: 'none', boxSizing: 'border-box',
                }}
              />
            )}
            <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'rgba(240,236,228,0.2)', marginTop: 8, lineHeight: 1.5 }}>
              Drives the phase pipeline this project follows — each type gets its own.
            </div>
          </div>

          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 2, color: 'rgba(240,236,228,0.3)', textTransform: 'uppercase', marginBottom: 8 }}>Brief (optional)</div>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="What's the vision?"
              rows={3}
              style={{
                width: '100%', padding: '12px 14px', background: 'rgba(224,221,174,0.04)',
                border: '1px solid rgba(224,221,174,0.08)', borderRadius: 10, color: 'var(--fg)',
                fontFamily: 'var(--serif)', fontSize: 13, outline: 'none', resize: 'none',
                boxSizing: 'border-box', lineHeight: 1.6,
              }}
            />
          </div>

          <button
            onClick={handleCreate}
            disabled={!title.trim() || !effectiveType || submitting}
            style={{
              marginTop: 6, padding: '14px',
              background: title.trim() && effectiveType ? 'var(--accent)' : 'rgba(224,221,174,0.05)',
              color: title.trim() && effectiveType ? '#060606' : 'rgba(240,236,228,0.3)',
              border: 'none', borderRadius: 12,
              fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2.5,
              textTransform: 'uppercase', fontWeight: 600,
              cursor: title.trim() && effectiveType ? 'pointer' : 'default',
              boxShadow: title.trim() && effectiveType ? '0 6px 20px rgba(255,60,0,0.3)' : 'none',
            }}
          >
            {submitting ? 'Creating…' : 'Create Project'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ProjectsPage() {
  const { projects, loading, setActiveProject, addProject } = useProject();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [showNew, setShowNew] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const { toast } = useToast();

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  const typesPresent = useMemo(() => {
    const set = new Set<string>();
    projects.forEach(p => set.add(p.project_type || 'Feature'));
    return Array.from(set);
  }, [projects]);

  const filtered = typeFilter ? projects.filter(p => (p.project_type || 'Feature') === typeFilter) : projects;

  return (
    <main style={{ background: 'var(--bg)', color: 'var(--fg)', minHeight: '100vh' }}>
      <GrainOverlay />

      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: 58,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', background: 'rgba(7,11,19,0.92)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(224,221,174,0.04)', zIndex: 200,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/" style={{
            fontFamily: 'var(--display)', fontSize: '0.9rem', letterSpacing: 6,
            color: 'var(--fg)', textDecoration: 'none', opacity: 0.7,
          }}>MC</Link>
          <div style={{ width: 1, height: 16, background: 'rgba(224,221,174,0.08)' }} />
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 3, color: 'rgba(240,236,228,0.4)', textTransform: 'uppercase' }}>
            Projects
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: 'Total', value: projects.length },
              { label: 'Types', value: typesPresent.length },
            ].map(({ label, value }) => (
              <div key={label} style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--display)', fontSize: '1rem', letterSpacing: 1, lineHeight: 1 }}>{value}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 7.5, letterSpacing: 1.5, color: 'rgba(240,236,228,0.3)', textTransform: 'uppercase' }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ width: 1, height: 16, background: 'rgba(224,221,174,0.08)' }} />
          <button
            onClick={() => { if (!user) { toast('Sign in to create projects', 'error'); return; } setShowNew(true); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--accent)', color: '#060606', border: 'none', borderRadius: 9999,
              fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: 2, textTransform: 'uppercase',
              fontWeight: 600, padding: '8px 16px', cursor: 'pointer',
            }}
          >
            <Plus size={11} strokeWidth={2.5} /> New Project
          </button>
          {user && <NotificationBell />}
        </div>
      </div>

      {/* Type filter rail */}
      {typesPresent.length > 0 && (
        <div style={{
          position: 'fixed', top: 58, left: 0, width: '100%', height: 40,
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(8,12,20,0.85)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(224,221,174,0.03)', zIndex: 199, padding: '0 24px',
          overflowX: 'auto',
        }}>
          <button
            onClick={() => setTypeFilter('')}
            style={{
              padding: '5px 12px', borderRadius: 9999, whiteSpace: 'nowrap',
              background: !typeFilter ? 'rgba(224,221,174,0.08)' : 'transparent',
              border: '1px solid rgba(224,221,174,0.06)', cursor: 'pointer',
              color: !typeFilter ? 'var(--fg)' : 'rgba(240,236,228,0.4)',
              fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase',
            }}
          >
            All ({projects.length})
          </button>
          {typesPresent.map(t => {
            const count = projects.filter(p => (p.project_type || 'Feature') === t).length;
            const active = typeFilter === t;
            const color = typeColor(t);
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(active ? '' : t)}
                style={{
                  padding: '5px 12px', borderRadius: 9999, whiteSpace: 'nowrap',
                  background: active ? `${color}18` : 'transparent',
                  border: `1px solid ${active ? color + '44' : 'rgba(224,221,174,0.06)'}`,
                  cursor: 'pointer', color: active ? color : 'rgba(240,236,228,0.4)',
                  fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase',
                }}
              >
                {t} ({count})
              </button>
            );
          })}
        </div>
      )}

      <div style={{ paddingTop: typesPresent.length > 0 ? 58 + 40 + 24 : 58 + 24, paddingBottom: 100, paddingLeft: 24, paddingRight: 24 }}>
        {loading ? (
          <div style={{ padding: '80px 0', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 3, color: 'rgba(240,236,228,0.2)', textTransform: 'uppercase' }}>
            Loading projects…
          </div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '100px 0', textAlign: 'center' }}>
            <Film size={28} color="rgba(240,236,228,0.1)" style={{ margin: '0 auto 16px', display: 'block' }} />
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 3, color: 'rgba(240,236,228,0.2)', textTransform: 'uppercase', marginBottom: 20 }}>
              {projects.length === 0 ? 'No projects yet' : 'No projects of this type'}
            </div>
            {projects.length === 0 && (
              <button
                onClick={() => { if (!user) { toast('Sign in to create projects', 'error'); return; } setShowNew(true); }}
                style={{
                  padding: '10px 22px', borderRadius: 9999,
                  background: 'rgba(255,60,0,0.12)', border: '1px solid rgba(255,60,0,0.3)',
                  color: 'var(--accent)', cursor: 'pointer',
                  fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: 2, textTransform: 'uppercase',
                }}
              >
                Create your first project
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}
          >
            {filtered.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, duration: 0.4 }}>
                <ProjectCard project={p} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {showNew && user && (
          <NewProjectModal
            onClose={() => setShowNew(false)}
            onCreated={(p) => { addProject(p); setActiveProject(p); router.push(`/projects/${p.id}`); }}
            userId={user.id}
          />
        )}
      </AnimatePresence>

      <style>{`
        input::placeholder, textarea::placeholder { color: rgba(240,236,228,0.18); }
        ::-webkit-scrollbar { height: 4px; width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(224,221,174,0.08); border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(224,221,174,0.16); }
      `}</style>
    </main>
  );
}
