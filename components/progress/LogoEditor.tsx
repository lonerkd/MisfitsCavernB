'use client';

import React, { useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { isLogoUrl, setProjectLogo } from '@/lib/supabase/progress';
import { useOnChange } from '@/lib/hooks/useOnChange';

/** The project's logo link, set by its owner beside the accent: the print kit shows it on every printed document. */
export function LogoEditor({ projectId, value, onSaved }: {
  projectId: string;
  value: string | null;
  onSaved: (logoUrl: string | null) => void;
}) {
  const { toast } = useToast();
  const [draft, setDraft] = useState(value ?? '');
  const [saving, setSaving] = useState(false);
  useOnChange(value, (v) => setDraft(v ?? ''));

  const trimmed = draft.trim();
  const changed = trimmed !== (value ?? '');
  const invalid = trimmed !== '' && !isLogoUrl(trimmed);

  const save = async () => {
    if (!changed || invalid) return;
    setSaving(true);
    try {
      const saved = await setProjectLogo(projectId, trimmed);
      onSaved(saved);
      toast(saved ? 'Logo saved. It now shows on printed documents.' : 'Logo removed.', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save the logo', 'error');
      setDraft(value ?? '');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 10, maxWidth: 640 }}>
      <label htmlFor={`logo-${projectId}`} style={{ fontFamily: 'var(--ui)', fontSize: 'var(--text-xs)', color: 'var(--fg-dim)' }}>Logo link</label>
      <input
        id={`logo-${projectId}`}
        type="url"
        inputMode="url"
        maxLength={500}
        value={draft}
        placeholder="https://… (an image, shown small on printed documents)"
        aria-invalid={invalid || undefined}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void save(); } if (e.key === 'Escape') setDraft(value ?? ''); }}
        style={{ flex: '1 1 240px', minWidth: 0, background: 'transparent', color: 'var(--fg)', border: 0, borderBottom: '1px solid var(--border)', padding: '4px 0', fontFamily: 'var(--ui)', fontSize: 'var(--text-sm)' }}
      />
      <button type="button" onClick={save} disabled={!changed || invalid || saving} style={{ fontFamily: 'var(--ui)', fontSize: 'var(--text-xs)', padding: '4px 10px', borderRadius: 9999, border: '1px solid var(--border-2)', background: 'transparent', color: 'var(--fg-strong)' }}>
        {saving ? 'Saving…' : trimmed === '' && value ? 'Remove' : 'Save'}
      </button>
      {invalid && <span role="alert" style={{ fontFamily: 'var(--ui)', fontSize: 'var(--text-xs)', color: 'var(--fg-dim)' }}>Use an https link.</span>}
    </div>
  );
}
