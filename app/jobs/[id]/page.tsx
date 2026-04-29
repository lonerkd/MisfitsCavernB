'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, DollarSign, CheckCircle, XCircle, Clock, User } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
  project_id?: string;
  profiles?: { username: string; role: string };
  projects?: { title: string };
}

interface Application {
  id: string;
  job_id: string;
  applicant_id: string;
  cover_note?: string;
  status: 'pending' | 'accepted' | 'rejected';
  applied_at: string;
  profiles?: { username: string; role: string; avatar_url?: string };
}

const statusBadgeStyle = (status: string): React.CSSProperties => {
  const base: React.CSSProperties = {
    fontFamily: 'var(--mono)',
    fontSize: 9,
    letterSpacing: 2,
    padding: '3px 8px',
    textTransform: 'uppercase' as const,
    border: '1px solid',
  };
  switch (status) {
    case 'open':
      return { ...base, color: '#22c55e', borderColor: '#22c55e', background: 'rgba(34,197,94,0.08)' };
    case 'in-progress':
      return { ...base, color: '#facc15', borderColor: '#facc15', background: 'rgba(250,204,21,0.08)' };
    case 'closed':
      return { ...base, color: 'rgba(240,236,228,0.4)', borderColor: 'rgba(240,236,228,0.2)', background: 'transparent' };
    default:
      return { ...base, color: 'rgba(240,236,228,0.4)', borderColor: 'rgba(240,236,228,0.2)', background: 'transparent' };
  }
};

const appStatusStyle = (status: 'pending' | 'accepted' | 'rejected'): React.CSSProperties => {
  switch (status) {
    case 'accepted':
      return { border: '1px solid #22c55e' };
    case 'rejected':
      return { border: '1px solid rgba(255,255,255,0.06)', opacity: 0.45 };
    default:
      return { border: '1px solid rgba(255,255,255,0.06)' };
  }
};

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params?.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Creator view
  const [applications, setApplications] = useState<Application[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);

  // Applicant view
  const [coverNote, setCoverNote] = useState('');
  const [applying, setApplying] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [applyError, setApplyError] = useState('');

  const isCreator = user && job && user.id === job.created_by;

  const loadJob = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*, profiles!jobs_created_by_fkey(username, role), projects(title)')
        .eq('id', jobId)
        .single();
      if (error) throw error;
      setJob(data);
    } catch (err) {
      console.error('Error loading job:', err);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  const loadApplications = useCallback(async () => {
    if (!jobId) return;
    setAppsLoading(true);
    try {
      const { data, error } = await supabase
        .from('job_applications')
        .select('*, profiles(username, role, avatar_url)')
        .eq('job_id', jobId)
        .order('applied_at', { ascending: false });
      if (error) throw error;
      setApplications(data || []);
    } catch (err) {
      console.error('Error loading applications:', err);
    } finally {
      setAppsLoading(false);
    }
  }, [jobId]);

  const checkAlreadyApplied = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('job_applications')
      .select('id')
      .eq('job_id', jobId)
      .eq('applicant_id', userId)
      .maybeSingle();
    setAlreadyApplied(!!data);
  }, [jobId]);

  useEffect(() => {
    loadJob();
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u);
      if (u) checkAlreadyApplied(u.id);
    });
  }, [loadJob, checkAlreadyApplied]);

  useEffect(() => {
    if (isCreator) loadApplications();
  }, [isCreator, loadApplications]);

  const handleApply = async () => {
    if (!user || !job) return;
    setApplying(true);
    setApplyError('');
    try {
      const { error } = await supabase.from('job_applications').insert({
        job_id: job.id,
        applicant_id: user.id,
        cover_note: coverNote.trim() || null,
        status: 'pending',
      });
      if (error) {
        if (error.code === '23505') {
          setAlreadyApplied(true);
        } else {
          setApplyError(error.message);
        }
      } else {
        setAlreadyApplied(true);
        setCoverNote('');
      }
    } finally {
      setApplying(false);
    }
  };

  const handleApplicationStatus = async (appId: string, newStatus: 'accepted' | 'rejected') => {
    const { error } = await supabase
      .from('job_applications')
      .update({ status: newStatus })
      .eq('id', appId);
    if (!error) {
      setApplications(prev =>
        prev.map(a => a.id === appId ? { ...a, status: newStatus } : a)
      );
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, opacity: 0.4, letterSpacing: 2 }}>LOADING...</span>
      </div>
    );
  }

  if (!job) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <span style={{ fontFamily: 'var(--display)', fontSize: '2rem', letterSpacing: 4 }}>JOB NOT FOUND</span>
        <Link href="/jobs" style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent)', textDecoration: 'none', letterSpacing: 2 }}>← BACK TO JOBS</Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)' }}>

      {/* Fixed Header */}
      <header style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: 60,
        background: 'rgba(8, 8, 8, 0.95)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', zIndex: 100, boxSizing: 'border-box',
      }}>
        <Link href="/jobs" style={{
          display: 'flex', alignItems: 'center', gap: 10,
          color: 'var(--fg)', textDecoration: 'none', opacity: 0.7,
          transition: 'opacity 0.15s',
        }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
        >
          <ArrowLeft size={16} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 2 }}>JOBS</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden', maxWidth: '60%' }}>
          <span style={{
            fontFamily: 'var(--display)', fontSize: '1rem', letterSpacing: 2,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {job.title}
          </span>
          <span style={statusBadgeStyle(job.status)}>{job.status}</span>
        </div>

        <div style={{ width: 80 }} />
      </header>

      {/* Main Content */}
      <main style={{ marginTop: 60, padding: '48px 24px 80px', maxWidth: 720, margin: '60px auto 0' }}>

        {/* Job Header */}
        <div style={{ marginBottom: 40 }}>
          {/* Role badge */}
          <div style={{ marginBottom: 14 }}>
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 3,
              color: 'var(--accent)', textTransform: 'uppercase',
              borderBottom: '1px solid var(--accent)', paddingBottom: 2,
            }}>
              {job.role}
            </span>
            {job.projects?.title && (
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, opacity: 0.4, marginLeft: 12 }}>
                · {job.projects.title}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 style={{
            fontFamily: 'var(--display)', fontSize: 'clamp(2rem, 6vw, 3.5rem)',
            letterSpacing: 4, lineHeight: 1, margin: '0 0 20px',
          }}>
            {job.title}
          </h1>

          {/* Meta row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            {job.rate && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)' }}>
                <DollarSign size={12} />
                <span>${job.rate}/hr</span>
              </div>
            )}
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, opacity: 0.4, letterSpacing: 1 }}>
              Posted by{' '}
              <span style={{ opacity: 1, color: 'var(--fg)' }}>
                {job.profiles?.username || 'unknown'}
              </span>
              {job.profiles?.role && (
                <span style={{ opacity: 0.6 }}> · {job.profiles.role}</span>
              )}
              {'  ·  '}
              {new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginBottom: 40 }} />

        {/* Description */}
        {job.description && (
          <div style={{ marginBottom: 48 }}>
            <p style={{
              fontFamily: 'var(--serif)', fontSize: '1.15rem', lineHeight: 1.75,
              opacity: 0.85, margin: 0, whiteSpace: 'pre-wrap',
            }}>
              {job.description}
            </p>
          </div>
        )}

        {/* Divider */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginBottom: 40 }} />

        {/* ─── CREATOR VIEW: Applications Panel ─── */}
        {isCreator && (
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.6rem', letterSpacing: 4, margin: 0 }}>
                APPLICATIONS
              </h2>
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1,
                color: 'var(--accent)', border: '1px solid var(--accent)',
                padding: '2px 8px',
              }}>
                {applications.length}
              </span>
            </div>

            {appsLoading ? (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, opacity: 0.4, letterSpacing: 2 }}>LOADING...</div>
            ) : applications.length === 0 ? (
              <div style={{
                padding: 40, textAlign: 'center',
                border: '1px dashed rgba(255,255,255,0.08)',
                fontFamily: 'var(--mono)', fontSize: 10, opacity: 0.4, letterSpacing: 2,
              }}>
                NO APPLICATIONS YET
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 16 }}>
                {applications.map(app => (
                  <div key={app.id} style={{
                    padding: 24,
                    background: '#0a0a0a',
                    ...appStatusStyle(app.status),
                    transition: 'border-color 0.2s',
                    textDecoration: app.status === 'rejected' ? 'none' : 'none',
                  }}>
                    {/* Applicant header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32,
                          background: 'rgba(255,60,0,0.15)',
                          border: '1px solid rgba(255,60,0,0.3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          {app.profiles?.avatar_url ? (
                            <img src={app.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <User size={14} style={{ color: 'var(--accent)', opacity: 0.6 }} />
                          )}
                        </div>
                        <div>
                          <div style={{
                            fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1,
                            textDecoration: app.status === 'rejected' ? 'line-through' : 'none',
                            opacity: app.status === 'rejected' ? 0.5 : 1,
                          }}>
                            {app.profiles?.username || 'unknown'}
                          </div>
                          {app.profiles?.role && (
                            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, opacity: 0.4, letterSpacing: 1, marginTop: 2 }}>
                              {app.profiles.role}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {app.status === 'pending' && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, opacity: 0.4 }}>
                            <Clock size={10} /> PENDING
                          </span>
                        )}
                        {app.status === 'accepted' && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, color: '#22c55e' }}>
                            <CheckCircle size={10} /> ACCEPTED
                          </span>
                        )}
                        {app.status === 'rejected' && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, color: 'rgba(240,236,228,0.3)' }}>
                            <XCircle size={10} /> REJECTED
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Applied at */}
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, opacity: 0.3, letterSpacing: 1, marginBottom: app.cover_note ? 16 : 0 }}>
                      Applied {new Date(app.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>

                    {/* Cover note */}
                    {app.cover_note && (
                      <div style={{
                        marginTop: 12, padding: '12px 16px',
                        background: 'rgba(255,255,255,0.03)',
                        borderLeft: '2px solid rgba(255,60,0,0.3)',
                      }}>
                        <p style={{
                          fontFamily: 'var(--serif)', fontSize: '1rem', lineHeight: 1.65,
                          opacity: app.status === 'rejected' ? 0.4 : 0.75,
                          margin: 0, whiteSpace: 'pre-wrap',
                        }}>
                          {app.cover_note}
                        </p>
                      </div>
                    )}

                    {/* Action buttons */}
                    {app.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                        <button
                          onClick={() => handleApplicationStatus(app.id, 'accepted')}
                          style={{
                            padding: '7px 18px',
                            background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e',
                            color: '#22c55e', fontFamily: 'var(--mono)', fontSize: 9,
                            letterSpacing: 2, cursor: 'pointer', transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(34,197,94,0.2)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(34,197,94,0.1)')}
                        >
                          ACCEPT
                        </button>
                        <button
                          onClick={() => handleApplicationStatus(app.id, 'rejected')}
                          style={{
                            padding: '7px 18px',
                            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.15)',
                            color: 'rgba(240,236,228,0.5)', fontFamily: 'var(--mono)', fontSize: 9,
                            letterSpacing: 2, cursor: 'pointer', transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = 'rgba(255,60,0,0.5)';
                            e.currentTarget.style.color = 'rgba(255,60,0,0.8)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                            e.currentTarget.style.color = 'rgba(240,236,228,0.5)';
                          }}
                        >
                          REJECT
                        </button>
                      </div>
                    )}

                    {/* Re-action buttons for accepted/rejected */}
                    {app.status !== 'pending' && (
                      <button
                        onClick={() => handleApplicationStatus(app.id, app.status === 'accepted' ? 'rejected' : 'accepted')}
                        style={{
                          marginTop: 16,
                          padding: '6px 14px',
                          background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                          color: 'rgba(240,236,228,0.3)', fontFamily: 'var(--mono)', fontSize: 9,
                          letterSpacing: 2, cursor: 'pointer', transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.color = 'rgba(240,236,228,0.7)';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.color = 'rgba(240,236,228,0.3)';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                        }}
                      >
                        {app.status === 'accepted' ? 'MARK REJECTED' : 'MARK ACCEPTED'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ─── NON-CREATOR VIEW: Apply Section ─── */}
        {!isCreator && (
          <section>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.6rem', letterSpacing: 4, margin: '0 0 24px' }}>
              APPLY
            </h2>

            {/* Not signed in */}
            {!user && (
              <div style={{
                padding: 32, border: '1px solid rgba(255,255,255,0.08)',
                textAlign: 'center',
              }}>
                <p style={{ fontFamily: 'var(--mono)', fontSize: 11, opacity: 0.5, margin: '0 0 16px', letterSpacing: 1 }}>
                  You need to be signed in to apply.
                </p>
                <Link href="/auth" style={{
                  display: 'inline-block', padding: '10px 28px',
                  background: 'var(--accent)', color: 'var(--bg)',
                  fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 2, textDecoration: 'none',
                }}>
                  SIGN IN
                </Link>
              </div>
            )}

            {/* Already applied */}
            {user && alreadyApplied && (
              <div style={{
                padding: 32, border: '1px solid #22c55e',
                background: 'rgba(34,197,94,0.05)',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <CheckCircle size={20} style={{ color: '#22c55e', flexShrink: 0 }} />
                <div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2, color: '#22c55e', marginBottom: 4 }}>
                    APPLICATION SUBMITTED
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, opacity: 0.45, letterSpacing: 1 }}>
                    The creator will review your application and get back to you.
                  </div>
                </div>
              </div>
            )}

            {/* Apply form */}
            {user && !alreadyApplied && (
              <div style={{ display: 'grid', gap: 16 }}>
                <div>
                  <label style={{
                    display: 'block', fontFamily: 'var(--mono)', fontSize: 9,
                    letterSpacing: 2, opacity: 0.5, marginBottom: 8,
                  }}>
                    COVER NOTE <span style={{ opacity: 0.5 }}>(optional)</span>
                  </label>
                  <textarea
                    value={coverNote}
                    onChange={e => setCoverNote(e.target.value)}
                    placeholder="Tell the creator why you're the right fit..."
                    rows={6}
                    style={{
                      width: '100%', padding: 16,
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                      color: 'var(--fg)', fontFamily: 'var(--serif)', fontSize: '1rem',
                      lineHeight: 1.65, resize: 'vertical', outline: 'none',
                      transition: 'border-color 0.15s', boxSizing: 'border-box',
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,60,0,0.4)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                </div>

                {applyError && (
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent)', opacity: 0.8 }}>
                    {applyError}
                  </div>
                )}

                <button
                  onClick={handleApply}
                  disabled={applying}
                  style={{
                    alignSelf: 'flex-start',
                    padding: '12px 36px',
                    background: applying ? 'rgba(255,60,0,0.3)' : 'var(--accent)',
                    color: 'var(--bg)', border: 'none',
                    fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 3,
                    cursor: applying ? 'not-allowed' : 'pointer',
                    transition: 'background 0.15s, opacity 0.15s',
                    opacity: applying ? 0.7 : 1,
                  }}
                  onMouseEnter={e => { if (!applying) e.currentTarget.style.opacity = '0.85'; }}
                  onMouseLeave={e => { if (!applying) e.currentTarget.style.opacity = '1'; }}
                >
                  {applying ? 'SUBMITTING...' : 'APPLY'}
                </button>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
