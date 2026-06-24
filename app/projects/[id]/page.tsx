'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, Trash2, Edit2, Check, X, ChevronRight,
  FileText, Image, Music, Video, Users, Clock, Calendar, Award,
  Download, Share2, Lock, Unlock,
} from 'lucide-react';
import { useProject } from '@/lib/context/ProjectContext';
import { useToast } from '@/components/Toast';
import GrainOverlay from '@/components/GrainOverlay';
import type { Project, CrewMember, TimelineItem, Beat } from '@/lib/context/ProjectContext';

// ─── Tabs ───────────────────────────────────────────────────────────────────

type TabId = 'screenplay' | 'assets' | 'crew' | 'schedule' | 'showcase' | 'launch';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'screenplay', label: 'Screenplay', icon: <FileText size={14} /> },
  { id: 'assets',     label: 'Assets',     icon: <Image size={14} /> },
  { id: 'crew',       label: 'Crew',       icon: <Users size={14} /> },
  { id: 'schedule',   label: 'Schedule',   icon: <Calendar size={14} /> },
  { id: 'showcase',   label: 'Showcase',   icon: <Award size={14} /> },
  { id: 'launch',     label: 'Launch',     icon: <Share2 size={14} /> },
];

// ─── Screenplay Tab ───────────────────────────────────────────────────────────

function ScreenplayTab({ project }: { project: Project }) {
  const { toast } = useToast();
  const [scripts, setScripts] = useState<any[]>([
    {
      id: '1',
      title: `${project.title} - Draft 1`,
      pages: 133,
      draft: 9,
      lastModified: '2026-06-20',
      status: 'in-progress',
    },
  ]);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.5rem', letterSpacing: 2 }}>Screenplay</h2>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => toast('New script creation coming soon', 'info')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', borderRadius: 8, border: 'none', background: `${project.accent_color || '#ff3c00'}20`,
            color: project.accent_color || '#ff3c00', fontFamily: 'var(--mono)', fontSize: 9,
            letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer',
          }}
        >
          <Plus size={14} /> Add Script
        </motion.button>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {scripts.map(s => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '16px',
              background: 'rgba(255,255,255,0.02)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <h3 style={{ fontFamily: 'var(--display)', fontSize: '0.95rem', marginBottom: 6 }}>{s.title}</h3>
              <div style={{ display: 'flex', gap: 16, fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)' }}>
                <span>{s.pages} pages</span>
                <span>Draft #{s.draft}</span>
                <span>{s.lastModified}</span>
              </div>
            </div>
            <Link href="/editor" style={{ textDecoration: 'none' }}>
              <motion.button
                whileHover={{ scale: 1.06, x: 2 }}
                style={{
                  padding: '8px 14px', borderRadius: 8, border: 'none',
                  background: `${project.accent_color || '#ff3c00'}28`,
                  color: project.accent_color || '#ff3c00',
                  fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 2,
                  textTransform: 'uppercase', cursor: 'pointer',
                }}
              >
                Edit
              </motion.button>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Assets Tab ────────────────────────────────────────────────────────────────

function AssetsTab({ project }: { project: Project }) {
  const { toast } = useToast();
  const [assets, setAssets] = useState<any[]>([
    { id: '1', name: 'Draft 9.fdx', type: 'document', size: '1.2 MB' },
    { id: '2', name: 'Final Cut v3.mov', type: 'video', size: '2.4 GB' },
    { id: '3', name: 'Score_Final.wav', type: 'audio', size: '456 MB' },
    { id: '4', name: 'Poster_Concept.png', type: 'image', size: '12 MB' },
    { id: '5', name: 'Grade_LUT.cube', type: 'document', size: '456 KB' },
  ]);

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video size={14} />;
      case 'audio': return <Music size={14} />;
      case 'image': return <Image size={14} />;
      default: return <FileText size={14} />;
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.5rem', letterSpacing: 2, marginBottom: 8 }}>Assets Library</h2>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-dim)' }}>{assets.length} files • Total: ~4.8 GB</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => toast('File upload feature coming soon', 'info')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', borderRadius: 8, border: 'none', background: `${project.accent_color || '#ff3c00'}20`,
            color: project.accent_color || '#ff3c00', fontFamily: 'var(--mono)', fontSize: 9,
            letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer',
          }}
        >
          <Plus size={14} /> Upload
        </motion.button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {assets.map((asset, i) => (
          <motion.div
            key={asset.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            style={{
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '14px',
              background: 'rgba(255,255,255,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ color: project.accent_color || '#ff3c00' }}>
                {getAssetIcon(asset.type)}
              </div>
              <motion.button
                whileHover={{ scale: 1.15 }}
                onClick={() => {
                  setAssets(a => a.filter(x => x.id !== asset.id));
                  toast(`Deleted ${asset.name}`, 'success');
                }}
                style={{
                  background: 'none', border: 'none', color: 'var(--fg-dim)',
                  cursor: 'pointer', padding: 0,
                }}
              >
                <Trash2 size={12} />
              </motion.button>
            </div>
            <h3 style={{ fontFamily: 'var(--display)', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {asset.name}
            </h3>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 7.5, color: 'var(--fg-dim)' }}>
              {asset.size}
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              style={{
                marginTop: 'auto',
                padding: '6px 10px', borderRadius: 6, border: 'none',
                background: `${project.accent_color || '#ff3c00'}15`,
                color: project.accent_color || '#ff3c00',
                fontFamily: 'var(--mono)', fontSize: 7.5, letterSpacing: 1.5,
                textTransform: 'uppercase', cursor: 'pointer',
              }}
            >
              <Download size={10} style={{ marginRight: 4 }} />
              Download
            </motion.button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Crew Tab ──────────────────────────────────────────────────────────────────

function CrewTab({ project }: { project: Project }) {
  const { toast } = useToast();
  const [crew, setCrew] = useState<CrewMember[]>(project.crew || []);
  const [newMember, setNewMember] = useState({ name: '', role: '' });

  const handleAddMember = () => {
    if (!newMember.name || !newMember.role) {
      toast('Please fill in all fields', 'error');
      return;
    }
    const member: CrewMember = {
      id: Date.now().toString(),
      name: newMember.name,
      role: newMember.role,
      status: 'active',
    };
    setCrew([...crew, member]);
    setNewMember({ name: '', role: '' });
    toast(`Added ${newMember.name}`, 'success');
  };

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.5rem', letterSpacing: 2, marginBottom: 24 }}>Team</h2>

      {/* Add new member form */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          border: '1px dashed rgba(255,255,255,0.1)',
          borderRadius: 12,
          padding: '16px',
          marginBottom: 24,
          background: 'rgba(255,255,255,0.01)',
        }}
      >
        <p style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>Add Team Member</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12 }}>
          <input
            type="text"
            placeholder="Name"
            value={newMember.name}
            onChange={e => setNewMember({ ...newMember, name: e.target.value })}
            style={{
              padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.02)', color: 'var(--fg)',
              fontFamily: 'var(--mono)', fontSize: 9,
            }}
          />
          <input
            type="text"
            placeholder="Role"
            value={newMember.role}
            onChange={e => setNewMember({ ...newMember, role: e.target.value })}
            style={{
              padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.02)', color: 'var(--fg)',
              fontFamily: 'var(--mono)', fontSize: 9,
            }}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleAddMember}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8, border: 'none',
              background: `${project.accent_color || '#ff3c00'}25`,
              color: project.accent_color || '#ff3c00',
              fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 2,
              textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            <Plus size={12} /> Add
          </motion.button>
        </div>
      </motion.div>

      {/* Crew list */}
      <div style={{ display: 'grid', gap: 12 }}>
        {crew.map((member, i) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            style={{
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '14px',
              background: 'rgba(255,255,255,0.02)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <h3 style={{ fontFamily: 'var(--display)', fontSize: '0.95rem', marginBottom: 4 }}>{member.name}</h3>
              <p style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: 1 }}>{member.role}</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              onClick={() => {
                setCrew(c => c.filter(x => x.id !== member.id));
                toast(`Removed ${member.name}`, 'success');
              }}
              style={{
                background: 'none', border: 'none', color: 'var(--fg-dim)',
                cursor: 'pointer', padding: 0,
              }}
            >
              <Trash2 size={14} />
            </motion.button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Schedule Tab ───────────────────────────────────────────────────────────────

function ScheduleTab({ project }: { project: Project }) {
  const { toast } = useToast();
  const [milestones, setMilestones] = useState<TimelineItem[]>(project.timeline_items || [
    { id: '1', phase: 'development', title: 'Script Lock', description: '', start_date: '2026-04-15', end_date: '2026-04-20', completion: 100 },
    { id: '2', phase: 'pre-production', title: 'Cast Confirmed', description: '', start_date: '2026-05-01', end_date: '2026-05-15', completion: 100 },
    { id: '3', phase: 'production', title: 'Principal Shoot', description: '', start_date: '2026-06-01', end_date: '2026-06-20', completion: 75 },
    { id: '4', phase: 'post-production', title: 'Picture Lock', description: '', start_date: '2026-06-25', end_date: '2026-06-29', completion: 0 },
    { id: '5', phase: 'delivery', title: 'Final Delivery', description: '', start_date: '2026-06-30', end_date: '2026-06-30', completion: 0 },
  ]);

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.5rem', letterSpacing: 2, marginBottom: 24 }}>Production Schedule</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {milestones.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            style={{
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '16px',
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--display)', fontSize: '1rem', marginBottom: 4 }}>{m.title}</h3>
                <p style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: 1 }}>{m.phase}</p>
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: project.accent_color || '#ff3c00', fontWeight: 700 }}>
                {m.completion}%
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', marginBottom: 12 }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${m.completion}%` }}
                transition={{ duration: 0.8, delay: i * 0.05 + 0.2 }}
                style={{
                  height: '100%',
                  background: project.accent_color || '#ff3c00',
                  borderRadius: 2,
                }}
              />
            </div>

            {/* Dates */}
            <div style={{ display: 'flex', gap: 16, fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)' }}>
              <span>Start: {new Date(m.start_date).toLocaleDateString()}</span>
              <span>End: {new Date(m.end_date).toLocaleDateString()}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Showcase Tab ───────────────────────────────────────────────────────────────

function ShowcaseTab({ project }: { project: Project }) {
  const { toast } = useToast();
  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.5rem', letterSpacing: 2 }}>Showcase</h2>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => toast('Portfolio management coming soon', 'info')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', borderRadius: 8, border: 'none', background: `${project.accent_color || '#ff3c00'}20`,
            color: project.accent_color || '#ff3c00', fontFamily: 'var(--mono)', fontSize: 9,
            letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer',
          }}
        >
          <Plus size={14} /> Add Work
        </motion.button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          border: '2px dashed rgba(255,255,255,0.1)',
          borderRadius: 16,
          padding: '48px 24px',
          textAlign: 'center',
          background: 'rgba(255,255,255,0.01)',
        }}
      >
        <Award size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
        <p style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-dim)', letterSpacing: 1.5, textTransform: 'uppercase' }}>
          No portfolio items yet
        </p>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)', marginTop: 8, opacity: 0.6 }}>
          Add finished works, stills, teasers, and clips to showcase this project
        </p>
      </motion.div>
    </div>
  );
}

// ─── Launch Tab ──────────────────────────────────────────────────────────────────

function LaunchTab({ project }: { project: Project }) {
  const { toast } = useToast();
  const [festivals, setFestivals] = useState([
    { id: '1', name: 'Sundance', status: 'submitted', deadline: '2026-08-15' },
    { id: '2', name: 'TIFF', status: 'draft', deadline: '2026-09-01' },
    { id: '3', name: 'Berlin', status: 'pending', deadline: '2026-10-15' },
  ]);

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.5rem', letterSpacing: 2, marginBottom: 24 }}>Launch Strategy</h2>

      {/* Festival submissions */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'var(--display)', fontSize: '1.1rem' }}>Festival Submissions</h3>
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={() => toast('Festival manager coming soon', 'info')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 8, border: 'none',
              background: `${project.accent_color || '#ff3c00'}20`,
              color: project.accent_color || '#ff3c00',
              fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 1.5,
              textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            <Plus size={12} /> Add
          </motion.button>
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          {festivals.map(f => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10,
                padding: '12px 14px',
                background: 'rgba(255,255,255,0.02)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h4 style={{ fontFamily: 'var(--display)', fontSize: '0.9rem', marginBottom: 2 }}>{f.name}</h4>
                <p style={{ fontFamily: 'var(--mono)', fontSize: 7.5, color: 'var(--fg-dim)' }}>Deadline: {new Date(f.deadline).toLocaleDateString()}</p>
              </div>
              <span
                style={{
                  fontFamily: 'var(--mono)', fontSize: 7.5, letterSpacing: 1, textTransform: 'uppercase',
                  padding: '4px 10px', borderRadius: 6,
                  background: f.status === 'submitted' ? 'rgba(16,185,129,0.2)' : f.status === 'draft' ? 'rgba(245,158,11,0.2)' : 'rgba(107,114,128,0.2)',
                  color: f.status === 'submitted' ? '#10b981' : f.status === 'draft' ? '#f59e0b' : '#6b7280',
                }}
              >
                {f.status}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Other launch components */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {[
          { title: 'Press Kit', status: 'draft', icon: <FileText size={20} /> },
          { title: 'Trailer Cut', status: 'in-progress', icon: <Video size={20} /> },
          { title: 'Streaming Pitch', status: 'in-progress', icon: <Share2 size={20} /> },
        ].map(item => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '16px',
              background: 'rgba(255,255,255,0.02)',
              textAlign: 'center',
            }}
          >
            <div style={{ color: project.accent_color || '#ff3c00', marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
              {item.icon}
            </div>
            <h4 style={{ fontFamily: 'var(--display)', fontSize: '0.9rem', marginBottom: 8 }}>{item.title}</h4>
            <span
              style={{
                fontFamily: 'var(--mono)', fontSize: 7, letterSpacing: 1, textTransform: 'uppercase',
                padding: '4px 8px', borderRadius: 4,
                background: item.status === 'draft' ? 'rgba(245,158,11,0.2)' : 'rgba(99,102,241,0.2)',
                color: item.status === 'draft' ? '#f59e0b' : '#6366f1',
              }}
            >
              {item.status}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { activeProject, projects, setActiveProject } = useProject();
  const [currentTab, setCurrentTab] = useState<TabId>('screenplay');

  const project = projects.find(p => p.id === params.id) || activeProject;

  useEffect(() => {
    if (project && setActiveProject) {
      setActiveProject(project);
    }
  }, [project, setActiveProject]);

  if (!project) {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--mono)', color: 'var(--fg-dim)' }}>Project not found</p>
          <Link href="/projects" style={{ color: '#ff3c00', textDecoration: 'none', marginTop: 16, display: 'inline-block' }}>
            Back to Projects
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', overflow: 'hidden' }}>
      <GrainOverlay />

      {/* Ambient project glow */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: '50vh', pointerEvents: 'none', zIndex: 0,
        background: `radial-gradient(ellipse at 50% -20%, ${project.accent_color}0a 0%, transparent 65%)`,
      }} />

      {/* ── Header ── */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: 'rgba(6,6,6,0.95)', backdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          padding: '16px 28px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <Link href="/projects" style={{ color: 'var(--fg-dim)', display: 'flex', cursor: 'pointer' }}>
            <ArrowLeft size={16} />
          </Link>
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.07)' }} />
          <div>
            <h1 style={{ fontFamily: 'var(--display)', fontSize: '1.2rem', letterSpacing: 3 }}>{project.title}</h1>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4 }}>
              {project.type || 'Project'}
            </p>
          </div>
        </div>

        {/* Tab navigation */}
        <div style={{ display: 'flex', gap: 2, overflowX: 'auto', paddingBottom: 8 }}>
          {TABS.map(tab => (
            <motion.button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              whileHover={{ y: -2 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8, border: 'none',
                background: currentTab === tab.id ? `${project.accent_color}25` : 'transparent',
                color: currentTab === tab.id ? project.accent_color : 'var(--fg-dim)',
                fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: 1.5, textTransform: 'uppercase',
                cursor: 'pointer', transition: 'all 0.2s',
                borderBottom: currentTab === tab.id ? `2px solid ${project.accent_color}` : '2px solid transparent',
              }}
            >
              {tab.icon}
              {tab.label}
            </motion.button>
          ))}
        </div>
      </motion.header>

      {/* ── Content ── */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <AnimatePresence mode="wait">
          {currentTab === 'screenplay' && (
            <motion.div key="screenplay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ScreenplayTab project={project} />
            </motion.div>
          )}
          {currentTab === 'assets' && (
            <motion.div key="assets" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AssetsTab project={project} />
            </motion.div>
          )}
          {currentTab === 'crew' && (
            <motion.div key="crew" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <CrewTab project={project} />
            </motion.div>
          )}
          {currentTab === 'schedule' && (
            <motion.div key="schedule" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ScheduleTab project={project} />
            </motion.div>
          )}
          {currentTab === 'showcase' && (
            <motion.div key="showcase" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ShowcaseTab project={project} />
            </motion.div>
          )}
          {currentTab === 'launch' && (
            <motion.div key="launch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LaunchTab project={project} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
