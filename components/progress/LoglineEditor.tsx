'use client';

import React, { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { setProjectLogline } from '@/lib/supabase/progress';
import p from './progress.module.css';
import { useOnChange } from '@/lib/hooks/useOnChange';

const MAX = 300;

/** The project's logline: editable by its owner, read-only for everyone else. */
export function LoglineEditor({ projectId, value, isOwner, onSaved }: {
  projectId: string;
  value: string;
  isOwner: boolean;
  onSaved: (logline: string) => void;
}) {
  const { toast } = useToast();
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  useOnChange(value, (v) => setDraft(v));

  if (!isOwner) {
    return value ? <p style={{ fontFamily: 'var(--serif)', fontSize: '0.95rem', color: 'var(--fg-dim)', marginTop: 10, maxWidth: 560 }}>{value}</p> : null;
  }

  const save = async () => {
    const next = draft.trim();
    if (next === value.trim()) return;
    setSaving(true);
    try {
      await setProjectLogline(projectId, next);
      onSaved(next);
      toast('Logline saved.', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save the logline', 'error');
      setDraft(value);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="logline" className={p.logline}>
      <label htmlFor={`logline-${projectId}`} className="sr-only">Logline</label>
      <textarea
        id={`logline-${projectId}`}
        className={p.loglineInput}
        rows={2}
        maxLength={MAX}
        value={draft}
        placeholder="The logline — who wants what, and what stands in the way."
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); (e.target as HTMLTextAreaElement).blur(); }
          if (e.key === 'Escape') { setDraft(value); }
        }}
        aria-describedby={`logline-meta-${projectId}`}
      />
      <div id={`logline-meta-${projectId}`} className={p.loglineMeta}>
        <span>{saving ? 'Saving…' : 'Enter to save · leads the pitch deck and share page'}</span>
        <span>{draft.length}/{MAX}</span>
      </div>
    </div>
  );
}
