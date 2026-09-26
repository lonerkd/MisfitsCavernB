'use client';

import React, { useEffect, useState } from 'react';
import { Activity as ActivityIcon, DollarSign } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { supabase } from '@/lib/supabase/client';
import { getProjectActivities, type Activity } from '@/lib/supabase/activity';
import { StageIndicator } from '../ProjectCards';
import { useStudio } from '../StudioContext';
import { SectionHeader } from '../ui';
import s from '../studio.module.css';

type TabId = 'library' | 'scenes' | 'production' | 'share';

/** The project at a glance — every number here is counted from live data. */
export function OverviewTab({ onOpen }: { onOpen: (tab: TabId) => void }) {
  const { project, media, scenes, links, scripts } = useStudio();
  const [activity, setActivity] = useState<Activity[]>([]);

  useEffect(() => {
    let alive = true;
    const load = () => getProjectActivities(project.id, 8).then((a) => { if (alive) setActivity(a); });
    void load();
    // RLS already limits events to what this user may see; reload on ours.
    const channel = supabase
      .channel(`activity:${project.id}:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_feed' }, (p) => {
        if ((p.new as { metadata?: { project_id?: string } })?.metadata?.project_id === project.id) void load();
      })
      .subscribe();
    return () => { alive = false; void supabase.removeChannel(channel); };
  }, [project.id]);

  const budget = (project.budget_items ?? []).reduce((sum, b) => sum + Number(b.amount || 0), 0);
  const linkedScenes = new Set(links.rows.map((l) => l.scene_id)).size;
  const shared = media.rows.filter((m) => m.shared).length;
  const crew = project.crew?.length ?? 0;
  const wrapped = scenes.rows.filter((sc) => sc.status === 'wrapped').length;

  const stats: Array<{ label: string; value: string; tab?: TabId }> = [
    { label: 'Scenes', value: String(scenes.rows.length), tab: 'scenes' },
    { label: 'With references', value: scenes.rows.length ? `${linkedScenes}/${scenes.rows.length}` : '0', tab: 'scenes' },
    { label: 'Library items', value: String(media.rows.length), tab: 'library' },
    { label: 'In share link', value: String(shared), tab: 'share' },
    { label: 'Wrapped', value: scenes.rows.length ? `${wrapped}/${scenes.rows.length}` : '0', tab: 'production' },
    { label: 'Crew', value: String(crew), tab: 'production' },
  ];

  return (
    <section aria-labelledby="overview-title" className={s.stack} style={{ gap: 28 }}>
      <StageIndicator status={project.status} projectType={project.project_type} />
      <SectionHeader
        id="overview-title"
        eyebrow="Overview"
        title={project.title}
        subtitle={project.description || 'No logline yet — add one on the project page; it leads your share link and pitch deck.'}
      />

      <div className={s.stats}>
        {stats.map((st) => (
          <button key={st.label} type="button" className={s.stat} style={{ textAlign: 'left', cursor: 'pointer', font: 'inherit' }} onClick={() => st.tab && onOpen(st.tab)}>
            <div className={s.statValue}>{st.value}</div>
            <div className={s.statLabel}>{st.label}</div>
          </button>
        ))}
      </div>

      <div className="mc-collapse" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 20 }}>
        <div className={s.panel}>
          <div className={s.panelTitle}><DollarSign size={14} /> Budget</div>
          {(project.budget_items ?? []).length ? (
            <>
              <div className={s.statValue}>${budget.toLocaleString()}</div>
              <div className={s.stack} style={{ gap: 6, marginTop: 14 }}>
                {(project.budget_items ?? []).slice(0, 5).map((b) => (
                  <div key={b.id} className={s.row} style={{ justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 11 }}>
                    <span className={s.muted}>{b.category}</span>
                    <span>${Number(b.amount || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className={s.hint}>No budget lines yet. Production → Schedule → “Breakdown → Budget” builds one from the script.</p>
          )}
        </div>

        <div className={s.panel}>
          <div className={s.panelTitle}><ActivityIcon size={14} /> Recent activity</div>
          {activity.length ? (
            <div className={s.stack} style={{ gap: 12 }}>
              {activity.map((a) => (
                <div key={a.id} className={s.row} style={{ alignItems: 'flex-start' }}>
                  <Avatar src={a.profiles?.avatar_url} name={a.profiles?.username || '?'} size={24} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12 }}><strong>{a.profiles?.username || 'Someone'}</strong> <span className={s.muted}>{a.action}</span></div>
                    <div className={s.hint}>{new Date(a.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={s.hint}>Nothing yet. Beats, casting, schedule changes and shares show up here for the whole team.</p>
          )}
        </div>
      </div>

      {scripts.length === 0 && (
        <p className={s.hint}>Start the screenplay in ScriptOS and its scenes appear under Scenes automatically.</p>
      )}
    </section>
  );
}
