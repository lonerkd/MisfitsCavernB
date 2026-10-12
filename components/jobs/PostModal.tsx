'use client';

import { useState } from 'react';
import { DollarSign, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';
import { postJob } from '@/lib/supabase/jobs';
import { logAuditAction } from '@/lib/supabase/audit';
import { logActivity } from '@/lib/supabase/activity';
import { type Craft } from '@/lib/crafts/crafts';
import { CraftPicker } from '@/components/crafts/CraftPicker';

export function PostModal({ onClose, onCreated, userId, projectId, projectTitle, initialTitle, initialRole, initialDescription, initialCharacter }: {
  onClose: () => void;
  onCreated: () => void;
  userId: string;
  projectId: string | null;
  projectTitle: string | null;
  initialTitle?: string;
  initialRole?: string;
  initialDescription?: string;
  /** A casting call: accepting an applicant casts them in this role of the project. */
  initialCharacter?: string;
}) {
  const character = projectId && initialCharacter ? initialCharacter : null;
  const [form, setForm] = useState({ title: initialTitle || '', description: initialDescription || '', role: initialRole || '', rate: '' });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!form.title || !form.role) return;
    setSubmitting(true);
    let id: string;
    try {
      id = await postJob({
        title: form.title,
        description: form.description,
        role: form.role,
        rate: form.rate ? parseFloat(form.rate) : null,
        projectId,
        character,
        userId,
      });
    } catch (error) {
      toast('Failed to post job: ' + ((error as { message?: string })?.message ?? 'unknown error'), 'error');
      return;
    } finally {
      setSubmitting(false);
    }
    logAuditAction(userId, 'job_created', 'job', id, { title: form.title, role: form.role });
    logActivity(`opened the position "${form.title}"`, 'job', id);
    onCreated(); onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 'var(--z-modal)',
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
          width: '100%', maxWidth: 'var(--w-form)', maxHeight: '100%', overflowY: 'auto',
          background: 'var(--surface)',
          border: '1px solid rgba(var(--ink-rgb), 0.08)',
          borderRadius: 20,
          padding: 32,
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', color: 'var(--jobs-text)', textTransform: 'var(--caps)', marginBottom: 6 }}>
              Crew Marketplace
            </div>
            <div style={{ fontFamily: 'var(--display)', fontSize: '1.4rem', letterSpacing: '-0.02em' }}>
              Post a Position
            </div>
          </div>
          <button aria-label="Close" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-dim)', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20,
          padding: '8px 12px', borderRadius: 8,
          background: projectId ? 'rgba(16,185,129,0.06)' : 'rgba(245,158,11,0.06)',
          border: `1px solid ${projectId ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: projectId ? '#10b981' : '#f59e0b', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(9.5px, var(--mc-min-font, 0px))', color: 'var(--fg-muted)' }}>
            {projectId ? <>Posting for <strong style={{ color: 'var(--fg)' }}>{projectTitle}</strong></> : 'No active project selected — this posting won’t be linked to a project'}
            {character && <> · casting call for <strong style={{ color: 'var(--fg)' }}>{character}</strong> — accepting someone casts them in the role</>}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', color: 'var(--fg-dim)', textTransform: 'var(--caps)', marginBottom: 8 }}>Craft</div>
            <CraftPicker label="Craft" value={form.role || null} onChange={(craft) => setForm(f => ({ ...f, role: craft ?? '' }))} placeholder="Which craft is this for?" />
          </div>

          <Input
            label="Position Title"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="e.g. Lead Editor for short film"
          />

          <Textarea
            label="Brief"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Project context, schedule, what you're looking for…"
            rows={3}
          />

          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', color: 'var(--fg-dim)', textTransform: 'var(--caps)', marginBottom: 8 }}>Hourly Rate (optional)</div>
            <div style={{ position: 'relative' }}>
              <DollarSign size={12} color="rgba(var(--fg-rgb), 0.25)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="number"
                value={form.rate}
                onChange={e => setForm(f => ({ ...f, rate: e.target.value }))}
                placeholder="0.00"
                style={{
                  width: '100%', padding: '12px 14px 12px 32px',
                  background: 'rgba(var(--ink-rgb), 0.04)',
                  border: '1px solid rgba(var(--ink-rgb), 0.08)',
                  borderRadius: 8, color: 'var(--fg)',
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
              background: form.title ? '#8b5cf6' : 'rgba(var(--ink-rgb), 0.05)',
              color: form.title ? 'var(--fg-strong)' : 'var(--fg-dim)',
              border: 'none', borderRadius: 14,
              fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)',
              textTransform: 'var(--caps)', fontWeight: 600,
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
