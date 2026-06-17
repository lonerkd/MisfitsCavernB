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
import { useProject, type Project as DBProject } from '@/lib/context/ProjectContext';
import { getPhaseTemplate, phaseIndex as getPhaseIndex } from '@/lib/projectTypes';

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

// ─── Script preview — real scripts attached to this project ──────────────────

function ScriptPreview({ scripts }: { scripts: DBProject['scripts'] }) {
  if (!scripts || scripts.length === 0) {
    return <div style={{ padding: '14px 16px', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg-dim)', fontStyle: 'italic' }}>No scripts yet.</div>;
  }
  return (
    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {scripts.slice(0, 5).map(s => (
        <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'rgba(240,236,228,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</span>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexShrink: 0 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 7.5, color: 'rgba(240,236,228,0.35)', textTransform: 'uppercase', letterSpacing: 1 }}>{s.format}</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: '#ffaa00', textTransform: 'uppercase', letterSpacing: 1 }}>{s.status}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Asset preview — real references on the project's moodboard ──────────────

function AssetPreview({ references }: { references: DBProject['references'] }) {
  if (!references || references.length === 0) {
    return <div style={{ padding: '14px 16px', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg-dim)', fontStyle: 'italic' }}>No references yet.</div>;
  }
  return (
    <div style={{ padding: '10px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
      {references.slice(0, 6).map(item => (
        <div key={item.id} style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 8, padding: '8px 10px',
          display: 'flex', alignItems: 'center', gap: 7,
        }}>
          <img src={item.url} alt={item.title} style={{ width: 14, height: 14, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'rgba(240,236,228,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Crew preview ─────────────────────────────────────────────────────────────

function CrewPreview({ team }: { team: DBProject['crew'] }) {
  if (!team || team.length === 0) {
    return <div style={{ padding: '14px 16px', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg-dim)', fontStyle: 'italic' }}>No crew assigned yet.</div>;
  }
  return (
    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {team.map((member, i) => (
        <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
        </div>
      ))}
    </div>
  );
}

// ─── Timeline preview ────────────────────────────────────────────────────────

function TimelinePreview({ endDate, phase, projectType }: { endDate?: string; phase?: string; projectType?: string }) {
  const daysLeft = endDate ? Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000)) : null;
  const phases = getPhaseTemplate(projectType);
  const idx = getPhaseIndex(projectType, phase);
  const progress = (idx / (phases.length - 1)) * 100;
  const milestones = phases.map((p, i) => ({ label: p.label, done: idx >= i }));

  return (
    <div style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
        {daysLeft !== null ? (
          <>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 700, color: daysLeft < 30 ? '#ff3c00' : 'var(--fg)', lineHeight: 1 }}>{daysLeft}</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)', letterSpacing: 2, textTransform: 'uppercase' }}>days to end date</span>
          </>
        ) : (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg-dim)', fontStyle: 'italic' }}>No end date set.</span>
        )}
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

// ─── Main page ───────────────────────────────────────────────────────────────

export default function ProjectHubPage() {
  const params = useParams();
  const router = useRouter();
  const { activeProject, setActiveProject, projects, refreshProject, loading } = useProject();
  const id = params.id as string;

  // The list only carries summary rows — make sure the full aggregate
  // (crew/scripts/references) is loaded for whichever project the URL names.
  useEffect(() => {
    if (loading) return;
    const found = projects.find(p => p.id === id);
    if (!found) { router.push('/projects'); return; }
    if (activeProject?.id !== id) {
      setActiveProject(found);
      refreshProject(id);
    }
  }, [id, projects, loading, activeProject?.id]);

  const project = activeProject?.id === id ? activeProject : null;

  if (!project) return null;

  const color = project.accent_color || '#ff3c00';
  const phases = getPhaseTemplate(project.project_type);
  const currentPhaseIdx = getPhaseIndex(project.project_type, project.status);

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', overflow: 'hidden' }}>
      <GrainOverlay />

      {/* Ambient project glow */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: '50vh', pointerEvents: 'none', zIndex: 0,
        background: `radial-gradient(ellipse at 50% -20%, ${color}0a 0%, transparent 65%)`,
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
            <span style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 3, textTransform: 'uppercase', color: color, opacity: 0.8 }}>
              {project.project_type || 'Feature'} · {project.status}
            </span>
          </div>
        </div>

        {/* Phase rail */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {phases.map((phase, i) => {
            const isDone   = i < currentPhaseIdx;
            const isActive = i === currentPhaseIdx;
            return (
              <React.Fragment key={phase.id}>
                <div style={{
                  padding: '5px 12px', borderRadius: 9999,
                  fontFamily: 'var(--mono)', fontSize: 7.5, letterSpacing: 2.5, textTransform: 'uppercase',
                  background: isActive ? `${color}18` : 'transparent',
                  color: isActive ? color : isDone ? 'rgba(240,236,228,0.4)' : 'rgba(240,236,228,0.2)',
                  border: isActive ? `1px solid ${color}35` : '1px solid transparent',
                  transition: 'all 0.3s', whiteSpace: 'nowrap',
                }}>
                  {isDone && <span style={{ marginRight: 4 }}>✓</span>}
                  {phase.abbr}
                </div>
                {i < phases.length - 1 && (
                  <div style={{
                    width: 16, height: 1,
                    background: isDone ? `${color}60` : 'rgba(255,255,255,0.08)',
                    transition: 'background 0.4s',
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)', letterSpacing: 1.5,
            padding: '5px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', textTransform: 'uppercase',
          }}>
            {project.status}
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
          <p style={{ fontFamily: 'var(--serif)', fontSize: '0.95rem', color: 'var(--fg-dim)', marginTop: 10, maxWidth: 560 }}>{project.description || 'No description yet.'}</p>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>

          {/* ─ ScriptOS ─ */}
          <DeptWindow
            title="ScriptOS"
            tag="Screenplay"
            color="#ff3c00"
            href="/editor"
            delay={0.05}
            stats={[
              { label: 'Scripts', value: project.scripts?.length ?? 0 },
              { label: 'Latest',  value: project.scripts?.[0]?.status ?? '—' },
            ]}
            preview={<ScriptPreview scripts={project.scripts} />}
          />

          {/* ─ Studio ─ */}
          <DeptWindow
            title="Studio"
            tag="Assets"
            color="#6366f1"
            href="/studio"
            delay={0.1}
            stats={[
              { label: 'References', value: project.references?.length ?? 0 },
            ]}
            preview={<AssetPreview references={project.references} />}
          />

          {/* ─ Lounge / Crew ─ */}
          <DeptWindow
            title="Lounge"
            tag="Crew"
            color="#10b981"
            href="/lounge"
            delay={0.15}
            stats={[
              { label: 'Members', value: project.crew?.length ?? 0 },
            ]}
            preview={<CrewPreview team={project.crew} />}
          />

          {/* ─ Timeline ─ */}
          <DeptWindow
            title="Timeline"
            tag="Schedule"
            color="#f59e0b"
            href="/projects"
            delay={0.2}
            stats={[
              { label: 'Phase', value: phases[currentPhaseIdx].abbr },
            ]}
            preview={<TimelinePreview endDate={(project as any).end_date} phase={project.status} projectType={project.project_type} />}
          />

        </div>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </main>
  );
}
