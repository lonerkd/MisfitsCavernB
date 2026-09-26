'use client';

import React, { useState } from 'react';
import { Megaphone, Plus, Trash2 } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/Confirm';
import { useProject } from '@/lib/os';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/supabase/activity';
import { useStudio } from '../StudioContext';
import { SectionHeader, cx } from '../ui';
import s from '../studio.module.css';

const PLATFORMS = ['Instagram', 'X / Twitter', 'YouTube', 'TikTok', 'Festival', 'Press'];

/** Release and promotion campaigns — planned budgets and spend. */
export function PromosTab() {
  const { project, userId } = useStudio();
  const { refreshProject } = useProject();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: '', platform: PLATFORMS[0], audience: '', budget: '' });
  const campaigns = project.campaigns ?? [];

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.from('campaigns').insert({
        project_id: project.id,
        title: form.title.trim(),
        platform: form.platform,
        status: 'drafting',
        created_by: userId,
        target_demographic: form.audience.trim() || null,
        budget: Number(form.budget) || 0,
      });
      if (error) throw new Error(error.message);
      logActivity(`planned the campaign "${form.title.trim()}"`, 'project', project.id);
      await refreshProject(project.id);
      setForm({ title: '', platform: PLATFORMS[0], audience: '', budget: '' });
      setAdding(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not add the campaign', 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string, title: string) => {
    if (!(await confirm({ title: 'Delete campaign?', message: `“${title}” will be removed for everyone.`, confirmLabel: 'Delete', danger: true }))) return;
    const { error } = await supabase.from('campaigns').delete().eq('id', id);
    if (error) { toast(error.message, 'error'); return; }
    await refreshProject(project.id);
  };

  const totalBudget = campaigns.reduce((n, c) => n + Number(c.budget || 0), 0);
  const totalSpend = campaigns.reduce((n, c) => n + Number(c.spend || 0), 0);

  return (
    <section aria-labelledby="promos-title">
      <SectionHeader
        id="promos-title"
        eyebrow="Distribution"
        title="Promos"
        subtitle={campaigns.length ? `${campaigns.length} campaign${campaigns.length === 1 ? '' : 's'}${totalBudget ? ` · $${totalSpend.toLocaleString()} of $${totalBudget.toLocaleString()} spent` : ''}` : 'Plan the rollout: festivals, press and social campaigns.'}
        actions={<button type="button" className={s.btn} aria-expanded={adding} onClick={() => setAdding((a) => !a)}><Plus size={12} /> New campaign</button>}
      />
      {adding && (
        <form onSubmit={add} className={s.panel} style={{ marginBottom: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
          <input aria-label="Campaign title" autoFocus className={s.input} placeholder="Campaign title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <select aria-label="Platform" className={s.select} value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
            {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
          </select>
          <input aria-label="Audience" className={s.input} placeholder="Audience" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} />
          <input aria-label="Budget in dollars" className={s.input} type="number" min={0} placeholder="Budget $" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
          <button type="submit" className={s.btnPrimary} disabled={busy || !form.title.trim()}>{busy ? 'Adding…' : 'Add'}</button>
        </form>
      )}
      {campaigns.length ? (
        <div className={s.stack} style={{ gap: 10 }}>
          {campaigns.map((c) => (
            <div key={c.id} className={s.panel} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
              <div style={{ minWidth: 0 }}>
                <div className={s.cardMeta} style={{ marginBottom: 6 }}>
                  <span className={cx(s.tag, s.tagStudio)}>{c.platform}</span>
                  <span className={s.tag}>{c.status}</span>
                  {c.target_demographic && <span className={s.tag}>{c.target_demographic}</span>}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{c.title}</div>
                {!!c.budget && <div className={s.hint} style={{ marginTop: 4 }}>${Number(c.spend || 0).toLocaleString()} spent of ${Number(c.budget).toLocaleString()}</div>}
              </div>
              <button type="button" className={s.iconBtn} onClick={() => void remove(c.id, c.title)} aria-label={`Delete ${c.title}`}><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Megaphone size={26} />} title="No campaigns yet" subtitle="Add festival submissions, press pushes and social campaigns to plan the release." />
      )}
    </section>
  );
}
