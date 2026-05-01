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

// ─── Project data (mirrors /projects/page.tsx — in production this would come from Supabase) ──

const PROJECTS: Project[] = [
  {
    id: '1',
    title: 'Femme Fatale',
    type: 'Limited Series',
    phase: 'pre-production',
    progress: 85,
    deadline: '2026-06-30',
    description: 'Political noir limited series. 133-page screenplay submitted to A24 and Proximity Media.',
    color: '#ff3c00',
    scriptPages: 133,
    scriptDraft: 9,
    assetCount: 24,
    assetGB: 4.8,
    publishedWork: 1,
    team: [
      { name: 'Peter Olowude', role: 'Director/Writer', online: true },
      { name: 'Creative Team', role: 'Development', online: true },
      { name: 'Production', role: 'Logistics' },
    ],
  },
  {
    id: '2',
    title: '10 Million',
    type: 'Music Video',
    phase: 'post-production',
    progress: 95,
    deadline: '2026-05-15',
    description: 'High-energy visual rhythm. Final color grade and mix in progress.',
    color: '#f59e0b',
    scriptPages: 12,
    scriptDraft: 3,
    assetCount: 18,
    assetGB: 11.3,
    publishedWork: 0,
    team: [
      { name: 'Peter Olowude', role: 'Director', online: true },
      { name: 'Editor', role: 'Post-Production' },
    ],
  },
  {
    id: '3',
    title: 'The Briefcase',
    type: 'Short Film',
    phase: 'delivery',
    progress: 100,
    deadline: '2024-12-01',
    description: 'Crime thriller about two couriers and a deal that has to go right.',
    color: '#10b981',
    scriptPages: 18,
    scriptDraft: 5,
    assetCount: 31,
    assetGB: 22.6,
    publishedWork: 3,
    team: [
      { name: 'Peter Olowude', role: 'Director/Writer' },
      { name: 'Cast & Crew', role: 'Full Production' },
    ],
  },
];

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

function ScriptPreview({ pages, draft }: { pages: number; draft: number }) {
  const lines = [
    { type: 'slug',     text: 'INT. MINISTER\'S OFFICE — NIGHT' },
    { type: 'action',   text: 'Power hasn\'t changed hands here in thirty years. The furniture knows it.' },
    { type: 'char',     text: 'SENATOR VALE' },
    { type: 'dialogue', text: 'This isn\'t about loyalty. This is about survival.' },
    { type: 'action',   text: 'She turns away. Looks out at the city.' },
    { type: 'char',     text: 'MARA' },
    { type: 'dialogue', text: 'Those stopped being different things for me a long time ago.' },
  ];
  return (
    <div style={{ padding: '14px 16px', fontFamily: 'Courier New, monospace', fontSize: 10, lineHeight: 1.75 }}>
      {lines.map((l, i) => (
        <div key={i} style={{
          color: l.type === 'slug' ? 'rgba(240,236,228,0.9)' : l.type === 'char' ? '#ffaa00' : 'rgba(240,236,228,0.5)',
          fontWeight: l.type === 'slug' || l.type === 'char' ? 700 : 400,
          textTransform: l.type === 'slug' || l.type === 'char' ? 'uppercase' : 'none',
          paddingLeft: l.type === 'dialogue' ? '28%' : l.type === 'char' ? '38%' : 0,
          marginTop: (l.type === 'slug' && i > 0) ? 12 : 0,
        }}>{l.text}</div>
      ))}
    </div>
  );
}

// ─── Asset preview ───────────────────────────────────────────────────────────

function AssetPreview({ count, gb }: { count: number; gb: number }) {
  const items = [
    { name: 'Draft 9.fdx',         type: 'document', color: '#f59e0b' },
    { name: 'Final Cut v3.mov',     type: 'video',    color: '#ff3c00' },
    { name: 'Score_Final.wav',      type: 'audio',    color: '#10b981' },
    { name: 'Poster_Concept.png',   type: 'image',    color: '#6366f1' },
    { name: 'Grade_LUT.cube',       type: 'document', color: '#8b5cf6' },
    { name: 'BRoll_EXT_NIGHT.mp4',  type: 'video',    color: '#ff3c00' },
  ];
  return (
    <div style={{ padding: '10px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
      {items.map((item, i) => (
        <div key={i} style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 8, padding: '8px 10px',
          display: 'flex', alignItems: 'center', gap: 7,
        }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'rgba(240,236,228,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
        </div>
      ))}
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
  const daysLeft = Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000));
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
  const params = useParams();
  const router = useRouter();
  const project = PROJECTS.find(p => p.id === params.id);

  useEffect(() => {
    if (!project) router.push('/projects');
  }, [project, router]);

  if (!project) return null;

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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>

          {/* ─ ScriptOS ─ */}
          <DeptWindow
            title="ScriptOS"
            tag="Screenplay"
            color="#ff3c00"
            href="/editor"
            delay={0.05}
            stats={[
              { label: 'Pages', value: project.scriptPages ?? 0 },
              { label: `Draft`, value: `#${project.scriptDraft ?? 1}` },
            ]}
            preview={<ScriptPreview pages={project.scriptPages ?? 0} draft={project.scriptDraft ?? 1} />}
          />

          {/* ─ Studio ─ */}
          <DeptWindow
            title="Studio"
            tag="Assets"
            color="#6366f1"
            href="/studio"
            delay={0.1}
            stats={[
              { label: 'Files',  value: project.assetCount ?? 0 },
              { label: 'GB',     value: project.assetGB ?? 0 },
            ]}
            preview={<AssetPreview count={project.assetCount ?? 0} gb={project.assetGB ?? 0} />}
          />

          {/* ─ Lounge / Crew ─ */}
          <DeptWindow
            title="Lounge"
            tag="Crew"
            color="#10b981"
            href="/lounge"
            delay={0.15}
            stats={[
              { label: 'Members', value: project.team.length },
              { label: 'Online',  value: onlineCount },
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
              { label: 'Progress', value: `${project.progress}%` },
              { label: 'Deadline', value: new Date(project.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) },
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
              { label: 'Published', value: project.publishedWork ?? 0 },
              { label: 'Type',      value: project.type },
            ]}
            preview={<PortfolioPreview published={project.publishedWork ?? 0} />}
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
                  { label: 'Festival Submissions', value: '3 pending', color: '#ec4899' },
                  { label: 'Press Kit',            value: 'Draft',     color: '#f59e0b' },
                  { label: 'Trailer Cut',          value: currentPhaseIdx >= 3 ? 'Ready' : 'Not yet', color: currentPhaseIdx >= 3 ? '#10b981' : '#4b5563' },
                  { label: 'Streaming Pitch',      value: 'In prep',   color: '#6366f1' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-dim)' }}>{label}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color, background: `${color}12`, padding: '2px 8px', borderRadius: 4 }}>{value}</span>
                  </div>
                ))}
              </div>
            }
          />

        </div>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </main>
  );
}
