'use client';

import React, { useMemo, useState } from 'react';
import EmptyState from '@/components/ui/EmptyState';
import Link from 'next/link';
import { ChefHat, PenLine, Plus, Trash2, Users } from 'lucide-react';
import { useProject } from '@/lib/os';
import { useToast } from '@/components/ui/Toast';
import { useShootDays } from '@/lib/studio';
import { useStudio } from '../StudioContext';
import { patchProjectSettings } from '@/lib/supabase/progress';
import { cx } from '../ui';
import { ToolHeader } from '../ToolHeader';
import s from '../studio.module.css';
import type { ProjectSettings } from '@/lib/types/settings';

type MealStatus = 'planned' | 'ordered' | 'delivered';

interface MealPlan {
  headcount: number;
  mealTime: string;
  dietary: string;
  vendor: string;
  notes: string;
  status: MealStatus;
}

const STATUS_LABEL: Record<MealStatus, string> = { planned: 'Planned', ordered: 'Ordered', delivered: 'Delivered' };
const STATUS_COLOR: Record<MealStatus, string> = { planned: 'var(--fg-dim)', ordered: '#fbbf24', delivered: '#6ee7b7' };

export function CateringView() {
  const { project, scriptId } = useStudio();
  const { refreshProject } = useProject();
  const shootDays = useShootDays(project.id);
  const { toast } = useToast();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<MealPlan>({ headcount: 0, mealTime: '', dietary: '', vendor: '', notes: '', status: 'planned' });

  const settings = (project.settings ?? {}) as ProjectSettings;
  const catering = settings.catering ?? {};

  const datedDays = useMemo(() => shootDays.rows.filter((d) => d.shoot_date).sort((a, b) => (a.shoot_date ?? '').localeCompare(b.shoot_date ?? '')), [shootDays.rows]);

  if (shootDays.status !== 'loading' && datedDays.length === 0) {
    return (
      <EmptyState
        icon={<ChefHat size={26} />}
        title="No dated shoot days yet"
        subtitle="Set dates on the schedule to plan meals."
        action={scriptId ? <Link href="/studio?tab=production&view=schedule" className={s.btnPrimary}><PenLine size={12} /> Open schedule</Link> : undefined}
      />
    );
  }

  const save = async (dayKey: string, plan: MealPlan) => {
    const next = { ...catering, [dayKey]: plan };
    try {
      await patchProjectSettings(project.id, { catering: next } as Partial<ProjectSettings>);
      await refreshProject(project.id);
      toast('Meal plan saved', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save', 'error');
    }
  };

  const remove = async (dayKey: string) => {
    const next = { ...catering };
    delete next[dayKey];
    try {
      await patchProjectSettings(project.id, { catering: next } as Partial<ProjectSettings>);
      await refreshProject(project.id);
      toast('Meal plan removed', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not remove', 'error');
    }
  };

  const startEdit = (dayKey: string) => {
    const existing = catering[dayKey];
    setDraft(existing ?? { headcount: 0, mealTime: '', dietary: '', vendor: '', notes: '', status: 'planned' });
    setEditing(dayKey);
  };

  return (
    <div className={s.stack} style={{ gap: 24, maxWidth: 900 }}>
      <ToolHeader icon={<ChefHat size={16} />} eyebrow="Shoot day" title="Catering & meals" purpose="Meals and dietary needs for each shoot day." accent={project.accent_color} summary={<>{Object.keys(catering).length} of {datedDays.length} planned</>} />

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {datedDays.map((day) => {
          const key = String(day.day_number);
          const plan = catering[key];
          const isEditing = editing === key;
          return (
            <li key={day.id} className={s.panel} style={{ padding: 12 }}>
              <div className={s.row} style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: plan || isEditing ? 8 : 0 }}>
                <span style={{ fontFamily: 'var(--display)', fontSize: '1.05rem' }}>Day {day.day_number}</span>
                <span className={s.hint}>{day.shoot_date ? new Date(day.shoot_date + 'T00:00').toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }) : ''}</span>
                {plan && !isEditing && (
                  <>
                    <span className={s.hint} style={{ marginLeft: 'auto' }}>
                      <Users size={11} style={{ verticalAlign: -2 }} /> {plan.headcount} · {plan.mealTime || 'no time'}
                    </span>
                    <span style={{ color: STATUS_COLOR[plan.status], fontSize: 12, fontWeight: 600 }}>{STATUS_LABEL[plan.status]}</span>
                  </>
                )}
                {!isEditing && (
                  <button type="button" className={cx(s.btnGhost, s.small)} onClick={() => startEdit(key)}>
                    {plan ? 'Edit' : <><Plus size={11} /> Plan meal</>}
                  </button>
                )}
                {plan && !isEditing && (
                  <button type="button" className={cx(s.btnGhost, s.small)} onClick={() => void remove(key)} aria-label="Remove meal plan">
                    <Trash2 size={11} />
                  </button>
                )}
              </div>

              {plan && !isEditing && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
                  {plan.vendor && <span className={s.hint}>Vendor: {plan.vendor}</span>}
                  {plan.dietary && <span className={s.hint}>Dietary: {plan.dietary}</span>}
                  {plan.notes && <span className={s.hint}>{plan.notes}</span>}
                </div>
              )}

              {isEditing && (
                <form className={s.stack} style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); void save(key, draft); setEditing(null); }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
                    <label className={s.stack} style={{ gap: 4 }}>
                      <span className={s.hint}>Headcount</span>
                      <input type="number" min={0} className={s.input} value={draft.headcount} onChange={(e) => setDraft({ ...draft, headcount: Number(e.target.value) || 0 })} />
                    </label>
                    <label className={s.stack} style={{ gap: 4 }}>
                      <span className={s.hint}>Meal time</span>
                      <input className={s.input} placeholder="12:30" value={draft.mealTime} onChange={(e) => setDraft({ ...draft, mealTime: e.target.value })} />
                    </label>
                    <label className={s.stack} style={{ gap: 4 }}>
                      <span className={s.hint}>Vendor</span>
                      <input className={s.input} placeholder="Caterer name" value={draft.vendor} onChange={(e) => setDraft({ ...draft, vendor: e.target.value })} />
                    </label>
                    <label className={s.stack} style={{ gap: 4 }}>
                      <span className={s.hint}>Status</span>
                      <select className={s.select} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as MealStatus })}>
                        {(['planned', 'ordered', 'delivered'] as MealStatus[]).map((st) => <option key={st} value={st}>{STATUS_LABEL[st]}</option>)}
                      </select>
                    </label>
                  </div>
                  <label className={s.stack} style={{ gap: 4 }}>
                    <span className={s.hint}>Dietary requirements</span>
                    <input className={s.input} placeholder="e.g. 2 vegetarian, 1 gluten-free" value={draft.dietary} onChange={(e) => setDraft({ ...draft, dietary: e.target.value })} />
                  </label>
                  <label className={s.stack} style={{ gap: 4 }}>
                    <span className={s.hint}>Notes</span>
                    <textarea className={s.textarea} rows={2} placeholder="Menu, allergies, delivery location…" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
                  </label>
                  <div className={s.row} style={{ gap: 8 }}>
                    <button type="submit" className={s.btnPrimary}>Save</button>
                    <button type="button" className={cx(s.btnGhost, s.small)} onClick={() => setEditing(null)}>Cancel</button>
                  </div>
                </form>
              )}
            </li>
          );
        })}
      </ul>

      <p className={s.hint} style={{ fontSize: 11 }}>
        Meal plans are stored with the project. Catering expenses can be tracked in Production › Money.
      </p>
    </div>
  );
}
