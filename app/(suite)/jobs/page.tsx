'use client';

import { useState, useEffect, useEffectEvent } from 'react';
import { useOnChange } from '@/lib/hooks/useOnChange';
import { Search, Plus, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import GrainOverlay from '@/components/ui/GrainOverlay';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';
import EmptyState from '@/components/ui/EmptyState';
import { usePillStage } from '@/lib/os/PillContext';
import { useProject } from '@/lib/os';
import { applyToJob, closeJob, listJobsPostedBy, listMyApplications, listOpenJobs, type JobWithRelations as Job, type MyApplication } from '@/lib/supabase/jobs';
import { logAuditAction } from '@/lib/supabase/audit';
import { notify } from '@/lib/supabase/notifications';
import { readable } from '@/lib/util/color';
import { awaitOSUser } from '@/lib/os';
import { useCrafts } from '@/lib/crafts/crafts';
import { craftColor } from '@/components/jobs/craftColor';
import { PostModal } from '@/components/jobs/PostModal';
import { JobCard, MyJobCard } from '@/components/jobs/JobCards';

export default function JobsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const confirm = useConfirm();
  const { activeProject } = useProject();
  const searchParams = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const { crafts, byName: craftByName } = useCrafts();
  const [showPost, setShowPost] = useState(() => !!(searchParams.get('title') || searchParams.get('role')));
  const [user, setUser] = useState<any>(null);
  const [tab, setTab] = useState<'open' | 'mine'>('open');

  const prefillTitle = searchParams.get('title') || '';
  const prefillRole = searchParams.get('role') || '';
  const prefillDescription = searchParams.get('description') || '';
  const prefillCharacter = searchParams.get('character') || '';
  // job id → my application's status
  const [applied, setApplied] = useState<Record<string, string>>({});
  const [myApps, setMyApps] = useState<MyApplication[]>([]);
  // Arriving with a role to post (from casting or a project) opens the form.
  useOnChange(prefillTitle || prefillRole ? `${prefillTitle}\u0000${prefillRole}` : '', (k) => { if (k) setShowPost(true); });

  const showJobs = (rows: Promise<Job[]>) => rows
    .then((r) => setJobs(r))
    .catch((error: any) => {
      console.error(error);
      setLoadError(error?.message || 'Failed to load job listings');
      setJobs([]);
    })
    .finally(() => setLoading(false));
  const loadJobs = () => {
    setLoading(true);
    setLoadError(null);
    return showJobs(listOpenJobs());
  };

  const loadMyJobs = (userId: string) => listJobsPostedBy(userId)
    .then((rows) => setMyJobs(rows))
    .catch(() => toast('Could not load your postings.', 'error'));

  const loadMyApplications = (userId: string) => listMyApplications(userId)
    .then((rows) => {
      setMyApps(rows);
      setApplied(Object.fromEntries(rows.filter((r) => r.jobs).map((r) => [r.jobs!.id, r.status])));
    })
    .catch(() => toast('Could not load your applications.', 'error'));

  const loadMine = useEffectEvent((userId: string) => { loadMyJobs(userId); void loadMyApplications(userId); });
  const loadBoard = useEffectEvent(() => { void showJobs(listOpenJobs()); });
  useEffect(() => {
    awaitOSUser().then((user) => {
      setUser(user);
      if (user) loadMine(user.id);
    });
    loadBoard();
  }, []);

  /** Applies with an optional note and tells the poster. */
  const handleApply = async (jobId: string, note: string): Promise<boolean> => {
    if (!user) { router.push('/auth'); return false; }
    let result: 'sent' | 'duplicate';
    try { result = await applyToJob(jobId, user.id, note); }
    catch { toast('Failed to submit application.', 'error'); return false; }
    if (result === 'duplicate') toast('You already applied to this job.', 'info');
    else {
      toast('Application sent.', 'success');
      const job = jobs.find((j) => j.id === jobId);
      if (job) void notify(job.created_by, { type: 'application', title: `New application · ${job.title}`, body: note.trim() ? note.trim().slice(0, 300) : 'Someone applied to your posting.', link: `/jobs/${job.id}` }, user.id);
    }
    void loadMyApplications(user.id);
    return true;
  };

  const handleCloseJob = async (jobId: string) => {
    if (!await confirm('Close this job posting? It will stop accepting applications.')) return;
    try { await closeJob(jobId); }
    catch (error) { toast((error as { message?: string })?.message || 'Could not close job', 'error'); return; }
    if (user) logAuditAction(user.id, 'job_closed', 'job', jobId);
    toast('Job closed', 'success');
    if (user) loadMyJobs(user.id);
    loadJobs();
  };

  const filtered = jobs.filter(j => {
    const q = search.toLowerCase();
    const matchSearch = !q || j.title.toLowerCase().includes(q) || j.description?.toLowerCase().includes(q);
    const matchRole = !roleFilter || j.role === roleFilter;
    return matchSearch && matchRole;
  });

  usePillStage(
    {
      module: 'portfolio',
      title: tab === 'mine' ? 'My Jobs' : 'Jobs Board',
      accent: '#8b5cf6',
      fields: [
        { label: 'Open', value: `${jobs.length}`, color: 'var(--jobs-text)' },
        ...(roleFilter ? [{ label: 'Shown', value: `${filtered.length}` }] : []),
        ...(user ? [{ label: 'Mine', value: `${myJobs.length}` }] : []),
      ],
      actions: user ? [
        { id: 'post-job', label: '+ Post Position', onClick: () => setShowPost(true) },
      ] : [],
    }
  );

  // The filter lists the crafts that have postings, in the crafts list's order.
  const roleCounts = jobs.reduce<Record<string, number>>((acc, j) => { acc[j.role] = (acc[j.role] ?? 0) + 1; return acc; }, {});
  const postedCrafts = [...crafts.filter((c) => roleCounts[c.name]).map((c) => c.name), ...Object.keys(roleCounts).filter((r) => !craftByName.has(r))];

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--fg)', minHeight: '100vh' }}>
      <h1 className="sr-only">Jobs</h1>
      <GrainOverlay />

      <nav className="mc-jobs-top" aria-label="Jobs" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '12px 28px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 2,
              background: 'rgba(var(--ink-rgb), 0.03)',
              border: '1px solid rgba(var(--ink-rgb), 0.06)',
              borderRadius: 9999, padding: '3px 4px',
            }}>
              {(['open', 'mine'] as const).map(t => (
                <motion.button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    position: 'relative', padding: '6px 14px', borderRadius: 9999,
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)',
                    textTransform: 'var(--caps)',
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
                background: '#7c3aed', color: '#fff', border: 'none',
                fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)',
                textTransform: 'var(--caps)', fontWeight: 600, cursor: 'pointer',
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
              <Plus size={11} strokeWidth={2.5} /> Post<span className="mc-hide-phone">&nbsp;Job</span>
            </button>
          )}
        </div>
      </nav>

      <div className="mc-jobs-body" style={{ paddingTop: 0, display: 'flex', minHeight: '100vh' }}>

        <div className="mc-jobs-filter" style={{
          width: 220, flexShrink: 0, borderRight: '1px solid rgba(var(--ink-rgb), 0.04)',
          padding: '32px 20px', position: 'sticky', top: 12,
          height: 'calc(100vh - 58px)', overflowY: 'auto',
          background: 'var(--surface-2)',
        }}>
          <div className="mc-hide-phone" style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', color: 'var(--fg-dim)', textTransform: 'var(--caps)', marginBottom: 16 }}>
            Filter by Role
          </div>

          <button
            onClick={() => setRoleFilter('')}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              width: '100%', padding: '8px 10px', borderRadius: 8,
              background: !roleFilter ? 'rgba(var(--ink-rgb), 0.06)' : 'transparent',
              border: 'none', cursor: 'pointer', marginBottom: 4,
              color: !roleFilter ? 'var(--fg)' : 'var(--fg-dim)',
              fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)',
              textTransform: 'var(--caps)', textAlign: 'left',
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            All Roles
            <span style={{ fontSize: 'max(8px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)' }}>{jobs.length}</span>
          </button>

          {postedCrafts.map(r => {
            const count = roleCounts[r] ?? 0;
            const active = roleFilter === r;
            const color = craftColor(craftByName, r);
            return (
              <button
                key={r}
                onClick={() => setRoleFilter(active ? '' : r)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  width: '100%', padding: '8px 10px', borderRadius: 8,
                  background: active ? `${color}12` : 'transparent',
                  border: 'none', cursor: 'pointer', marginBottom: 2,
                  color: active ? readable(color) : 'var(--fg-dim)',
                  fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)',
                  textTransform: 'var(--caps)', textAlign: 'left',
                  transition: 'background 0.2s, color 0.2s',
                }}
                onMouseEnter={e => !active && ((e.currentTarget as HTMLElement).style.color = 'rgba(var(--fg-rgb), 0.7)')}
                onMouseLeave={e => !active && ((e.currentTarget as HTMLElement).style.color = 'rgba(var(--fg-rgb), 0.35)')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: active ? color : 'var(--fg-dim)', flexShrink: 0, boxShadow: active ? `0 0 6px ${color}` : 'none' }} />
                  {r}
                </div>
                {count > 0 && <span style={{ fontSize: 'max(8px, var(--mc-min-font, 0px))', color: active ? readable(color) : 'var(--fg-dim)' }}>{count}</span>}
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1, padding: '32px 32px 100px', maxWidth: 800 }}>

          {tab === 'open' && (
            <>
              <div style={{ position: 'relative', marginBottom: 28 }}>
                <Search size={13} color="rgba(var(--fg-rgb), 0.25)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search positions…"
                  style={{
                    width: '100%', padding: '12px 16px 12px 38px',
                    background: 'rgba(var(--ink-rgb), 0.03)',
                    border: '1px solid rgba(var(--ink-rgb), 0.07)',
                    borderRadius: 14, color: 'var(--fg)',
                    fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 'var(--caps-track)',
                    outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(139,92,246,0.4)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(var(--ink-rgb), 0.07)')}
                />
              </div>

              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ padding: 24, background: 'var(--bg-2)', border: '1px solid rgba(var(--ink-rgb), 0.06)', borderRadius: 14, height: 120 }}>
                      <div className="skeleton" style={{ width: 120, height: 14, borderRadius: 4, marginBottom: 16 }} />
                      <div className="skeleton" style={{ width: '40%', height: 10, borderRadius: 4, marginBottom: 8 }} />
                      <div className="skeleton" style={{ width: '30%', height: 10, borderRadius: 4 }} />
                    </div>
                  ))}
                </div>
              ) : loadError ? (
                <EmptyState
                  icon={<Briefcase size={28} />}
                  title="Couldn't load job listings"
                  subtitle={loadError}
                  action={<button onClick={loadJobs} style={{ marginTop: 16, padding: '8px 20px', background: 'var(--accent)', color: 'var(--on-accent)', border: 'none', borderRadius: 8, fontFamily: 'var(--mono)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Retry</button>}
                />
              ) : filtered.length === 0 && jobs.length > 0 ? (
                <EmptyState
                  icon={<Briefcase size={28} />}
                  title="No role matches"
                  subtitle={`${jobs.length} open role${jobs.length === 1 ? '' : 's'} — none for this search or craft.`}
                  action={
                    <button onClick={() => { setSearch(''); setRoleFilter(''); }} style={{
                      padding: '10px 22px', borderRadius: 9999,
                      background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)',
                      color: 'var(--violet)', cursor: 'pointer',
                      fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)',
                    }}>
                      Show every role
                    </button>
                  }
                />
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={<Briefcase size={28} />}
                  title="No open positions"
                  subtitle="Post the first role."
                  action={user && (
                    <button onClick={() => setShowPost(true)} style={{
                      padding: '10px 22px', borderRadius: 9999,
                      background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)',
                      color: 'var(--jobs-text)', cursor: 'pointer',
                      fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)',
                    }}>
                      Post the first one
                    </button>
                  )}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filtered.map((job, i) => (
                    <JobCard key={job.id} job={job} onApply={handleApply} applied={applied[job.id]} index={i} />
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'mine' && !user && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center' }}>
              <Briefcase size={40} style={{ color: 'var(--fg-dim)', marginBottom: 20 }} />
              <div style={{ fontFamily: 'var(--display)', fontSize: '1.3rem', letterSpacing: '-0.02em', marginBottom: 8 }}>MY JOBS</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-muted)', letterSpacing: 'var(--caps-track)', marginBottom: 24 }}>Sign in to view your saved jobs and applications</div>
              <Link href="/auth" style={{ padding: '10px 24px', background: 'var(--accent)', color: 'var(--on-accent)', textDecoration: 'none', fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', fontWeight: 600, borderRadius: 20 }}>Sign In</Link>
            </div>
          )}

          {tab === 'mine' && user && (
            <>
              {myJobs.length === 0 ? (
                <EmptyState
                  icon={<Briefcase size={28} />}
                  title="No positions posted yet"
                  action={
                    <button onClick={() => setShowPost(true)} style={{
                      padding: '10px 22px', borderRadius: 9999,
                      background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)',
                      color: 'var(--jobs-text)', cursor: 'pointer',
                      fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)',
                    }}>
                      Post your first position
                    </button>
                  }
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {myJobs.map((job, i) => (
                    <MyJobCard key={job.id} job={job} onClose={handleCloseJob} index={i} />
                  ))}
                </div>
              )}
              <h2 style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', color: 'var(--fg-muted)', fontWeight: 400, margin: '32px 0 12px' }}>
                Applied to · {myApps.length}
              </h2>
              {myApps.length === 0 ? (
                <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-muted)' }}>
                  Nothing yet. <button type="button" onClick={() => setTab('open')} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--fg)', textDecoration: 'underline', cursor: 'pointer', font: 'inherit' }}>Browse open roles</button>
                </p>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {myApps.filter((a) => a.jobs).map((a) => (
                    <li key={a.jobs!.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 14, border: '1px solid rgba(var(--ink-rgb), 0.06)', background: 'var(--glass)' }}>
                      <Link href={`/jobs/${a.jobs!.id}`} style={{ flex: 1, minWidth: 0, color: 'var(--fg)', textDecoration: 'none', fontFamily: 'var(--mono)', fontSize: 11 }}>
                        {a.jobs!.title}
                        <span style={{ color: 'var(--fg-muted)' }}> · {a.jobs!.role}{a.jobs!.projects?.title ? ` · ${a.jobs!.projects.title}` : ''}{a.jobs!.status === 'closed' ? ' · closed' : ''}</span>
                      </Link>
                      <span style={{
                        fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', padding: '4px 10px', borderRadius: 9999,
                        color: a.status === 'accepted' ? '#6ee7b7' : a.status === 'rejected' ? 'var(--danger)' : 'var(--fg-muted)',
                        border: '1px solid rgba(var(--ink-rgb), 0.1)',
                      }}>{a.status === 'accepted' ? 'Accepted' : a.status === 'rejected' ? 'Not selected' : 'Pending'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showPost && user && (
          <PostModal
            onClose={() => setShowPost(false)}
            onCreated={() => { loadJobs(); if (user) loadMyJobs(user.id); }}
            userId={user.id}
            projectId={activeProject?.id ?? null}
            projectTitle={activeProject?.title ?? null}
            initialTitle={prefillTitle}
            initialRole={prefillRole}
            initialDescription={prefillDescription}
            initialCharacter={prefillCharacter}
          />
        )}
      </AnimatePresence>

      <style>{`
        input::placeholder, textarea::placeholder { color: rgba(var(--fg-rgb), 0.18); }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
      `}</style>
    </div>
  );
}
