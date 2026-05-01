'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, DollarSign, Briefcase, X, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import GrainOverlay from '@/components/GrainOverlay';
import { supabase } from '@/lib/supabase/client';

interface Job {
  id: string;
  title: string;
  description: string;
  role: string;
  rate?: number;
  status: 'open' | 'in-progress' | 'closed';
  created_by: string;
  created_at: string;
  projects?: { title: string };
  profiles?: { username: string };
  application_count?: number;
}

const ROLES = [
  'Director', 'DP / Cinematographer', 'Editor', 'Sound Designer',
  'Colorist', 'Producer', 'Writer', 'Actor', 'PA', 'Other',
];

const ROLE_COLORS: Record<string, string> = {
  'Director':            '#ff3c00',
  'DP / Cinematographer':'#f59e0b',
  'Editor':              '#6366f1',
  'Sound Designer':      '#10b981',
  'Colorist':            '#ec4899',
  'Producer':            '#8b5cf6',
  'Writer':              '#3b82f6',
  'Actor':               '#14b8a6',
  'PA':                  '#a3a3a3',
  'Other':               '#737373',
};

function roleColor(role: string) {
  return ROLE_COLORS[role] ?? '#737373';
}

function PostModal({ onClose, onCreated, userId }: {
  onClose: () => void;
  onCreated: () => void;
  userId: string;
}) {
  const [form, setForm] = useState({ title: '', description: '', role: 'Director', rate: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.title || !form.role) return;
    setSubmitting(true);
    const { error } = await supabase.from('jobs').insert({
      title: form.title,
      description: form.description,
      role: form.role,
      rate: form.rate ? parseFloat(form.rate) : null,
      created_by: userId,
      status: 'open',
    });
    setSubmitting(false);
    if (!error) { onCreated(); onClose(); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
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
          background: 'rgba(10,10,10,0.98)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20,
          padding: 32,
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: 3, color: '#8b5cf6', textTransform: 'uppercase', marginBottom: 6 }}>
              Crew Marketplace
            </div>
            <div style={{ fontFamily: 'var(--display)', fontSize: '1.4rem', letterSpacing: 2 }}>
              Post a Position
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(240,236,228,0.3)', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Role selector */}
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 2, color: 'rgba(240,236,228,0.3)', textTransform: 'uppercase', marginBottom: 8 }}>Role</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ROLES.map(r => {
                const active = form.role === r;
                const color = roleColor(r);
                return (
                  <button
                    key={r}
                    onClick={() => setForm(f => ({ ...f, role: r }))}
                    style={{
                      padding: '6px 12px', borderRadius: 9999,
                      background: active ? `${color}18` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${active ? color + '55' : 'rgba(255,255,255,0.06)'}`,
                      color: active ? color : 'rgba(240,236,228,0.4)',
                      fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: 1.5,
                      textTransform: 'uppercase', cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 2, color: 'rgba(240,236,228,0.3)', textTransform: 'uppercase', marginBottom: 8 }}>Position Title</div>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Lead Editor for short film"
              style={{
                width: '100%', padding: '12px 14px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10, color: 'var(--fg)',
                fontFamily: 'var(--mono)', fontSize: 12,
                outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = `${roleColor(form.role)}55`)}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
          </div>

          {/* Description */}
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 2, color: 'rgba(240,236,228,0.3)', textTransform: 'uppercase', marginBottom: 8 }}>Brief</div>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Project context, schedule, what you're looking for…"
              rows={3}
              style={{
                width: '100%', padding: '12px 14px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10, color: 'var(--fg)',
                fontFamily: 'var(--serif)', fontSize: 13,
                outline: 'none', resize: 'none', boxSizing: 'border-box',
                lineHeight: 1.6, transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = `${roleColor(form.role)}55`)}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
          </div>

          {/* Rate */}
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 2, color: 'rgba(240,236,228,0.3)', textTransform: 'uppercase', marginBottom: 8 }}>Hourly Rate (optional)</div>
            <div style={{ position: 'relative' }}>
              <DollarSign size={12} color="rgba(240,236,228,0.25)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="number"
                value={form.rate}
                onChange={e => setForm(f => ({ ...f, rate: e.target.value }))}
                placeholder="0.00"
                style={{
                  width: '100%', padding: '12px 14px 12px 32px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10, color: 'var(--fg)',
                  fontFamily: 'var(--mono)', fontSize: 12,
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!form.title || submitting}
            style={{
              marginTop: 6, padding: '14px',
              background: form.title ? '#8b5cf6' : 'rgba(255,255,255,0.05)',
              color: form.title ? '#fff' : 'rgba(240,236,228,0.3)',
              border: 'none', borderRadius: 12,
              fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2.5,
              textTransform: 'uppercase', fontWeight: 600,
              cursor: form.title ? 'pointer' : 'default',
              transition: 'background 0.3s, box-shadow 0.3s',
              boxShadow: form.title ? '0 6px 20px rgba(139,92,246,0.3)' : 'none',
            }}
          >
            {submitting ? 'Posting…' : 'Post Position'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function JobCard({ job, onApply, index }: { job: Job; onApply: (id: string) => void; index: number }) {
  const [hovered, setHovered] = useState(false);
  const color = roleColor(job.role);
  const daysAgo = Math.floor((Date.now() - new Date(job.created_at).getTime()) / 86400000);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{
        background: 'rgba(10,10,10,0.8)',
        border: `1px solid ${hovered ? color + '33' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 16, padding: '22px 24px',
        position: 'relative', overflow: 'hidden',
        boxShadow: hovered ? `0 16px 48px rgba(0,0,0,0.6), 0 0 28px ${color}10` : '0 2px 8px rgba(0,0,0,0.3)',
        transition: 'border-color 0.3s, box-shadow 0.3s',
      }}
    >
      {/* Corner glow */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: 100, height: 100,
        background: `radial-gradient(circle at top left, ${color}12 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Role + project */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{
              padding: '4px 10px', borderRadius: 9999,
              background: `${color}14`,
              border: `1px solid ${color}33`,
              fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 2,
              color, textTransform: 'uppercase',
            }}>
              {job.role}
            </div>
            {job.projects?.title && (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 1, color: 'rgba(240,236,228,0.25)' }}>
                {job.projects.title}
              </div>
            )}
          </div>

          {/* Title */}
          <div style={{ fontFamily: 'var(--display)', fontSize: '1.15rem', letterSpacing: 2, marginBottom: 8, lineHeight: 1.2 }}>
            {job.title}
          </div>

          {/* Description */}
          {job.description && (
            <div style={{
              fontFamily: 'var(--serif)', fontSize: 13, lineHeight: 1.65,
              color: 'rgba(240,236,228,0.45)',
              display: '-webkit-box', WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical', overflow: 'hidden',
              marginBottom: 16,
            }}>
              {job.description}
            </div>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {job.rate && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--mono)', fontSize: 10, color }}>
                <DollarSign size={10} /> {job.rate}/hr
              </div>
            )}
            <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'rgba(240,236,228,0.25)' }}>
              {job.profiles?.username ?? 'creator'} · {daysAgo === 0 ? 'today' : `${daysAgo}d ago`}
            </div>
          </div>
        </div>

        {/* Apply CTA */}
        <motion.button
          onClick={() => onApply(job.id)}
          animate={{ opacity: hovered ? 1 : 0.5, scale: hovered ? 1 : 0.97 }}
          transition={{ duration: 0.2 }}
          style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 18px', borderRadius: 9999,
            background: `${color}18`,
            border: `1px solid ${color}44`,
            color, cursor: 'pointer',
            fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          Apply <ChevronRight size={10} />
        </motion.button>
      </div>
    </motion.div>
  );
}

function MyJobCard({ job, onClose, index }: { job: Job; onClose: (id: string) => void; index: number }) {
  const color = roleColor(job.role);
  const [closing, setClosing] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      style={{
        background: 'rgba(10,10,10,0.8)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 16, padding: '20px 22px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{
              padding: '3px 9px', borderRadius: 9999,
              background: `${color}14`, border: `1px solid ${color}33`,
              fontFamily: 'var(--mono)', fontSize: 7.5, letterSpacing: 2,
              color, textTransform: 'uppercase',
            }}>
              {job.role}
            </div>
            <div style={{
              padding: '3px 9px', borderRadius: 9999,
              background: job.status === 'open' ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${job.status === 'open' ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.06)'}`,
              fontFamily: 'var(--mono)', fontSize: 7.5, letterSpacing: 2,
              color: job.status === 'open' ? '#10b981' : 'rgba(240,236,228,0.3)',
              textTransform: 'uppercase',
            }}>
              {job.status}
            </div>
            {(job.application_count ?? 0) > 0 && (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'rgba(240,236,228,0.3)' }}>
                {job.application_count} applicant{job.application_count !== 1 ? 's' : ''}
              </div>
            )}
          </div>
          <div style={{ fontFamily: 'var(--display)', fontSize: '1.05rem', letterSpacing: 2 }}>{job.title}</div>
        </div>

        {job.status === 'open' && (
          <button
            onClick={async () => {
              setClosing(true);
              await onClose(job.id);
              setClosing(false);
            }}
            style={{
              padding: '7px 14px', borderRadius: 9999,
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(240,236,228,0.3)',
              fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 1.5,
              textTransform: 'uppercase', cursor: 'pointer',
              transition: 'border-color 0.2s, color 0.2s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.4)';
              (e.currentTarget as HTMLElement).style.color = '#ef4444';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
              (e.currentTarget as HTMLElement).style.color = 'rgba(240,236,228,0.3)';
            }}
          >
            {closing ? 'Closing…' : 'Close'}
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showPost, setShowPost] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [tab, setTab] = useState<'open' | 'mine'>('open');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) loadMyJobs(user.id);
    });
    loadJobs();
  }, []);

  const loadJobs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('jobs')
        .select('*, projects(title), profiles!jobs_created_by_fkey(username)')
        .eq('status', 'open')
        .order('created_at', { ascending: false });
      const { data } = await query;
      setJobs(data || []);
    } finally {
      setLoading(false);
    }
  };

  const loadMyJobs = async (userId: string) => {
    const { data } = await supabase
      .from('jobs')
      .select('*, projects(title), profiles!jobs_created_by_fkey(username)')
      .eq('created_by', userId)
      .order('created_at', { ascending: false });
    if (!data) return;
    const withCounts = await Promise.all(data.map(async job => {
      const { count } = await supabase.from('job_applications').select('id', { count: 'exact', head: true }).eq('job_id', job.id);
      return { ...job, application_count: count || 0 };
    }));
    setMyJobs(withCounts);
  };

  const handleApply = async (jobId: string) => {
    if (!user) { window.location.href = '/auth'; return; }
    const { error } = await supabase.from('job_applications').insert({ job_id: jobId, applicant_id: user.id });
    if (error?.code === '23505') {
      // already applied — silently ignore
    }
  };

  const handleCloseJob = async (jobId: string) => {
    await supabase.from('jobs').update({ status: 'closed' }).eq('id', jobId);
    if (user) loadMyJobs(user.id);
    loadJobs();
  };

  const filtered = jobs.filter(j => {
    const q = search.toLowerCase();
    const matchSearch = !q || j.title.toLowerCase().includes(q) || j.description?.toLowerCase().includes(q);
    const matchRole = !roleFilter || j.role === roleFilter;
    return matchSearch && matchRole;
  });

  const roleCounts = ROLES.reduce<Record<string, number>>((acc, r) => {
    acc[r] = jobs.filter(j => j.role === r).length;
    return acc;
  }, {});

  return (
    <main style={{ background: 'var(--bg)', color: 'var(--fg)', minHeight: '100vh' }}>
      <GrainOverlay />

      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: 58,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', zIndex: 200,
        background: 'rgba(6,6,6,0.92)',
        backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        boxShadow: '0 1px 0 rgba(139,92,246,0.08) inset',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ fontFamily: 'var(--display)', fontSize: '0.9rem', letterSpacing: 6, color: 'var(--fg)', opacity: 0.7, transition: 'opacity 0.2s' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '0.7')}
            >MC</div>
          </Link>
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 3, color: '#8b5cf6', textTransform: 'uppercase' }}>Jobs</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 2,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 9999, padding: '3px 4px',
            }}>
              {(['open', 'mine'] as const).map(t => (
                <motion.button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    position: 'relative', padding: '6px 14px', borderRadius: 9999,
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: 2,
                    textTransform: 'uppercase',
                    color: tab === t ? 'var(--fg)' : 'var(--fg-dim)',
                    transition: 'color 0.2s',
                  }}
                >
                  {tab === t && (
                    <motion.div
                      layoutId="jobs-tab-pill"
                      style={{
                        position: 'absolute', inset: 0, borderRadius: 9999,
                        background: 'rgba(139,92,246,0.14)',
                        border: '1px solid rgba(139,92,246,0.2)',
                        zIndex: -1,
                      }}
                      transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                    />
                  )}
                  {t === 'open' ? 'Open' : `My Jobs${myJobs.length > 0 ? ` · ${myJobs.length}` : ''}`}
                </motion.button>
              ))}
            </div>
          )}

          {user && (
            <button
              onClick={() => setShowPost(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 9999,
                background: '#8b5cf6', color: '#fff', border: 'none',
                fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: 2,
                textTransform: 'uppercase', fontWeight: 600, cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.3s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(139,92,246,0.4)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = '';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              <Plus size={11} strokeWidth={2.5} /> Post Job
            </button>
          )}
        </div>
      </nav>

      <div style={{ paddingTop: 58, display: 'flex', minHeight: 'calc(100vh - 58px)' }}>

        {/* Left sidebar — role filter */}
        <div style={{
          width: 220, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.04)',
          padding: '32px 20px', position: 'sticky', top: 58,
          height: 'calc(100vh - 58px)', overflowY: 'auto',
          background: 'rgba(6,6,6,0.6)',
        }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 3, color: 'rgba(240,236,228,0.25)', textTransform: 'uppercase', marginBottom: 16 }}>
            Filter by Role
          </div>

          <button
            onClick={() => setRoleFilter('')}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              width: '100%', padding: '8px 10px', borderRadius: 8,
              background: !roleFilter ? 'rgba(255,255,255,0.06)' : 'transparent',
              border: 'none', cursor: 'pointer', marginBottom: 4,
              color: !roleFilter ? 'var(--fg)' : 'rgba(240,236,228,0.35)',
              fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1.5,
              textTransform: 'uppercase', textAlign: 'left',
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            All Roles
            <span style={{ fontSize: 8, color: 'rgba(240,236,228,0.25)' }}>{jobs.length}</span>
          </button>

          {ROLES.map(r => {
            const count = roleCounts[r] ?? 0;
            const active = roleFilter === r;
            const color = roleColor(r);
            return (
              <button
                key={r}
                onClick={() => setRoleFilter(active ? '' : r)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  width: '100%', padding: '8px 10px', borderRadius: 8,
                  background: active ? `${color}12` : 'transparent',
                  border: 'none', cursor: 'pointer', marginBottom: 2,
                  color: active ? color : 'rgba(240,236,228,0.35)',
                  fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1.5,
                  textTransform: 'uppercase', textAlign: 'left',
                  transition: 'background 0.2s, color 0.2s',
                }}
                onMouseEnter={e => !active && ((e.currentTarget as HTMLElement).style.color = 'rgba(240,236,228,0.7)')}
                onMouseLeave={e => !active && ((e.currentTarget as HTMLElement).style.color = 'rgba(240,236,228,0.35)')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: active ? color : 'rgba(255,255,255,0.15)', flexShrink: 0, boxShadow: active ? `0 0 6px ${color}` : 'none' }} />
                  {r}
                </div>
                {count > 0 && <span style={{ fontSize: 8, color: active ? color : 'rgba(240,236,228,0.2)' }}>{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, padding: '32px 32px 100px', maxWidth: 800 }}>

          {tab === 'open' && (
            <>
              {/* Search */}
              <div style={{ position: 'relative', marginBottom: 28 }}>
                <Search size={13} color="rgba(240,236,228,0.25)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search positions…"
                  style={{
                    width: '100%', padding: '12px 16px 12px 38px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 12, color: 'var(--fg)',
                    fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 0.5,
                    outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(139,92,246,0.4)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
                />
              </div>

              {loading ? (
                <div style={{ padding: '80px 0', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 3, color: 'rgba(240,236,228,0.2)', textTransform: 'uppercase' }}>
                  Loading positions…
                </div>
              ) : filtered.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ padding: '80px 0', textAlign: 'center' }}
                >
                  <Briefcase size={28} color="rgba(240,236,228,0.1)" style={{ margin: '0 auto 16px', display: 'block' }} />
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 3, color: 'rgba(240,236,228,0.2)', textTransform: 'uppercase', marginBottom: 20 }}>
                    No open positions
                  </div>
                  {user && (
                    <button onClick={() => setShowPost(true)} style={{
                      padding: '10px 22px', borderRadius: 9999,
                      background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)',
                      color: '#8b5cf6', cursor: 'pointer',
                      fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: 2, textTransform: 'uppercase',
                    }}>
                      Post the first one
                    </button>
                  )}
                </motion.div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filtered.map((job, i) => (
                    <JobCard key={job.id} job={job} onApply={handleApply} index={i} />
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'mine' && user && (
            <>
              {myJobs.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ padding: '80px 0', textAlign: 'center' }}
                >
                  <Briefcase size={28} color="rgba(240,236,228,0.1)" style={{ margin: '0 auto 16px', display: 'block' }} />
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 3, color: 'rgba(240,236,228,0.2)', textTransform: 'uppercase', marginBottom: 20 }}>
                    No positions posted yet
                  </div>
                  <button onClick={() => setShowPost(true)} style={{
                    padding: '10px 22px', borderRadius: 9999,
                    background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)',
                    color: '#8b5cf6', cursor: 'pointer',
                    fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: 2, textTransform: 'uppercase',
                  }}>
                    Post your first position
                  </button>
                </motion.div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {myJobs.map((job, i) => (
                    <MyJobCard key={job.id} job={job} onClose={handleCloseJob} index={i} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Post modal */}
      <AnimatePresence>
        {showPost && user && (
          <PostModal
            onClose={() => setShowPost(false)}
            onCreated={() => { loadJobs(); if (user) loadMyJobs(user.id); }}
            userId={user.id}
          />
        )}
      </AnimatePresence>

      <style>{`
        input::placeholder, textarea::placeholder { color: rgba(240,236,228,0.18); }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
      `}</style>
    </main>
  );
}
