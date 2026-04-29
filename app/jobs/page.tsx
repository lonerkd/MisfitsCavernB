'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Plus, DollarSign, Briefcase } from 'lucide-react';
import Link from 'next/link';
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
}

const ROLES = ['Director', 'DP / Cinematographer', 'Editor', 'Sound Designer', 'Colorist', 'Producer', 'Writer', 'Actor', 'PA', 'Other'];

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [newJob, setNewJob] = useState({ title: '', description: '', role: 'Director', rate: '' });

  useEffect(() => {
    loadJobs();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  const loadJobs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('jobs')
        .select('*, projects(title), profiles!jobs_created_by_fkey(username)')
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }
      if (roleFilter) {
        query = query.eq('role', roleFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJob = async () => {
    if (!user || !newJob.title || !newJob.role) return;

    const { error } = await supabase.from('jobs').insert({
      title: newJob.title,
      description: newJob.description,
      role: newJob.role,
      rate: newJob.rate ? parseFloat(newJob.rate) : null,
      created_by: user.id,
      status: 'open'
    });

    if (!error) {
      setNewJob({ title: '', description: '', role: 'Director', rate: '' });
      setShowCreateForm(false);
      loadJobs();
    }
  };

  const handleApply = async (jobId: string) => {
    if (!user) return alert('Sign in to apply');

    const { error } = await supabase.from('job_applications').insert({
      job_id: jobId,
      applicant_id: user.id
    });

    if (error?.code === '23505') {
      alert('Already applied to this position');
    } else if (!error) {
      alert('Application submitted!');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)' }}>
      <header style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: 60,
        background: 'rgba(8, 8, 8, 0.95)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
        padding: '16px 24px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', zIndex: 100
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--fg)', textDecoration: 'none' }}>
          <ArrowLeft size={20} />
          <h1 style={{ fontFamily: 'var(--display)', fontSize: '1.2rem', letterSpacing: 4, margin: 0 }}>JOBS</h1>
        </Link>
        {user && (
          <button onClick={() => setShowCreateForm(!showCreateForm)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
              background: 'var(--accent)', color: 'var(--bg)', border: 'none',
              fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1, cursor: 'pointer' }}>
            <Plus size={12} /> POST JOB
          </button>
        )}
      </header>

      <div style={{ marginTop: 60, padding: 24, maxWidth: 1000, margin: '60px auto 0' }}>
        {/* Search + Filter */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
            <input
              type="text" value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); loadJobs(); }}
              placeholder="Search opportunities..."
              style={{ width: '100%', padding: '10px 12px 10px 36px',
                background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 11 }}
            />
          </div>
          <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); loadJobs(); }}
            style={{ padding: '10px 16px', background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--fg)',
              fontFamily: 'var(--mono)', fontSize: 11, cursor: 'pointer' }}>
            <option value="">All Roles</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Create Job Form */}
        {showCreateForm && (
          <div style={{ padding: 24, background: '#0a0a0a', border: '1px solid var(--accent)', marginBottom: 24 }}>
            <h3 style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 2, marginBottom: 16 }}>POST A JOB</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              <input type="text" placeholder="Job Title" value={newJob.title}
                onChange={e => setNewJob({ ...newJob, title: e.target.value })}
                style={{ padding: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 11 }} />
              <select value={newJob.role} onChange={e => setNewJob({ ...newJob, role: e.target.value })}
                style={{ padding: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 11 }}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <textarea placeholder="Description..." value={newJob.description}
                onChange={e => setNewJob({ ...newJob, description: e.target.value })}
                style={{ padding: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 11, height: 80, resize: 'none' }} />
              <input type="number" placeholder="Rate (optional)" value={newJob.rate}
                onChange={e => setNewJob({ ...newJob, rate: e.target.value })}
                style={{ padding: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 11 }} />
              <button onClick={handleCreateJob}
                style={{ padding: 10, background: 'var(--accent)', color: 'var(--bg)', border: 'none', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 2, cursor: 'pointer' }}>
                POST JOB
              </button>
            </div>
          </div>
        )}

        {/* Jobs List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, opacity: 0.5, fontFamily: 'var(--mono)', fontSize: 11 }}>Loading opportunities...</div>
        ) : jobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, opacity: 0.4 }}>
            <Briefcase size={32} style={{ margin: '0 auto 16px' }} />
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>No open positions right now.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {jobs.map(job => (
              <Link key={job.id} href={`/jobs/${job.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{
                padding: 24, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)',
                transition: 'all 0.2s'
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255, 60, 0, 0.3)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 9, letterSpacing: 2, color: 'var(--accent)', fontFamily: 'var(--mono)', marginBottom: 6 }}>
                      {job.role} {job.projects?.title && `· ${job.projects.title}`}
                    </div>
                    <h3 style={{ fontFamily: 'var(--display)', fontSize: '1.3rem', letterSpacing: 1, margin: 0 }}>{job.title}</h3>
                  </div>
                  {job.rate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)' }}>
                      <DollarSign size={12} /> ${job.rate}/hr
                    </div>
                  )}
                </div>
                {job.description && (
                  <p style={{ fontFamily: 'var(--serif)', fontSize: 13, lineHeight: 1.6, opacity: 0.6, marginBottom: 16 }}>{job.description}</p>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 9, opacity: 0.4 }}>
                    Posted by {job.profiles?.username || 'creator'} · {new Date(job.created_at).toLocaleDateString()}
                  </div>
                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleApply(job.id); }}
                    style={{ padding: '8px 20px', background: 'rgba(255,60,0,0.1)', border: '1px solid var(--accent)',
                      color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, cursor: 'pointer' }}>
                    APPLY
                  </button>
                </div>
              </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
