'use client';

import { ReportButton } from '@/components/ui/ReportButton';
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useNow } from '@/lib/hooks/useNow';
import { DollarSign, ChevronRight, Flag, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Textarea } from '@/components/ui/Textarea';
import { type JobWithRelations as Job } from '@/lib/supabase/jobs';
import { readable } from '@/lib/util/color';
import { removedNote } from '@/lib/moderation/moderation';
import { useCrafts } from '@/lib/crafts/crafts';
import { craftColor } from '@/components/jobs/craftColor';

export function JobCard({ job, onApply, applied, index }: { job: Job; onApply: (id: string, note: string) => Promise<boolean>; applied?: string; index: number }) {
  const { byName } = useCrafts();
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const [composing, setComposing] = useState(false);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAt, setMenuAt] = useState({ top: 0, right: 0 });
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const reportHostRef = useRef<HTMLSpanElement>(null);
  const send = async () => {
    setSending(true);
    const ok = await onApply(job.id, note);
    setSending(false);
    if (ok) { setComposing(false); setNote(''); }
  };
  const color = craftColor(byName, job.role);
  const now = useNow();
  const daysAgo = Math.floor((now - new Date(job.created_at).getTime()) / 86400000);
  const age = daysAgo === 0 ? 'today' : `${daysAgo}d ago`;

  // The whole card opens the posting; the controls inside it (Apply, the
  // overflow, the composer) act for themselves instead.
  const openDetail = (e: ReactMouseEvent) => {
    if ((e.target as HTMLElement).closest('a, button, textarea, input, select, [role="menu"], [role="dialog"]')) return;
    router.push(`/jobs/${job.id}`);
  };

  const toggleMenu = () => {
    if (!menuOpen && menuBtnRef.current) {
      const r = menuBtnRef.current.getBoundingClientRect();
      setMenuAt({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) });
    }
    setMenuOpen((v) => !v);
  };

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-job-menu]') || t.closest('[data-job-menu-btn]')) return;
      setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [menuOpen]);

  // Report lives in the overflow now; the menu item opens the report dialog
  // through its host (ReportButton's style prop hides only its own button,
  // never the dialog it renders).
  const openReport = () => {
    setMenuOpen(false);
    reportHostRef.current?.querySelector('button')?.click();
  };

  return (
    <motion.div
      data-testid="job-card"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={openDetail}
      style={{
        background: 'var(--glass)',
        border: `1px solid ${hovered ? color + '33' : 'rgba(var(--ink-rgb), 0.06)'}`,
        borderRadius: 14, padding: '22px 24px',
        position: 'relative', overflow: 'hidden', cursor: 'pointer',
        boxShadow: hovered ? `0 16px 48px rgba(0,0,0,0.6), 0 0 28px ${color}10` : '0 2px 8px rgba(0,0,0,0.3)',
        transition: 'border-color 0.3s, box-shadow 0.3s',
      }}
    >
      <div style={{
        position: 'absolute', top: 0, left: 0, width: 100, height: 100,
        background: `radial-gradient(circle at top left, ${color}12 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ fontFamily: 'var(--display)', fontSize: '1.15rem', letterSpacing: '-0.02em', marginBottom: 6, lineHeight: 1.2 }}>
        <Link href={`/jobs/${job.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{job.title}</Link>
      </div>

      {/* One quiet meta line — role · project · poster · age — with the overflow at its end. */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
        fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', color: 'var(--fg-dim)',
      }}>
        <span style={{ color: readable(color), textTransform: 'var(--caps)' }}>{job.role}</span>
        {job.projects?.title && (
          <>
            <span aria-hidden>·</span>
            <span>{job.projects.title}</span>
          </>
        )}
        <span aria-hidden>·</span>
        <span>{job.profiles?.username ?? 'creator'}</span>
        <span aria-hidden>·</span>
        <span>{age}</span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex' }}>
          <button
            ref={menuBtnRef}
            data-job-menu-btn
            type="button"
            onClick={toggleMenu}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`More actions for ${job.title}`}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: '1px solid transparent', borderRadius: 8,
              color: 'var(--fg-muted)', cursor: 'pointer', padding: '2px 6px',
            }}
          >
            <MoreHorizontal size={16} aria-hidden />
          </button>
        </span>
      </div>

      {job.character_name && (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', color: 'var(--fg-muted)', marginBottom: 8 }}>
          Casting call · the role of {job.character_name}
        </div>
      )}

      {job.description && (
        <div style={{
          fontFamily: 'var(--serif)', fontSize: 13, lineHeight: 1.65,
          color: 'var(--fg-dim)',
          display: '-webkit-box', WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
          marginBottom: 16,
        }}>
          {job.description}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {job.rate && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--mono)', fontSize: 11, color: readable(color) }}>
            <DollarSign size={10} /> {job.rate}/hr
          </div>
        )}
        <div style={{ marginLeft: 'auto' }}>
          {applied ? (
            <div role="status" style={{
              padding: '10px 16px', borderRadius: 9999, border: '1px solid rgba(var(--ink-rgb), 0.12)',
              fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', color: 'var(--fg-muted)',
            }}>
              Applied · {applied}
            </div>
          ) : (
            <motion.button
              onClick={() => setComposing((v) => !v)}
              aria-expanded={composing}
              animate={{ scale: hovered ? 1 : 0.97 }}
              transition={{ duration: 0.2 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 18px', borderRadius: 9999,
                background: `${color}18`,
                border: `1px solid ${color}44`,
                color: readable(color), cursor: 'pointer',
                fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)',
                textTransform: 'var(--caps)',
              }}
            >
              Apply <ChevronRight size={10} />
            </motion.button>
          )}
        </div>
      </div>

      {menuOpen && (
        <div
          role="menu"
          aria-label={`More actions for ${job.title}`}
          data-job-menu
          style={{
            position: 'fixed', top: menuAt.top, right: menuAt.right,
            background: 'var(--surface)', backdropFilter: 'blur(20px)',
            border: '1px solid rgba(var(--ink-rgb), 0.09)', borderRadius: 14, padding: 6, minWidth: 164, zIndex: 1000,
            boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
          }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={openReport}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', textAlign: 'left', padding: '9px 14px',
              background: 'transparent', border: 'none', color: 'var(--fg-muted)',
              fontSize: 11, cursor: 'pointer', borderRadius: 8,
              textTransform: 'var(--caps)', letterSpacing: 'var(--caps-track)',
              fontFamily: 'var(--mono)', fontWeight: 500,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(var(--ink-rgb), 0.05)'; e.currentTarget.style.color = 'var(--fg)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--fg-muted)'; }}
          >
            <Flag size={12} aria-hidden /> Report
          </button>
        </div>
      )}

      <span ref={reportHostRef}>
        <ReportButton kind="job" targetId={job.id} style={{ display: 'none' }} />
      </span>
      {composing && !applied && (
        <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Textarea label={`A note to ${job.profiles?.username ?? 'the poster'} (optional)`} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="Your experience, your reel, when you're free." rows={3} maxLength={2000} />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button type="button" onClick={() => void send()} disabled={sending} style={{
              padding: '9px 18px', borderRadius: 9999, border: 'none', cursor: 'pointer', background: 'var(--jobs-color)', color: '#fff',
              fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', fontWeight: 600,
            }}>{sending ? 'Sending…' : 'Send application'}</button>
            <button type="button" onClick={() => setComposing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)' }}>Cancel</button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export function MyJobCard({ job, onClose, index }: { job: Job; onClose: (id: string) => void; index: number }) {
  const { byName } = useCrafts();
  const color = craftColor(byName, job.role);
  const [closing, setClosing] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      style={{
        background: 'var(--glass)',
        border: '1px solid rgba(var(--ink-rgb), 0.06)',
        borderRadius: 14, padding: '20px 22px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{
              padding: '3px 9px', borderRadius: 9999,
              background: `${color}14`, border: `1px solid ${color}33`,
              fontFamily: 'var(--mono)', fontSize: 'max(7.5px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)',
              color: readable(color), textTransform: 'var(--caps)',
            }}>
              {job.role}
            </div>
            <div style={{
              padding: '3px 9px', borderRadius: 9999,
              background: job.status === 'open' ? 'rgba(16,185,129,0.1)' : 'rgba(var(--ink-rgb), 0.04)',
              border: `1px solid ${job.status === 'open' ? 'rgba(16,185,129,0.3)' : 'rgba(var(--ink-rgb), 0.06)'}`,
              fontFamily: 'var(--mono)', fontSize: 'max(7.5px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)',
              color: job.status === 'open' ? 'var(--ok)' : 'var(--fg-dim)',
              textTransform: 'var(--caps)',
            }}>
              {job.status}
            </div>
            {(job.application_count ?? 0) > 0 && (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)' }}>
                {job.application_count} applicant{job.application_count !== 1 ? 's' : ''}
              </div>
            )}
          </div>
          <div style={{ fontFamily: 'var(--display)', fontSize: '1.05rem', letterSpacing: '-0.02em' }}>{job.title}</div>
          {job.hidden_at && <p role="status" style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--danger)' }}>{removedNote('job', job.hidden_reason)}</p>}
        </div>

        {job.status === 'open' && !job.hidden_at && (
          <button
            onClick={async () => {
              setClosing(true);
              await onClose(job.id);
              setClosing(false);
            }}
            style={{
              padding: '7px 14px', borderRadius: 9999,
              background: 'transparent',
              border: '1px solid rgba(var(--ink-rgb), 0.08)',
              color: 'var(--fg-dim)',
              fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)',
              textTransform: 'var(--caps)', cursor: 'pointer',
              transition: 'border-color 0.2s, color 0.2s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.4)';
              (e.currentTarget as HTMLElement).style.color = 'var(--danger)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(var(--ink-rgb), 0.08)';
              (e.currentTarget as HTMLElement).style.color = 'rgba(var(--fg-rgb), 0.3)';
            }}
          >
            {closing ? 'Closing…' : 'Close'}
          </button>
        )}
      </div>
    </motion.div>
  );
}
