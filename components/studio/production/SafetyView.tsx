'use client';

import React, { useMemo, useState } from 'react';
import EmptyState from '@/components/ui/EmptyState';
import { AlertTriangle, Plus, Shield, Trash2 } from 'lucide-react';
import { useProject } from '@/lib/os';
import { useToast } from '@/components/ui/Toast';
import { useStudio } from '../StudioContext';
import { patchProjectSettings } from '@/lib/supabase/progress';
import { cx } from '../ui';
import s from '../studio.module.css';
import type { ProjectSettings } from '@/lib/types/settings';

type Severity = 'low' | 'medium' | 'high';
type ItemStatus = 'identified' | 'mitigated' | 'resolved';

interface SafetyItem {
  id: string;
  hazard: string;
  location: string;
  severity: Severity;
  mitigation: string;
  owner: string;
  status: ItemStatus;
}

const SEV_LABEL: Record<Severity, string> = { low: 'Low', medium: 'Medium', high: 'High' };
const SEV_COLOR: Record<Severity, string> = { low: '#6ee7b7', medium: '#fbbf24', high: '#fca5a5' };
const STATUS_LABEL: Record<ItemStatus, string> = { identified: 'Identified', mitigated: 'Mitigated', resolved: 'Resolved' };
const STATUS_COLOR: Record<ItemStatus, string> = { identified: '#fca5a5', mitigated: '#fbbf24', resolved: '#6ee7b7' };

export function SafetyView() {
  const { project } = useStudio();
  const { refreshProject } = useProject();
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<SafetyItem, 'id'>>({ hazard: '', location: '', severity: 'medium', mitigation: '', owner: '', status: 'identified' });

  const settings = (project.settings ?? {}) as ProjectSettings;
  const items = useMemo(() => settings.safety ?? [], [settings.safety]);

  const saveItems = async (next: SafetyItem[]) => {
    try {
      await patchProjectSettings(project.id, { safety: next } as Partial<ProjectSettings>);
      await refreshProject(project.id);
      toast('Safety plan saved', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save', 'error');
    }
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.hazard.trim()) return;
    const item: SafetyItem = { ...draft, id: crypto.randomUUID() };
    await saveItems([...items, item]);
    setDraft({ hazard: '', location: '', severity: 'medium', mitigation: '', owner: '', status: 'identified' });
    setAdding(false);
  };

  const updateItem = async (id: string, patch: Partial<SafetyItem>) => {
    const next = items.map((it) => (it.id === id ? { ...it, ...patch } : it));
    await saveItems(next);
    setEditing(null);
  };

  const removeItem = async (id: string) => {
    await saveItems(items.filter((it) => it.id !== id));
  };

  const counts = useMemo(() => ({
    total: items.length,
    resolved: items.filter((i) => i.status === 'resolved').length,
    high: items.filter((i) => i.severity === 'high' && i.status !== 'resolved').length,
  }), [items]);

  if (items.length === 0 && !adding) {
    return (
      <EmptyState
        icon={<Shield size={26} />}
        title="No safety items yet"
        subtitle="Track hazards, mitigations and who owns them."
        action={<button type="button" className={s.btnPrimary} onClick={() => setAdding(true)}><Plus size={12} /> Add a hazard</button>}
      />
    );
  }

  return (
    <div className={s.stack} style={{ gap: 24, maxWidth: 900 }}>
      <div className={s.toolbar}>
        <div className={s.panelTitle} style={{ marginBottom: 0 }}>
          <Shield size={14} /> Safety & risk
          <span className={s.hint}> · {counts.resolved} of {counts.total} resolved{counts.high > 0 ? ` · ${counts.high} high-risk open` : ''}</span>
        </div>
        {!adding && <button type="button" className={cx(s.btn, s.small)} onClick={() => setAdding(true)}><Plus size={11} /> Add hazard</button>}
      </div>

      {adding && (
        <form className={s.panel} style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }} onSubmit={addItem}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
            <label className={s.stack} style={{ gap: 4, gridColumn: '1 / -1' }}>
              <span className={s.hint}>Hazard</span>
              <input className={s.input} autoFocus placeholder="e.g. Stunt fall, pyrotechnics, working at height" value={draft.hazard} onChange={(e) => setDraft({ ...draft, hazard: e.target.value })} />
            </label>
            <label className={s.stack} style={{ gap: 4 }}>
              <span className={s.hint}>Location</span>
              <input className={s.input} placeholder="Where" value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
            </label>
            <label className={s.stack} style={{ gap: 4 }}>
              <span className={s.hint}>Severity</span>
              <select className={s.select} value={draft.severity} onChange={(e) => setDraft({ ...draft, severity: e.target.value as Severity })}>
                {(['low', 'medium', 'high'] as Severity[]).map((sv) => <option key={sv} value={sv}>{SEV_LABEL[sv]}</option>)}
              </select>
            </label>
            <label className={s.stack} style={{ gap: 4 }}>
              <span className={s.hint}>Owner</span>
              <input className={s.input} placeholder="Who's responsible" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} />
            </label>
          </div>
          <label className={s.stack} style={{ gap: 4 }}>
            <span className={s.hint}>Mitigation</span>
            <textarea className={s.textarea} rows={2} placeholder="What's being done about it" value={draft.mitigation} onChange={(e) => setDraft({ ...draft, mitigation: e.target.value })} />
          </label>
          <div className={s.row} style={{ gap: 8 }}>
            <button type="submit" className={s.btnPrimary} disabled={!draft.hazard.trim()}>Add</button>
            <button type="button" className={cx(s.btnGhost, s.small)} onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </form>
      )}

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item) => {
          const isEditing = editing === item.id;
          return (
            <li key={item.id} className={s.panel} style={{ padding: 12, borderLeft: '3px solid ' + SEV_COLOR[item.severity] }}>
              {isEditing ? (
                <form className={s.stack} style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); void updateItem(item.id, { hazard: String(fd.get('hazard') ?? ''), location: String(fd.get('location') ?? ''), severity: fd.get('severity') as Severity, mitigation: String(fd.get('mitigation') ?? ''), owner: String(fd.get('owner') ?? ''), status: fd.get('status') as ItemStatus }); }}>
                  <input name="hazard" className={s.input} defaultValue={item.hazard} />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
                    <input name="location" className={s.input} defaultValue={item.location} placeholder="Location" />
                    <select name="severity" className={s.select} defaultValue={item.severity}>
                      {(['low', 'medium', 'high'] as Severity[]).map((sv) => <option key={sv} value={sv}>{SEV_LABEL[sv]}</option>)}
                    </select>
                    <input name="owner" className={s.input} defaultValue={item.owner} placeholder="Owner" />
                    <select name="status" className={s.select} defaultValue={item.status}>
                      {(['identified', 'mitigated', 'resolved'] as ItemStatus[]).map((st) => <option key={st} value={st}>{STATUS_LABEL[st]}</option>)}
                    </select>
                  </div>
                  <textarea name="mitigation" className={s.textarea} rows={2} defaultValue={item.mitigation} placeholder="Mitigation" />
                  <div className={s.row} style={{ gap: 8 }}>
                    <button type="submit" className={s.btnPrimary}>Save</button>
                    <button type="button" className={cx(s.btnGhost, s.small)} onClick={() => setEditing(null)}>Cancel</button>
                  </div>
                </form>
              ) : (
                <>
                  <div className={s.row} style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <AlertTriangle size={14} style={{ color: SEV_COLOR[item.severity] }} />
                    <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{item.hazard}</span>
                    <span style={{ color: SEV_COLOR[item.severity], fontSize: 12, fontWeight: 600 }}>{SEV_LABEL[item.severity]}</span>
                    <span style={{ color: STATUS_COLOR[item.status], fontSize: 12, fontWeight: 600 }}>{STATUS_LABEL[item.status]}</span>
                    <button type="button" className={cx(s.btnGhost, s.small)} onClick={() => setEditing(item.id)}>Edit</button>
                    <button type="button" className={cx(s.btnGhost, s.small)} onClick={() => void removeItem(item.id)} aria-label="Remove"><Trash2 size={11} /></button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4, fontSize: 12 }}>
                    {item.location && <span className={s.hint}>Location: {item.location}</span>}
                    {item.owner && <span className={s.hint}>Owner: {item.owner}</span>}
                    {item.mitigation && <span className={s.hint}>Mitigation: {item.mitigation}</span>}
                  </div>
                </>
              )}
            </li>
          );
        })}
</ul>

      <p className={s.hint} style={{ fontSize: 11 }}>
        Safety items are stored with the project. For formal risk assessments, attach the document in Production › Paperwork.
      </p>
    </div>
  );
}
