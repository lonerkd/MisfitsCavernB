'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Megaphone, Plus, Trash2 } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/Confirm';
import { useProject } from '@/lib/os';
import { addCampaign, deleteCampaign, listUsedPlatforms, updateCampaign } from '@/lib/supabase/campaigns';
import { logActivity } from '@/lib/supabase/activity';
import { useStudio } from '../StudioContext';
import { SectionHeader, cx } from '../ui';
import s from '../studio.module.css';

const STAGES = [
  { id: 'drafting', label: 'Drafting' },
  { id: 'live', label: 'Live' },
  { id: 'wrapped', label: 'Wrapped' },
] as const;
type Stage = (typeof STAGES)[number]['id'];

/** Platforms the team has used on any campaign they can see, most used first (no preset list). */
function useUsedPlatforms(current: string[]) {
  const [used, setUsed] = useState<string[]>([]);
  useEffect(() => {
    let on = true;
    // Suggestions only: without them the platform field is still free text.
    listUsedPlatforms().then((p) => { if (on) setUsed(p); }, () => {});
    return () => { on = false; };
  }, []);
  return useMemo(() => {
    const count = new Map<string, { name: string; n: number }>();
    for (const p of [...used, ...current]) {
      const name = p.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      const c = count.get(key) ?? { name, n: 0 };
      c.n += 1;
      count.set(key, c);
    }
    return [...count.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name)).map((c) => c.name);
  }, [used, current]);
}

/** Release and promotion campaigns — where, for whom, what stage, planned budget and spend. */
export function PromosTab() {
  const { project, userId } = useStudio();
  const { refreshProject } = useProject();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: '', platform: '', audience: '', budget: '' });
  const campaigns = useMemo(() => project.campaigns ?? [], [project.campaigns]);
  const platforms = useUsedPlatforms(useMemo(() => campaigns.map((c) => c.platform), [campaigns]));

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = form.title.trim();
    const platform = form.platform.trim();
    if (!title || !platform || busy) return;
    setBusy(true);
    try {
      await addCampaign({
        projectId: project.id,
        userId,
        title,
        platform,
        audience: form.audience.trim() || null,
        budget: Math.max(0, Number(form.budget) || 0),
      });
      logActivity(`planned the campaign "${title}"`, 'project', project.id);
      await refreshProject(project.id);
      setForm({ title: '', platform: '', audience: '', budget: '' });
      setAdding(false);
    } catch (err) {
      toast((err as { message?: string })?.message || 'Could not add the campaign', 'error');
    } finally {
      setBusy(false);
    }
  };

  const save = async (id: string, patch: { status?: Stage; spend?: number }) => {
    try { await updateCampaign(id, patch); }
    catch (err) { toast((err as { message?: string })?.message || 'Could not save the campaign', 'error'); return; }
    await refreshProject(project.id);
  };

  const remove = async (id: string, title: string) => {
    if (!(await confirm({ title: 'Delete campaign?', message: `“${title}” will be removed for everyone.`, confirmLabel: 'Delete', danger: true }))) return;
    try { await deleteCampaign(id); }
    catch (err) { toast((err as { message?: string })?.message || 'Could not delete the campaign', 'error'); return; }
    await refreshProject(project.id);
  };

  const totalBudget = campaigns.reduce((n, c) => n + Number(c.budget || 0), 0);
  const totalSpend = campaigns.reduce((n, c) => n + Number(c.spend || 0), 0);
  // Where the money goes, per platform.
  const byPlatform = useMemo(() => {
    const m = new Map<string, { budget: number; spend: number; n: number }>();
    for (const c of campaigns) {
      const v = m.get(c.platform) ?? { budget: 0, spend: 0, n: 0 };
      v.budget += Number(c.budget || 0); v.spend += Number(c.spend || 0); v.n += 1;
      m.set(c.platform, v);
    }
    const rows = [...m.entries()];
    rows.sort((a, b) => b[1].budget - a[1].budget || b[1].n - a[1].n);
    return rows;
  }, [campaigns]);
  const maxBudget = Math.max(1, ...byPlatform.map(([, v]) => Math.max(v.budget, v.spend)));

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
        <form onSubmit={add} className={s.panel} style={{ marginBottom: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
            <input aria-label="Campaign title" autoFocus className={s.input} placeholder="Campaign title" maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input aria-label="Platform" className={s.input} placeholder="Where — a festival, press, a channel…" maxLength={60} list="promo-platforms" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} />
            <datalist id="promo-platforms">{platforms.map((p) => <option key={p} value={p} />)}</datalist>
            <input aria-label="Audience" className={s.input} placeholder="Audience" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} />
            <input aria-label="Budget in dollars" className={s.input} type="number" min={0} placeholder="Budget $" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
            <button type="submit" className={s.btnPrimary} disabled={busy || !form.title.trim() || !form.platform.trim()}>{busy ? 'Adding…' : 'Add'}</button>
          </div>
          {platforms.length > 0 && (
            <div className={s.chips} role="group" aria-label="Platforms you’ve used" style={{ marginTop: 10 }}>
              {platforms.slice(0, 10).map((p) => (
                <button key={p} type="button" className={cx(s.chip, form.platform.trim().toLowerCase() === p.toLowerCase() && s.chipOn)} onClick={() => setForm({ ...form, platform: p })}>{p}</button>
              ))}
            </div>
          )}
        </form>
      )}

      {byPlatform.length > 1 && totalBudget > 0 && (
        <div className={s.panel} style={{ marginBottom: 14 }} role="group" aria-label="Budget by platform">
          <div className={s.panelTitle}>Where the budget goes</div>
          <div className={s.stack} style={{ gap: 8 }}>
            {byPlatform.map(([name, v]) => (
              <div key={name} style={{ display: 'grid', gridTemplateColumns: 'minmax(90px, 160px) minmax(0, 1fr) auto', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                <div style={{ position: 'relative', height: 8, borderRadius: 4, background: 'rgba(var(--ink-rgb), 0.05)' }} aria-hidden>
                  <div style={{ position: 'absolute', inset: 0, width: `${(v.budget / maxBudget) * 100}%`, borderRadius: 4, background: 'rgba(129,140,248,0.35)' }} />
                  <div style={{ position: 'absolute', inset: 0, width: `${(v.spend / maxBudget) * 100}%`, borderRadius: 4, background: v.spend > v.budget ? '#ff6b6b' : '#818cf8' }} />
                </div>
                <span className={s.hint} style={{ fontFamily: 'var(--mono)' }}>${v.spend.toLocaleString()} / ${v.budget.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {campaigns.length ? (
        <div className={s.stack} style={{ gap: 10 }}>
          {campaigns.map((c) => (
            <div key={c.id} className={s.panel} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0, flex: '1 1 240px' }}>
                <div className={s.cardMeta} style={{ marginBottom: 6 }}>
                  <span className={cx(s.tag, s.tagStudio)}>{c.platform}</span>
                  {c.target_demographic && <span className={s.tag}>{c.target_demographic}</span>}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{c.title}</div>
              </div>
              <div className={s.chips} role="radiogroup" aria-label={`Stage of ${c.title}`}>
                {STAGES.map((st) => (
                  <button key={st.id} type="button" role="radio" aria-checked={c.status === st.id} className={cx(s.chip, c.status === st.id && s.chipOn)}
                    onClick={() => { if (c.status !== st.id) void save(c.id, { status: st.id }); }}>{st.label}</button>
                ))}
              </div>
              <label className={s.hint} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                Spent $
                <input key={`${c.id}:${c.spend}`} aria-label={`Spent on ${c.title}`} className={s.input} type="number" min={0} style={{ width: 96 }} defaultValue={Number(c.spend || 0)}
                  onBlur={(e) => { const v = Math.max(0, Number(e.target.value) || 0); if (v !== Number(c.spend || 0)) void save(c.id, { spend: v }); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
                {!!c.budget && <span>of ${Number(c.budget).toLocaleString()}</span>}
              </label>
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
