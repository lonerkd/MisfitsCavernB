'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Briefcase, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import * as hub from '@/lib/supabase/project-hub';
import { getProductionData, type BudgetRow, type CrewRow, type FestivalRow, type PortfolioRow, type TaskRow, type TimelineRow } from '@/lib/supabase/project-hub';
import { breakdown, costByCategory } from '@/lib/breakdown';
import { createJob, getBudgetItemIdsWithJobs } from '@/lib/supabase/jobs';
import { notify } from '@/lib/supabase/notifications';
import { usePillZone } from '@/lib/os/PillContext';
import type { ProjectSettings } from '@/lib/types/settings';
import { SCRIPT_FORMAT_LABELS } from '@/lib/types/settings';
import type { ScriptFormat } from '@/lib/scriptos/parser';
import { awaitOSUser } from '@/lib/os';
import { announceProgressChange } from '@/lib/supabase/progress';
import { CraftPicker } from '@/components/crafts/CraftPicker';
import { loadCrafts, suggestCraft } from '@/lib/crafts/crafts';

const SCRIPT_FORMATS: ScriptFormat[] = ['screenplay', 'teleplay', 'stage-play', 'treatment', 'podcast', 'doc-outline'];
const FESTIVAL_STATUSES: FestivalRow['status'][] = ['planned', 'submitted', 'accepted', 'rejected'];
const FESTIVAL_STATUS_COLOR: Record<FestivalRow['status'], string> = {
  planned: '#6b7280', submitted: '#f59e0b', accepted: '#10b981', rejected: '#ef4444',
};

const MINI_INPUT: React.CSSProperties = { background: 'rgba(var(--ink-rgb), 0.04)', border: '1px solid rgba(var(--ink-rgb), 0.08)', borderRadius: 4, padding: '2px 4px', fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', colorScheme: 'dark' };

/** Everything the production manager shows, and which budget lines are already posted as jobs. */
async function fetchProjectPage(projectId: string) {
  const [data, posted] = await Promise.all([getProductionData(projectId), getBudgetItemIdsWithJobs(projectId)]);
  return { ...data, posted };
}

export function ProductionManager({ projectId, projectTitle, accent, isOwner }: { projectId: string; projectTitle: string; accent: string; isOwner: boolean }) {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [budget, setBudget] = useState<BudgetRow[]>([]);
  const [timeline, setTimeline] = useState<TimelineRow[]>([]);
  const [crew, setCrew] = useState<CrewRow[]>([]);
  const [owner, setOwner] = useState<{ id: string; username: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [breakdownNote, setBreakdownNote] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const [postedBudgetIds, setPostedBudgetIds] = useState<Set<string>>(new Set());
  const [postingBudgetId, setPostingBudgetId] = useState<string | null>(null);

  const [portfolio, setPortfolio] = useState<PortfolioRow[]>([]);
  const [settings, setSettings] = useState<ProjectSettings>({ modules: { scriptos: true, studio: true, lounge: true, portfolio: true, distribution: true } });
  const [festivals, setFestivals] = useState<FestivalRow[]>([]);

  // Every write bumps this. A load that a write overtook would put back the
  // list from before it (a task added while the panel was still loading
  // vanished), so such a load is dropped and asked again.
  const writes = useRef(0);
  const load = React.useCallback((): Promise<void> => {
    const run = (): Promise<void> => {
      const at = writes.current;
      return fetchProjectPage(projectId).then((d) => {
        if (writes.current !== at) return run();
        setTasks(d.tasks);
        setBudget(d.budget);
        setTimeline(d.timeline);
        setCrew(d.crew);
        setPortfolio(d.portfolio);
        setPostedBudgetIds(d.posted);
        if (d.settings) setSettings(d.settings);
        setFestivals(d.festivals);
        setOwner(d.owner);
      }, (e: { message?: string }) => setErr(e?.message || 'Could not load the production details.'));
    };
    return run();
  }, [projectId]);

  useEffect(() => {
    awaitOSUser().then((user) => setUserId(user?.id ?? null));
    load();
  }, [load]);

  // Tasks, budget, crew and festivals count toward the phase milestones.
  const progressKey = `${tasks.map(t => (t.completed ? 1 : 0)).join('')}|${budget.length}|${crew.length}|${festivals.map(f => f.status).join(',')}`;
  useEffect(() => { announceProgressChange(projectId); }, [projectId, progressKey]);

  // A write's failure, shown above the panel (null when it worked).
  const attempt = async (write: () => Promise<unknown>): Promise<boolean> => {
    writes.current += 1;
    try { await write(); return true; }
    catch (e) { setErr((e as { message?: string })?.message || 'That did not save.'); return false; }
  };

  const addTask = async (title: string) => {
    let row: TaskRow | undefined;
    if (await attempt(async () => { row = await hub.addTask(projectId, title); })) setTasks(p => [...p, row!]);
  };
  const toggleTask = async (t: TaskRow) => {
    setTasks(p => p.map(x => x.id === t.id ? { ...x, completed: !t.completed } : x));
    if (!await attempt(() => hub.updateTask(t.id, { completed: !t.completed }))) setTasks(p => p.map(x => x.id === t.id ? { ...x, completed: t.completed } : x));
  };
  const setTaskField = async (t: TaskRow, patch: Partial<Pick<TaskRow, 'assigned_to' | 'due_date'>>) => {
    setTasks(p => p.map(x => x.id === t.id ? { ...x, ...patch } : x));
    if (!await attempt(() => hub.updateTask(t.id, patch))) { setTasks(p => p.map(x => x.id === t.id ? t : x)); return; }
    if (patch.assigned_to && patch.assigned_to !== t.assigned_to) {
      notify(patch.assigned_to, { type: 'task', title: `You were assigned “${t.title}”`, body: projectTitle, link: `/projects/${projectId}` }, userId);
    }
  };
  const delTask = async (id: string) => {
    if (!await confirm('Delete this task? This cannot be undone.')) return;
    const prev = tasks;
    setTasks(p => p.filter(x => x.id !== id));
    if (!await attempt(() => hub.deleteTask(id))) setTasks(prev);
  };

  const addBudget = async (category: string, amount: number) => {
    let row: BudgetRow | undefined;
    if (await attempt(async () => { row = await hub.addBudgetItem(projectId, userId, category, amount); })) setBudget(p => [...p, row!]);
  };
  const delBudget = async (id: string) => {
    if (!await confirm('Delete this budget line? This cannot be undone.')) return;
    const prev = budget;
    setBudget(p => p.filter(x => x.id !== id));
    if (!await attempt(() => hub.deleteBudgetItem(id))) setBudget(prev);
  };

  const postJobFromBudget = async (b: BudgetRow) => {
    if (!userId || postedBudgetIds.has(b.id)) return;
    setPostingBudgetId(b.id);
    writes.current += 1;
    try {
      // The job's craft: the one this budget line is about (a job needs one from the crafts list).
      const craft = suggestCraft(b.category, await loadCrafts());
      await createJob(projectId, userId, b.category.replace(/^Breakdown · /, ''), craft, '', Number(b.amount) || undefined, b.id);
      setPostedBudgetIds(prev => new Set(prev).add(b.id));
      toast(`Posted "${b.category}" to the Jobs board`, 'success');
    } catch (e: any) {
      toast(e.message || 'Could not post this as a job', 'error');
    } finally {
      setPostingBudgetId(null);
    }
  };
  const setActual = async (id: string, actual: number | null) => {
    const before = budget.find(x => x.id === id)?.actual_cost ?? null;
    setBudget(p => p.map(x => x.id === id ? { ...x, actual_cost: actual } : x));
    if (!await attempt(() => hub.setBudgetActual(id, actual))) setBudget(p => p.map(x => x.id === id ? { ...x, actual_cost: before } : x));
  };

  // The budget's breakdown lines come from the breakdown itself: each
  // element's cost, or its category's unit cost (Studio › Production › Breakdown).
  const syncFromBreakdown = async () => {
    setAnalyzing(true); setErr(null);
    try {
      const [cats, els] = await Promise.all([breakdown.listCategories(projectId), breakdown.listElements(projectId)]);
      const costs = costByCategory(cats, els);
      if (!els.length) { setBreakdownNote('Nothing tagged yet — break the script down in ScriptOS (tag mode) first.'); return; }
      const r = await breakdown.syncBudget(projectId, costs.map((c) => ({ label: c.category.label, amount: c.amount })));
      await load();
      const unpriced = costs.reduce((n, c) => n + c.unpriced, 0);
      setBreakdownNote(`${els.length} elements · $${Math.round(costs.reduce((n, c) => n + c.amount, 0)).toLocaleString()}${unpriced ? ` · ${unpriced} still unpriced` : ''}${r.added + r.updated + r.removed ? '' : ' · already up to date'}`);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const addTimeline = async (title: string, start: string, end: string) => {
    let row: TimelineRow | undefined;
    if (await attempt(async () => { row = await hub.addMilestone(projectId, userId, title, start, end); })) setTimeline(p => [...p, row!]);
  };
  const delTimeline = async (id: string) => {
    if (!await confirm('Delete this milestone? This cannot be undone.')) return;
    const prev = timeline;
    setTimeline(p => p.filter(x => x.id !== id));
    if (!await attempt(() => hub.deleteMilestone(id))) setTimeline(prev);
  };

  const addCrew = async (username: string, craft: string | null) => {
    let result: 'added' | 'no-user' = 'no-user';
    if (!await attempt(async () => { result = await hub.addCrewByUsername(projectId, username, craft); })) return;
    if (result === 'no-user') return setErr(`No user "${username}"`);
    setErr(null);
    load();
  };
  const delCrew = async (id: string) => {
    if (!await confirm('Remove this crew member from the project?')) return;
    const prev = crew;
    setCrew(p => p.filter(x => x.id !== id));
    if (!await attempt(() => hub.removeCrewRow(id))) setCrew(prev);
  };

  const saveSettings = async (next: ProjectSettings) => {
    const prev = settings;
    setSettings(next);
    if (!await attempt(() => hub.saveProjectSettings(projectId, next))) setSettings(prev);
  };
  const setDefaultFormat = (format: ScriptFormat | '') => {
    saveSettings({ ...settings, defaultScriptFormat: format || undefined });
  };
  const toggleModule = (key: keyof ProjectSettings['modules']) => {
    saveSettings({ ...settings, modules: { ...settings.modules, [key]: !settings.modules[key] } });
  };

  // Festivals live in one jsonb column: write the whole list, roll back on failure.
  const saveFestivals = async (next: FestivalRow[]) => {
    const prev = festivals;
    setFestivals(next);
    if (!await attempt(() => hub.saveFestivals(projectId, next))) setFestivals(prev);
  };
  const addFestival = (name: string, deadline: string) => {
    if (!name.trim()) return;
    saveFestivals([...festivals, { id: crypto.randomUUID(), name: name.trim(), deadline: deadline || undefined, status: 'planned' }]);
  };
  const setFestivalStatus = (id: string, status: FestivalRow['status']) =>
    saveFestivals(festivals.map(f => f.id === id ? { ...f, status } : f));
  const delFestival = async (id: string) => {
    if (!await confirm('Remove this festival submission?')) return;
    saveFestivals(festivals.filter(f => f.id !== id));
  };

  // Who a task can go to: the owner and the crew.
  const people = [
    ...(owner ? [owner] : []),
    ...crew.filter(c => c.user_id !== owner?.id).map(c => ({ id: c.user_id, username: c.profiles?.username || 'Crew' })),
  ];

  const totalBudget = budget.reduce((s, b) => s + Number(b.amount || 0), 0);
  const totalActual = budget.reduce((s, b) => s + Number(b.actual_cost || 0), 0);
  const hasActuals = budget.some(b => b.actual_cost != null);

  return (
    <div style={{ marginTop: 40 }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(7.5px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 14 }}>Production Management</div>
      {err && <div style={{ color: '#ff5555', fontFamily: 'var(--mono)', fontSize: 11, marginBottom: 12 }}>⚠ {err}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>

        <Panel title="Tasks" accent={accent}>
          {tasks.length === 0 && <Empty>No tasks yet</Empty>}
          {tasks.map(t => (
            <div key={t.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Row>
              <button onClick={() => toggleTask(t)} aria-label="toggle" style={{ background: 'none', border: `1px solid ${t.completed ? '#10b981' : 'rgba(var(--ink-rgb), 0.25)'}`, borderRadius: 4, width: 15, height: 15, cursor: 'pointer', color: 'var(--ok)', fontSize: 11, lineHeight: 1, flexShrink: 0 }}>{t.completed ? '✓' : ''}</button>
              <span style={{ flex: 1, minWidth: 0, fontSize: 11, color: t.completed ? 'var(--fg-dim)' : 'var(--fg)', textDecoration: t.completed ? 'line-through' : 'none' }}>{t.title}</span>
              <DelBtn onClick={() => delTask(t.id)} />
            </Row>
            <div style={{ display: 'flex', gap: 6, paddingLeft: 23 }}>
                <input
                  type="date"
                  value={t.due_date ?? ''}
                  onChange={e => setTaskField(t, { due_date: e.target.value || null })}
                  aria-label={`Due date for ${t.title}`}
                  title="Due date"
                  style={{ ...MINI_INPUT, width: 104, color: !t.completed && t.due_date && t.due_date < new Date().toISOString().slice(0, 10) ? '#ff6b6b' : 'var(--fg-dim)' }}
                />
                <select
                  value={t.assigned_to ?? ''}
                  onChange={e => setTaskField(t, { assigned_to: e.target.value || null })}
                  aria-label={`Assignee for ${t.title}`}
                  style={{ ...MINI_INPUT, width: 92 }}
                >
                  <option value="">Unassigned</option>
                  {people.map(p => <option key={p.id} value={p.id}>{p.username}</option>)}
                </select>
            </div>
            </div>
          ))}
          <AddForm placeholder="Add a task…" fields={['text']} onSubmit={(v) => v[0] && addTask(v[0])} accent={accent} />
        </Panel>

        <Panel title="Budget" accent={accent} headerRight={totalBudget > 0 ? `$${totalBudget.toLocaleString()}` : undefined}>
          {budget.length === 0 && <Empty>No budget items</Empty>}
          {budget.length > 0 && (
            <p style={{ fontFamily: 'var(--mono)', fontSize: 'max(9.5px, var(--mc-min-font, 0px))', color: 'var(--fg-muted)', margin: '0 0 8px' }}>
              Actuals follow what’s paid in <Link href="/studio?tab=production&view=money" style={{ color: 'var(--fg)', textDecoration: 'underline' }}>Studio › Money</Link> — spend, vendors and timesheets.
            </p>
          )}
          {budget.map(b => (
            <BudgetRowItem
              key={b.id} item={b} posted={postedBudgetIds.has(b.id)} posting={postingBudgetId === b.id}
              onSetActual={actual => setActual(b.id, actual)}
              onPostJob={() => postJobFromBudget(b)}
              onDelete={() => delBudget(b.id)}
            />
          ))}
          {hasActuals && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, paddingTop: 6, borderTop: '1px solid rgba(var(--ink-rgb), 0.06)', fontFamily: 'var(--mono)', fontSize: 11 }}>
              <span style={{ color: 'var(--fg-dim)' }}>Actual ${totalActual.toLocaleString()} / Planned ${totalBudget.toLocaleString()}</span>
              <span style={{ color: totalActual > totalBudget ? 'var(--danger)' : 'var(--ok)' }}>{totalActual > totalBudget ? '+' : ''}{(totalActual - totalBudget).toLocaleString()}</span>
            </div>
          )}
          <AddForm placeholder="Category" second="Amount" fields={['text', 'number']} onSubmit={(v) => v[0] && addBudget(v[0], Number(v[1] || 0))} accent={accent} />

          <button onClick={syncFromBreakdown} disabled={analyzing} style={{ marginTop: 8, width: '100%', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: 'var(--violet)', borderRadius: 8, padding: '6px 10px', cursor: analyzing ? 'wait' : 'pointer', fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 1 }}>
            {analyzing ? 'READING THE BREAKDOWN…' : '✦ UPDATE FROM THE BREAKDOWN'}
          </button>
          <div style={{ marginTop: 6, fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', lineHeight: 1.5 }}>
            {breakdownNote ?? 'Writes one “Breakdown · …” line per category from element costs. '}
            {' '}<Link href="/studio?tab=production&view=breakdown" className="mc-hit" style={{ color: 'var(--violet)', textDecoration: 'underline', textUnderlineOffset: 2 }}>Open the breakdown →</Link>
          </div>
        </Panel>

        <Panel title="Timeline" accent={accent}>
          {timeline.length === 0 && <Empty>No milestones</Empty>}
          {timeline.map(tl => (
            <Row key={tl.id}>
              <span style={{ flex: 1, fontSize: 11 }}>{tl.title}</span>
              {tl.start_date && <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)' }}>{new Date(tl.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
              <DelBtn onClick={() => delTimeline(tl.id)} />
            </Row>
          ))}
          <AddForm placeholder="Milestone" fields={['text', 'date', 'date']} dateLabels={['Start', 'End']} onSubmit={(v) => v[0] && addTimeline(v[0], v[1], v[2])} accent={accent} />
        </Panel>

        <Panel title="Crew" accent={accent}>
          {crew.length === 0 && <Empty>No crew yet</Empty>}
          {crew.map(c => (
            <Row key={c.id}>
              <span style={{ flex: 1, fontSize: 11 }}>{c.profiles?.username || 'Unknown'}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)' }}>{c.craft || (c.role === 'lead' ? 'Lead' : 'Crew')}</span>
              {isOwner && <DelBtn onClick={() => delCrew(c.id)} />}
            </Row>
          ))}
          {isOwner && <AddCrewForm accent={accent} onAdd={addCrew} />}
        </Panel>

        <Panel title="Portfolio" accent={accent}>
          {portfolio.length === 0 ? (
            <>
              <Empty>No pitch board yet</Empty>
              <Link href={`/projects/${projectId}/pitch`} style={{ marginTop: 4, width: '100%', boxSizing: 'border-box', display: 'block', textAlign: 'center', textDecoration: 'none', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', color: 'var(--violet)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 1 }}>
                ✦ BUILD PITCH BOARD
              </Link>
            </>
          ) : (
            portfolio.map(p => (
              <Row key={p.id}>
                <span style={{ flex: 1, fontSize: 11 }}>{p.title}</span>
                <Link href={`/projects/${projectId}/pitch`} style={{ fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', color: accent, textDecoration: 'none' }}>EDIT BOARD</Link>
                <Link href={`/p/${p.share_token}`} aria-label="view" style={{ color: 'var(--fg-dim)', display: 'flex' }}><ExternalLink size={12} /></Link>
              </Row>
            ))
          )}
        </Panel>

        <Panel title="Festival Submissions" accent={accent}>
          {festivals.length === 0 && <Empty>No submissions tracked yet</Empty>}
          {festivals.map(f => (
            <Row key={f.id}>
              <span style={{ flex: 1, fontSize: 11 }}>{f.name}</span>
              {f.deadline && <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)' }}>{new Date(f.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
              <select
                value={f.status}
                disabled={!isOwner}
                onChange={e => setFestivalStatus(f.id, e.target.value as FestivalRow['status'])}
                aria-label={`${f.name} submission status`}
                style={{ background: `${FESTIVAL_STATUS_COLOR[f.status]}18`, border: `1px solid ${FESTIVAL_STATUS_COLOR[f.status]}40`, color: FESTIVAL_STATUS_COLOR[f.status], borderRadius: 4, padding: '2px 4px', fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', textTransform: 'uppercase' }}
              >
                {FESTIVAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {isOwner && <DelBtn onClick={() => delFestival(f.id)} />}
            </Row>
          ))}
          {isOwner && <AddForm placeholder="Festival name" fields={['text', 'date']} dateLabels={['Deadline']} onSubmit={(v) => v[0] && addFestival(v[0], v[1])} accent={accent} />}
        </Panel>

        {isOwner && <Panel title="Settings" accent={accent}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', letterSpacing: 1, marginBottom: 4 }}>Default script format</div>
          <select
            value={settings.defaultScriptFormat || ''}
            onChange={e => setDefaultFormat(e.target.value as ScriptFormat | '')}
            aria-label="Default script format"
            style={{ width: '100%', background: 'rgba(var(--ink-rgb), 0.04)', border: '1px solid rgba(var(--ink-rgb), 0.08)', borderRadius: 8, padding: '6px 8px', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 11, marginBottom: 12 }}
          >
            <option value="">Use the format’s default</option>
            {SCRIPT_FORMATS.map(f => <option key={f} value={f}>{SCRIPT_FORMAT_LABELS[f]}</option>)}
          </select>

          <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', letterSpacing: 1, marginBottom: 6 }}>Ecosystem modules</div>
          {([
            ['scriptos', 'ScriptOS'], ['studio', 'Studio'], ['lounge', 'Lounge'],
            ['portfolio', 'Portfolio'], ['distribution', 'Distribution'],
          ] as [keyof ProjectSettings['modules'], string][]).map(([key, label]) => (
            <Row key={key}>
              <span style={{ flex: 1, fontSize: 11 }}>{label}</span>
              <button
                onClick={() => toggleModule(key)}
                className="mc-hit"
                role="switch"
                aria-checked={settings.modules[key]}
                aria-label={`toggle ${label}`}
                style={{
                  width: 32, height: 18, borderRadius: 9999, position: 'relative', cursor: 'pointer', flexShrink: 0,
                  background: settings.modules[key] ? `${accent}40` : 'rgba(var(--ink-rgb), 0.08)',
                  border: `1px solid ${settings.modules[key] ? accent : 'rgba(var(--ink-rgb), 0.15)'}`,
                }}
              >
                <div style={{
                  width: 12, height: 12, borderRadius: '50%', background: settings.modules[key] ? accent : 'var(--fg-dim)',
                  position: 'absolute', top: 2, left: settings.modules[key] ? 17 : 2, transition: 'left 0.18s',
                }} />
              </button>
            </Row>
          ))}
        </Panel>}
      </div>
    </div>
  );
}

function Panel({ title, accent, headerRight, children }: { title: string; accent: string; headerRight?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--glass)', border: '1px solid rgba(var(--ink-rgb), 0.06)', borderRadius: 14, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 2, textTransform: 'uppercase', color: accent }}>{title}</span>
        {headerRight && <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: 'var(--fg)' }}>{headerRight}</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>{children}</div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{children}</div>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', padding: '2px 0' }}>{children}</div>;
}
function DelBtn({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-label="Delete" style={{ background: 'none', border: 'none', color: 'var(--fg-dim)', cursor: 'pointer', fontSize: 13, lineHeight: 1, flexShrink: 0, minWidth: 24, minHeight: 24 }} onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}>×</button>;
}

function BudgetRowItem({
  item, posted, posting, onSetActual, onPostJob, onDelete,
}: {
  item: BudgetRow;
  posted: boolean;
  posting: boolean;
  onSetActual: (actual: number | null) => void;
  onPostJob: () => void;
  onDelete: () => void;
}) {
  const over = item.actual_cost != null && Number(item.actual_cost) > Number(item.amount);
  const zoneHandlers = usePillZone({
    module: 'home',
    title: item.category,
    accent: over ? '#ff6b6b' : '#8b5cf6',
    fields: [
      { label: 'Planned', value: `$${Number(item.amount).toLocaleString()}` },
      ...(item.actual_cost != null ? [{ label: 'Actual', value: `$${Number(item.actual_cost).toLocaleString()}`, color: over ? 'var(--danger)' : undefined }] : []),
    ],
    actions: posted ? [] : [{ id: 'post-job', label: '→ Post as Job', onClick: onPostJob }],
  }, 2);

  return (
    <div onMouseEnter={zoneHandlers.onMouseEnter} onMouseLeave={zoneHandlers.onMouseLeave} onClick={zoneHandlers.onClick}>
      <Row>
        <span style={{ flex: 1, fontSize: 11 }}>{item.category}</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)' }} title="planned">${Number(item.amount).toLocaleString()}</span>
        <input
          type="number"
          defaultValue={item.actual_cost ?? ''}
          placeholder="actual"
          onBlur={(e) => { const v = e.target.value.trim(); onSetActual(v === '' ? null : Number(v)); }}
          style={{ width: 64, background: 'rgba(var(--ink-rgb), 0.04)', border: `1px solid ${over ? 'rgba(255,80,80,0.5)' : 'rgba(var(--ink-rgb), 0.08)'}`, borderRadius: 4, padding: '3px 5px', color: over ? 'var(--danger)' : 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 11, textAlign: 'right', outline: 'none' }}
        />
        <button
          onClick={onPostJob}
          disabled={posted || posting}
          title={posted ? 'Already posted to Jobs' : 'Post this line as an open Jobs listing'}
          aria-label="Post as job"
          style={{
            background: posted ? 'rgba(16,185,129,0.1)' : 'rgba(var(--ink-rgb), 0.04)',
            border: `1px solid ${posted ? 'rgba(16,185,129,0.3)' : 'rgba(var(--ink-rgb), 0.1)'}`,
            borderRadius: 4, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: posted ? 'default' : 'pointer', flexShrink: 0,
            color: posted ? 'var(--ok)' : 'var(--fg-dim)',
            opacity: posting ? 0.5 : 1,
          }}
        >
          <Briefcase size={11} />
        </button>
        <DelBtn onClick={onDelete} />
      </Row>
    </div>
  );
}

function AddForm({ placeholder, second, fields, dateLabels, onSubmit, accent }: { placeholder: string; second?: string; fields: string[]; dateLabels?: string[]; onSubmit: (vals: string[]) => void; accent: string }) {
  const [vals, setVals] = useState<string[]>(fields.map(() => ''));
  const set = (i: number, v: string) => setVals(p => p.map((x, idx) => idx === i ? v : x));
  const submit = () => { onSubmit(vals); setVals(fields.map(() => '')); };
  const inputStyle: React.CSSProperties = { flex: 1, minWidth: 0, background: 'rgba(var(--ink-rgb), 0.04)', border: '1px solid rgba(var(--ink-rgb), 0.08)', borderRadius: 8, padding: '6px 8px', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 11, outline: 'none' };
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
      {fields.map((f, i) => (
        <input
          key={i}
          type={f === 'number' ? 'number' : f === 'date' ? 'date' : 'text'}
          value={vals[i]}
          onChange={e => set(i, e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder={i === 0 ? placeholder : i === 1 ? (second || dateLabels?.[0] || '') : (dateLabels?.[1] || '')}
          style={{ ...inputStyle, flex: f === 'date' ? '0 0 110px' : f === 'number' ? '0 0 90px' : 1 }}
        />
      ))}
      <button onClick={submit} aria-label="add" style={{ flexShrink: 0, background: `${accent}1a`, border: `1px solid ${accent}40`, color: accent, borderRadius: 8, padding: '0 12px', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>+</button>
    </div>
  );
}

/** Add someone by username, with their craft on this project. */
function AddCrewForm({ accent, onAdd }: { accent: string; onAdd: (username: string, craft: string | null) => Promise<void> }) {
  const [username, setUsername] = useState('');
  const [craft, setCraft] = useState<string | null>(null);
  const submit = async () => {
    if (!username.trim()) return;
    await onAdd(username, craft);
    setUsername('');
    setCraft(null);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
      <label className="sr-only" htmlFor="add-crew-username">Username</label>
      <input id="add-crew-username" value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void submit(); }} placeholder="Username" style={{ ...MINI_INPUT, padding: '6px 8px', fontSize: 11 }} />
      <CraftPicker label="Their craft" value={craft} onChange={setCraft} placeholder="Their craft (optional)" noneLabel="No craft" />
      <button type="button" onClick={() => void submit()} disabled={!username.trim()} style={{ background: `${accent}1a`, border: `1px solid ${accent}40`, color: accent, borderRadius: 8, padding: '5px 10px', cursor: username.trim() ? 'pointer' : 'default', fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 1 }}>ADD TO CREW</button>
    </div>
  );
}

