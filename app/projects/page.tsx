'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, ArrowUpRight, Clock, Film, Tv, Video, Music } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import GrainOverlay from '@/components/GrainOverlay';
import { supabase } from '@/lib/supabase/client';
import { getUserProjects, createProject as createDBProject } from '@/lib/supabase/projects';
import { useToast } from '@/components/Toast';

type Phase = 'development' | 'pre-production' | 'production' | 'post-production' | 'delivery';

interface Project {
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
  'production':      '#ff3c00',
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

const SEED_PROJECTS: Project[] = [
  {
    id: '1',
    title: 'Femme Fatale',
    type: 'Limited Series',
    phase: 'pre-production',
    progress: 85,
    deadline: '2026-06-30',
    team: ['PO', 'CT', 'PR'],
    description: '133-page political noir. Submitted to A24 and Proximity Media.',
    color: '#ff3c00',
  },
  {
    id: '2',
    title: '10 Million',
    type: 'Music Video',
    phase: 'post-production',
    progress: 95,
    deadline: '2026-05-15',
    team: ['PO', 'ED'],
    description: 'High-energy visual rhythm. Final color grade in progress.',
    color: '#f59e0b',
  },
  {
    id: '3',
    title: 'The Briefcase',
    type: 'Short Film',
    phase: 'delivery',
    progress: 100,
    deadline: '2024-12-01',
    team: ['PO', 'CA', 'CR'],
    description: 'Crime thriller. Festival submissions complete.',
    color: '#10b981',
  },
  {
    id: '4',
    title: 'Untitled Drama',
    type: 'Feature',
    phase: 'development',
    progress: 12,
    deadline: '2027-01-15',
    team: ['PO'],
    description: 'Early treatment stage. Exploring structural arcs.',
    color: '#6366f1',
  },
];

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function ProjectCard({ project }: { project: Project }) {
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
          color: 'rgba(240,236,228,0.4)',
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
            color: overdue ? '#ef4444' : days < 30 ? '#f59e0b' : 'rgba(240,236,228,0.3)',
          }}>
            <Clock size={9} />
            {overdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `${days}d`}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

function PhaseColumn({ phase, projects }: { phase: typeof PHASES[0]; projects: Project[] }) {
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
          color: 'rgba(240,236,228,0.2)',
          paddingLeft: 4,
        }}>
          {phase.label}
        </div>
        <div style={{
          marginLeft: 'auto',
          fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 1,
          color: 'rgba(240,236,228,0.25)',
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
            color: 'rgba(240,236,228,0.12)',
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
  const [projectsList, setProjectsList] = useState<Project[]>(SEED_PROJECTS);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUser(user);
      getUserProjects(user.id).then(data => {
        if (data && data.length > 0) {
          const fetched: Project[] = data.map(p => ({
            id: p.id,
            title: p.title,
            type: 'Feature',
            phase: (p.status === 'completed' ? 'delivery' :
                    p.status === 'in-production' ? 'production' :
                    p.status === 'post-production' ? 'post-production' :
                    'development') as Phase,
            progress: 0,
            deadline: p.end_date || new Date(Date.now() + 30 * 86400000).toISOString(),
            team: ['CR'],
            description: p.description || 'No description.',
            color: p.accent_color || '#ff3c00',
          }));
          setProjectsList(fetched);
        }
      });
    });
  }, []);

  const byPhase = useMemo(() => {
    const map: Record<Phase, Project[]> = {
      development: [], 'pre-production': [], production: [], 'post-production': [], delivery: [],
    };
    projectsList.forEach(p => map[p.phase].push(p));
    return map;
  }, [projectsList]);

  const handleNewProject = async () => {
    if (!user) { toast('Sign in to create projects', 'error'); return; }
    const title = prompt('Project title:');
    if (!title) return;
    try {
      const p = await createDBProject(user.id, title, 'A new cinematic vision.');
      const newP: Project = {
        id: p.id, title: p.title, type: 'Feature', phase: 'development',
        progress: 0, deadline: new Date(Date.now() + 90 * 86400000).toISOString(),
        team: ['CR'], description: p.description, color: '#6366f1',
      };
      setProjectsList(prev => [newP, ...prev]);
      toast('Project created', 'success');
    } catch {
      toast('Failed to create project', 'error');
    }
  };

  const total = projectsList.length;
  const inFlight = projectsList.filter(p => p.phase !== 'delivery').length;

  return (
    <main style={{ background: 'var(--bg)', color: 'var(--fg)', minHeight: '100vh', overflow: 'hidden' }}>
      <GrainOverlay />

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

          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 3, color: 'rgba(240,236,228,0.4)', textTransform: 'uppercase' }}>
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
                <div style={{ fontFamily: 'var(--mono)', fontSize: 7.5, letterSpacing: 1.5, color: 'rgba(240,236,228,0.3)', textTransform: 'uppercase' }}>
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
              (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(255,60,0,0.35)';
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
