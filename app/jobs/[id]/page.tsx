'use client';

import React, { useState, useEffect, useEffectEvent } from 'react';
import { ArrowLeft, DollarSign, CheckCircle, XCircle, Clock, User } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Textarea } from '@/components/ui/Textarea';
import { notify } from '@/lib/supabase/notifications';
import { useToast } from '@/components/Toast';
import { applyToJob, getJob, hasApplied, listApplications, respondToApplication, type JobApplication as Application, type JobWithRelations as Job } from '@/lib/supabase/jobs';
import Avatar from '@/components/Avatar';
import { awaitOSUser } from '@/lib/os';

const statusBadgeStyle = (status: string): React.CSSProperties => {
  const base: React.CSSProperties = {
    fontFamily: 'var(--mono)',
    fontSize: 'max(9px, var(--mc-min-font, 0px))',
    letterSpacing: 2,
    padding: '3px 8px',
    textTransform: 'uppercase' as const,
    border: '1px solid',
  };
  switch (status) {
    case 'open':
      return { ...base, color: 'var(--ok)', borderColor: '#22c55e', background: 'rgba(34,197,94,0.08)' };
    case 'in-progress':
      return { ...base, color: 'var(--warn)', borderColor: '#facc15', background: 'rgba(250,204,21,0.08)' };
    case 'closed':
      return { ...base, color: 'var(--fg-dim)', borderColor: 'rgba(var(--fg-rgb), 0.2)', background: 'transparent' };
    default:
      return { ...base, color: 'var(--fg-dim)', borderColor: 'rgba(var(--fg-rgb), 0.2)', background: 'transparent' };
  }
};

const appStatusStyle = (status: 'pending' | 'accepted' | 'rejected'): React.CSSProperties => {
  switch (status) {
    case 'accepted':
      return { border: '1px solid #22c55e' };
    case 'rejected':
      return { border: '1px solid rgba(var(--ink-rgb), 0.06)', opacity: 0.45 };
    default:
      return { border: '1px solid rgba(var(--ink-rgb), 0.06)' };
  }
};

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params?.id as string;
  const { toast } = useToast();

  const [job, setJob] = useState<Job | null>(null);
  const [user, setUser] = useState<any>(null);
  // Which job the page (and its applications) last finished loading for.
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const loading = loadedFor !== jobId;

  const [applications, setApplications] = useState<Application[]>([]);
  const [appsFor, setAppsFor] = useState<string | null>(null);

  const [coverNote, setCoverNote] = useState('');
  const [applying, setApplying] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [applyError, setApplyError] = useState('');
  const [closeWhenFilled, setCloseWhenFilled] = useState(true);

  const isCreator = user && job && user.id === job.created_by;

  const appsLoading = !!isCreator && appsFor !== jobId;

  const reportError = useEffectEvent((message: string) => toast(message, 'error'));

  useEffect(() => {
    if (!jobId) return;
    let alive = true;
    const loadJob = async () => {
      try {
        const found = await getJob(jobId);
        if (alive) setJob(found);
      } catch (err) {
        console.error('Error loading job:', err);
        if (alive) reportError('Could not load this posting.');
      } finally {
        if (alive) setLoadedFor(jobId);
      }
    };
    const checkAlreadyApplied = async () => {
      const u = await awaitOSUser();
      if (!alive) return;
      setUser(u);
      if (!u) return;
      const applied = await hasApplied(jobId, u.id).catch(() => false);
      if (alive) setAlreadyApplied(applied);
    };
    void loadJob();
    void checkAlreadyApplied();
    return () => { alive = false; };
  }, [jobId]);

  useEffect(() => {
    if (!isCreator || !jobId) return;
    let alive = true;
    const loadApplications = async () => {
      try {
        const rows = await listApplications(jobId);
        if (alive) setApplications(rows);
      } catch (err) {
        console.error('Error loading applications:', err);
        if (alive) reportError('Could not load the applications.');
      } finally {
        if (alive) setAppsFor(jobId);
      }
    };
    void loadApplications();
    return () => { alive = false; };
  }, [isCreator, jobId]);

  const handleApply = async () => {
    if (!user || !job) return;
    setApplying(true);
    setApplyError('');
    try {
      let result: 'sent' | 'duplicate';
      try {
        result = await applyToJob(job.id, user.id, coverNote);
      } catch (error) {
        setApplyError((error as { message?: string })?.message || 'Could not send the application.');
        return;
      }
      setAlreadyApplied(true);
      if (result === 'sent') {
        setCoverNote('');

        notify(job.created_by, {
          type: 'application',
          title: `New application · ${job.title}`,
          body: 'Someone applied to your posting.',
          link: `/jobs/${job.id}`,
        }, user.id);
      }
    } finally {
      setApplying(false);
    }
  };

  // One step in the database: status, crew, casting, closing, telling them.
  const handleApplicationStatus = async (appId: string, newStatus: 'accepted' | 'rejected') => {
    try {
      const close = newStatus === 'accepted' && closeWhenFilled && job?.status === 'open';
      const r = await respondToApplication(appId, newStatus, close);
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
      if (r.closed) setJob(j => (j ? { ...j, status: 'closed' } : j));
      toast(
        newStatus === 'rejected' ? 'Application declined — they’ve been told'
          : r.cast_as ? `Cast as ${r.cast_as}${r.joined_crew ? ' and added to the crew' : ''}${r.closed ? ' · posting closed' : ''}`
          : job?.project_id ? `${r.joined_crew ? 'Added to the crew' : 'Accepted — already on the crew'}${r.closed ? ' · posting closed' : ''}`
          : `Accepted${r.closed ? ' · posting closed' : ''}`,
        'success',
      );
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not update the application', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2, color: 'var(--fg-dim)' }}>LOADING...</span>
      </div>
    );
  }

  if (!job) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <span style={{ fontFamily: 'var(--display)', fontSize: '2rem', letterSpacing: 4 }}>JOB NOT FOUND</span>
        <Link href="/jobs" style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)', textDecoration: 'none', letterSpacing: 2 }}>← BACK TO JOBS</Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)' }}>

      <header style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: 58,
        background: 'var(--surface)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(var(--ink-rgb), 0.04)',
        boxShadow: '0 1px 0 rgba(139,92,246,0.08) inset',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', zIndex: 100, boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ fontFamily: 'var(--display)', fontSize: '0.9rem', letterSpacing: 6, color: 'var(--fg-dim)', transition: 'opacity 0.2s' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '0.7')}
            >MC</div>
          </Link>
          <div style={{ width: 1, height: 16, background: 'rgba(var(--ink-rgb), 0.08)' }} />
          <Link href="/jobs" style={{ textDecoration: 'none' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 3, color: 'var(--jobs-text)', textTransform: 'uppercase', transition: 'opacity 0.2s' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '0.6')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
            >Jobs</div>
          </Link>
          <div style={{ width: 1, height: 16, background: 'rgba(var(--ink-rgb), 0.08)' }} />
          <div style={{
            fontFamily: 'var(--display)', fontSize: '0.85rem', letterSpacing: 2,
            color: 'var(--fg-dim)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260,
          }}>
            {job.title}
          </div>
        </div>

        <span style={statusBadgeStyle(job.status)}>{job.status}</span>
      </header>

      <div style={{ maxWidth: 'var(--w-reading)', margin: '58px auto 0', padding: '48px 24px 100px' }}>

        <div style={{ marginBottom: 40 }}>
          <div style={{ marginBottom: 14 }}>
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 3,
              color: 'var(--accent)', textTransform: 'uppercase',
              borderBottom: '1px solid var(--accent)', paddingBottom: 2,
            }}>
              {job.role}
            </span>
            {job.projects?.title && (
              <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 2, marginLeft: 12, color: 'var(--fg-dim)' }}>
                · {job.projects.title}
              </span>
            )}
          </div>

          <h1 style={{
            fontFamily: 'var(--display)', fontSize: 'clamp(2rem, 6vw, 3.5rem)',
            letterSpacing: 4, lineHeight: 1, margin: '0 0 20px',
          }}>
            {job.title}
          </h1>
          {job.character_name && (
            <p style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1, color: 'var(--fg-muted)', margin: '-8px 0 18px' }}>
              Casting call · the role of <strong style={{ color: 'var(--fg)' }}>{job.character_name}</strong>{job.projects?.title ? ` in ${job.projects.title}` : ''}
            </p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            {job.rate && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)' }}>
                <DollarSign size={12} />
                <span>${job.rate}/hr</span>
              </div>
            )}
            <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 1, color: 'var(--fg-dim)' }}>
              Posted by{' '}
              <span style={{ opacity: 1, color: 'var(--fg)' }}>
                {job.profiles?.username || 'unknown'}
              </span>
              {job.profiles?.role && (
                <span style={{ color: 'var(--fg-dim)' }}> · {job.profiles.role}</span>
              )}
              {'  ·  '}
              {new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(var(--ink-rgb), 0.06)', marginBottom: 40 }} />

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

        <div style={{ borderTop: '1px solid rgba(var(--ink-rgb), 0.06)', marginBottom: 40 }} />

        {/* ─── CREATOR VIEW: Applications Panel ─── */}
        {isCreator && (
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.6rem', letterSpacing: 4, margin: 0 }}>
                APPLICATIONS
              </h2>
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1,
                color: 'var(--accent)', border: '1px solid var(--accent)',
                padding: '2px 8px',
              }}>
                {applications.length}
              </span>
              {job.status === 'open' && (
                <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-muted)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={closeWhenFilled} onChange={(e) => setCloseWhenFilled(e.target.checked)} />
                  Close the posting when I accept someone
                </label>
              )}
            </div>
            {job.project_id && (
              <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-muted)', margin: '-12px 0 20px', lineHeight: 1.6 }}>
                Accepting adds them to {job.projects?.title ?? 'the project'}’s crew as {job.role}{job.character_name ? ` and casts them as ${job.character_name}` : ''}. Either way, they’re told.
              </p>
            )}

            {appsLoading ? (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2, color: 'var(--fg-dim)' }}>LOADING...</div>
            ) : applications.length === 0 ? (
              <div style={{
                padding: 40, textAlign: 'center',
                border: '1px dashed rgba(var(--ink-rgb), 0.08)',
                fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2, color: 'var(--fg-dim)' }}>
                NO APPLICATIONS YET
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 16 }}>
                {applications.map(app => (
                  <div key={app.id} style={{
                    padding: 24,
                    background: 'var(--glass)',
                    borderRadius: 14,
                    ...appStatusStyle(app.status),
                    transition: 'border-color 0.2s',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32,
                          background: 'rgba(232, 67, 26,0.15)',
                          border: '1px solid rgba(232, 67, 26,0.3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          {app.profiles?.avatar_url ? (
                            <Avatar src={app.profiles.avatar_url} name={app.profiles.username} size={32} radius={0} />
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
                            <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 1, marginTop: 2, color: 'var(--fg-dim)' }}>
                              {app.profiles.role}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {app.status === 'pending' && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 1, color: 'var(--fg-dim)' }}>
                            <Clock size={10} /> PENDING
                          </span>
                        )}
                        {app.status === 'accepted' && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 1, color: 'var(--ok)' }}>
                            <CheckCircle size={10} /> ACCEPTED
                          </span>
                        )}
                        {app.status === 'rejected' && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 1, color: 'var(--fg-dim)' }}>
                            <XCircle size={10} /> REJECTED
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 1, marginBottom: app.cover_note ? 16 : 0, color: 'var(--fg-dim)' }}>
                      Applied {new Date(app.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>

                    {app.cover_note && (
                      <div style={{
                        marginTop: 12, padding: '12px 16px',
                        background: 'rgba(var(--ink-rgb), 0.03)',
                        borderLeft: '2px solid rgba(232, 67, 26,0.3)',
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

                    {app.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                        <button
                          onClick={() => handleApplicationStatus(app.id, 'accepted')}
                          style={{
                            padding: '7px 18px',
                            background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e',
                            color: 'var(--ok)', fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))',
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
                            background: 'rgba(var(--ink-rgb), 0.04)', border: '1px solid rgba(var(--ink-rgb), 0.15)',
                            color: 'var(--fg-dim)', fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))',
                            letterSpacing: 2, cursor: 'pointer', transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = 'rgba(232, 67, 26,0.5)';
                            e.currentTarget.style.color = 'rgba(232, 67, 26,0.8)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = 'rgba(var(--ink-rgb), 0.15)';
                            e.currentTarget.style.color = 'rgba(var(--fg-rgb), 0.5)';
                          }}
                        >
                          REJECT
                        </button>
                      </div>
                    )}

                    {app.status !== 'pending' && (
                      <button
                        onClick={() => handleApplicationStatus(app.id, app.status === 'accepted' ? 'rejected' : 'accepted')}
                        style={{
                          marginTop: 16,
                          padding: '6px 14px',
                          background: 'transparent', border: '1px solid rgba(var(--ink-rgb), 0.1)',
                          color: 'var(--fg-dim)', fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))',
                          letterSpacing: 2, cursor: 'pointer', transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.color = 'rgba(var(--fg-rgb), 0.7)';
                          e.currentTarget.style.borderColor = 'rgba(var(--ink-rgb), 0.25)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.color = 'rgba(var(--fg-rgb), 0.3)';
                          e.currentTarget.style.borderColor = 'rgba(var(--ink-rgb), 0.1)';
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

            {!user && (
              <div style={{
                padding: 32, border: '1px solid rgba(var(--ink-rgb), 0.08)',
                textAlign: 'center',
              }}>
                <p style={{ fontFamily: 'var(--mono)', fontSize: 11, margin: '0 0 16px', letterSpacing: 1, color: 'var(--fg-dim)' }}>
                  You need to be signed in to apply.
                </p>
                <Link href="/auth" style={{
                  display: 'inline-block', padding: '10px 28px',
                  background: 'var(--accent)', color: 'var(--on-accent)',
                  fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2, textDecoration: 'none',
                }}>
                  SIGN IN
                </Link>
              </div>
            )}

            {user && alreadyApplied && (
              <div style={{
                padding: 32, border: '1px solid #22c55e',
                background: 'rgba(34,197,94,0.05)',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <CheckCircle size={20} style={{ color: 'var(--ok)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2, color: 'var(--ok)', marginBottom: 4 }}>
                    APPLICATION SUBMITTED
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 1, color: 'var(--fg-dim)' }}>
                    The creator will review your application and get back to you.
                  </div>
                </div>
              </div>
            )}

            {user && !alreadyApplied && (
              <div style={{ display: 'grid', gap: 16 }}>
                <Textarea
                  label="Cover Note (optional)"
                  value={coverNote}
                  onChange={e => setCoverNote(e.target.value)}
                  placeholder="Tell the creator why you're the right fit..."
                  rows={6}
                />

                {applyError && (
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)', opacity: 0.8 }}>
                    {applyError}
                  </div>
                )}

                <button
                  onClick={handleApply}
                  disabled={applying}
                  style={{
                    alignSelf: 'flex-start',
                    padding: '12px 36px',
                    background: applying ? 'var(--accent-dim)' : 'var(--accent)',
                    color: applying ? 'var(--fg)' : 'var(--on-accent)', border: 'none',
                    fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 3,
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
      </div>
    </div>
  );
}
