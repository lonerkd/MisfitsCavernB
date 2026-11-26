'use client';

import { DiscSwitch } from '@/components/ui/DiscSwitch';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import * as hub from '@/lib/supabase/project-hub';
import { pushUndo, undoOrigin } from '@/lib/os/undo';
import { getProductionData, type BudgetRow, type CrewRow, type FestivalRow, type PortfolioRow, type TaskRow, type TimelineRow } from '@/lib/supabase/project-hub';
import { notify } from '@/lib/supabase/notifications';
import type { ProjectSettings } from '@/lib/types/settings';
import { SCRIPT_FORMAT_LABELS } from '@/lib/types/settings';
import { SCRIPT_FORMATS, type ScriptFormat } from '@/lib/formats/script-formats';
import { awaitOSUser } from '@/lib/os';
import { announceProgressChange } from '@/lib/supabase/progress';
import { CraftPicker } from '@/components/crafts/CraftPicker';
import { setCrewCraft } from '@/lib/supabase/crew-management';
import { useMyCapabilities } from '@/lib/roles/capabilities';
import { NeedsCapability } from '@/components/roles/NeedsCapability';
import { useEntities, syncMentions } from '@/lib/film/links';
import { MentionInput, MentionText } from '@/components/film/Mentions';
import { plain } from '@/lib/film/mentions';

const FESTIVAL_STATUSES: FestivalRow['status'][] = ['planned', 'submitted', 'accepted', 'rejected'];
const FESTIVAL_STATUS_COLOR: Record<FestivalRow['status'], string> = {
  planned: '#6b7280', submitted: 'var(--warn)', accepted: 'var(--ok)', rejected: 'var(--danger)',
};

const MINI_INPUT: React.CSSProperties = { background: 'rgba(var(--ink-rgb), 0.04)', border: '1px solid rgba(var(--ink-rgb), 0.08)', borderRadius: 4, padding: '2px 4px', fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', colorScheme: 'dark' };

/** Everything the production manager shows. */
async function fetchProjectPage(projectId: string) {
  return getProductionData(projectId);
}

export function ProductionManager({ projectId, projectTitle, accent, isOwner }: { projectId: string; projectTitle: string; accent: string; isOwner: boolean }) {
  const { toast } = useToast();
  const entities = useEntities(projectId);
  const [userId, setUserId] = useState<string | null>(null);
  // The budget is held by the roles that run the money: seeing it and changing it are separate (the database decides).
  const caps = useMyCapabilities(projectId);
  const noBudget = !caps.loading && !caps.can('budget.read');
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [budget, setBudget] = useState<BudgetRow[]>([]);
  const [timeline, setTimeline] = useState<TimelineRow[]>([]);
  const [crew, setCrew] = useState<CrewRow[]>([]);
  const [owner, setOwner] = useState<{ id: string; username: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);


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
    if (await attempt(async () => { row = await hub.addTask(projectId, title); })) {
      setTasks(p => [...p, row!]);
      // A task is its own entity (written by a trigger); what it mentions becomes links.
      if (title.includes('@[')) {
        const problem = await syncMentions(projectId, row!.id, title);
        if (problem) toast(`The task was added, but its mentions weren’t saved: ${problem}`, 'error');
      }
    }
  };
  const toggleTask = async (t: TaskRow) => {
    setTasks(p => p.map(x => x.id === t.id ? { ...x, completed: !t.completed } : x));
    const origin = undoOrigin();
    if (!await attempt(() => hub.updateTask(t.id, { completed: !t.completed }))) { setTasks(p => p.map(x => x.id === t.id ? { ...x, completed: t.completed } : x)); return; }
    pushUndo(t.completed ? 'Task marked open again' : 'Task marked done', async () => {
      await hub.updateTask(t.id, { completed: t.completed });
      setTasks(p => p.map(x => x.id === t.id ? { ...x, completed: t.completed } : x));
    }, origin);
  };
  const setTaskField = async (t: TaskRow, patch: Partial<Pick<TaskRow, 'assigned_to' | 'due_date'>>) => {
    setTasks(p => p.map(x => x.id === t.id ? { ...x, ...patch } : x));
    const origin = undoOrigin();
    if (!await attempt(() => hub.updateTask(t.id, patch))) { setTasks(p => p.map(x => x.id === t.id ? t : x)); return; }
    pushUndo('Task changed', async () => {
      const back = Object.fromEntries(Object.keys(patch).map((k) => [k, t[k as keyof typeof patch]])) as Partial<Pick<TaskRow, 'assigned_to' | 'due_date'>>;
      await hub.updateTask(t.id, back);
      setTasks(p => p.map(x => x.id === t.id ? { ...x, ...back } : x));
    }, origin);
    if (patch.assigned_to && patch.assigned_to !== t.assigned_to) {
      const notifyError = await notify(patch.assigned_to, { type: 'task', title: `You were assigned “${plain(t.title)}”`, body: projectTitle, link: `/projects/${projectId}` }, userId);
      if (notifyError) toast(`Saved, but the person assigned wasn’t notified: ${notifyError}`, 'error');
    }
  };
  const [editingTask, setEditingTask] = useState<string | null>(null);
  // Edit a task's text: the mentions in it are re-linked (new ones added, dropped ones removed).
  const saveTaskTitle = async (t: TaskRow, title: string) => {
    const next = title.trim();
    if (!next) { toast('A task needs some text. Delete it instead if it is not needed.', 'error'); return; }
    if (next === t.title) { setEditingTask(null); return; }
    if (!await attempt(() => hub.updateTask(t.id, { title: next }))) return;
    setTasks(p => p.map(x => x.id === t.id ? { ...x, title: next } : x));
    setEditingTask(null);
    const problem = await syncMentions(projectId, t.id, next);
    if (problem) toast(`The task was changed, but its mentions weren’t saved: ${problem}`, 'error');
  };
  const delTask = async (id: string) => {
    if (!await confirm('Delete this task? This cannot be undone.')) return;
    const prev = tasks;
    setTasks(p => p.filter(x => x.id !== id));
    if (!await attempt(() => hub.deleteTask(id))) setTasks(prev);
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
  // The owner changes what someone does on the project right from this panel.
  const changeCrewCraft = async (c: CrewRow, craft: string | null) => {
    if (!userId) return;
    if (await attempt(async () => { await setCrewCraft(projectId, c.user_id, craft, userId, (reason) => toast(`Saved, but they weren’t notified: ${reason}`, 'error')); })) load();
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

  const totalBudget = budget.reduce((s, b) => s + Number(b.amount || 0) + Number(b.fringe_amount || 0), 0);

  return (
    <div style={{ marginTop: 40 }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(7.5px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', marginBottom: 14 }}>Production Management</div>
      {err && <div style={{ color: 'var(--danger)', fontFamily: 'var(--mono)', fontSize: 11, marginBottom: 12 }}>⚠ {err}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>

        <Panel title="Tasks" accent={accent}>
          {tasks.length === 0 && <Empty>No tasks yet</Empty>}
          {tasks.map(t => (
            <div key={t.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Row>
              <button onClick={() => toggleTask(t)} aria-label="toggle" style={{ background: 'none', border: `1px solid ${t.completed ? 'var(--ok)' : 'rgba(var(--ink-rgb), 0.25)'}`, borderRadius: 4, width: 15, height: 15, cursor: 'pointer', color: 'var(--ok)', fontSize: 11, lineHeight: 1, flexShrink: 0 }}>{t.completed ? '✓' : ''}</button>
              {editingTask === t.id ? (
                <span style={{ flex: 1, minWidth: 0 }}>
                  <MentionInput entities={entities.rows} initial={t.title} keep label={`Text of task ${plain(t.title)}`} submitLabel="Save task text" placeholder="Task…" onSubmit={(v) => void saveTaskTitle(t, v)}
                    style={{ background: 'rgba(var(--ink-rgb), 0.04)', border: '1px solid rgba(var(--ink-rgb), 0.08)', borderRadius: 8, padding: '4px 6px', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 11, outline: 'none' }}
                    buttonStyle={{ flexShrink: 0, background: `${accent}1a`, border: `1px solid ${accent}40`, color: accent, borderRadius: 8, padding: '0 10px', cursor: 'pointer', fontSize: 11 }} />
                </span>
              ) : (
                <span style={{ flex: 1, minWidth: 0, fontSize: 11, color: t.completed ? 'var(--fg-dim)' : 'var(--fg)', textDecoration: t.completed ? 'line-through' : 'none' }}><MentionText text={t.title} projectId={projectId} entities={entities.rows} /></span>
              )}
              <button type="button" onClick={() => setEditingTask(editingTask === t.id ? null : t.id)} aria-label={editingTask === t.id ? `Cancel editing ${plain(t.title)}` : `Edit ${plain(t.title)}`} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', textDecoration: 'underline' }}>{editingTask === t.id ? 'Cancel' : 'Edit'}</button>
              <Link href={`/studio?project=${projectId}&card=${t.id}`} aria-label={`Open the card for ${plain(t.title)}`} style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', color: 'var(--violet)', textDecoration: 'underline', flexShrink: 0 }}>Card</Link>
              <DelBtn onClick={() => delTask(t.id)} />
            </Row>
            <div style={{ display: 'flex', gap: 6, paddingLeft: 23 }}>
                <input
                  type="date"
                  value={t.due_date ?? ''}
                  onChange={e => setTaskField(t, { due_date: e.target.value || null })}
                  aria-label={`Due date for ${plain(t.title)}`}
                  title="Due date"
                  style={{ ...MINI_INPUT, width: 104, color: !t.completed && t.due_date && t.due_date < new Date().toISOString().slice(0, 10) ? '#ff6b6b' : 'var(--fg-dim)' }}
                />
                <select
                  value={t.assigned_to ?? ''}
                  onChange={e => setTaskField(t, { assigned_to: e.target.value || null })}
                  aria-label={`Assignee for ${plain(t.title)}`}
                  style={{ ...MINI_INPUT, width: 92 }}
                >
                  <option value="">Unassigned</option>
                  {people.map(p => <option key={p.id} value={p.id}>{p.username}</option>)}
                </select>
            </div>
            </div>
          ))}
          <MentionInput
            entities={entities.rows}
            placeholder="Add a task… (type @ to mention a scene, person or file)"
            onSubmit={(v) => void addTask(v)}
            style={{ background: 'rgba(var(--ink-rgb), 0.04)', border: '1px solid rgba(var(--ink-rgb), 0.08)', borderRadius: 8, padding: '6px 8px', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 11, outline: 'none' }}
            buttonStyle={{ flexShrink: 0, background: `${accent}1a`, border: `1px solid ${accent}40`, color: accent, borderRadius: 8, padding: '0 12px', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}
          />
        </Panel>

        <Panel title="Budget" accent={accent} headerRight={totalBudget > 0 ? `$${totalBudget.toLocaleString()}` : undefined}>
          {noBudget && <NeedsCapability projectId={projectId} capability="budget.read" lead="The budget is held by the people who run the money." />}
          {!noBudget && (
            <p style={{ fontFamily: 'var(--mono)', fontSize: 'max(9.5px, var(--mc-min-font, 0px))', color: 'var(--fg-muted)', margin: 0, lineHeight: 1.6 }}>
              {budget.length === 0 ? 'No budget lines yet. ' : `${budget.length} budget line${budget.length === 1 ? '' : 's'}. `}
              The budget lives in Studio › Money: lines, spend, vendors and what is left.
              {' '}<Link href="/studio?tab=production&view=money" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, color: 'var(--fg)', textDecoration: 'underline' }}>Open the budget</Link>
            </p>
          )}
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
              {isOwner
                ? <div style={{ width: 170 }}><CraftPicker label={`${c.profiles?.username || 'Their'} craft`} value={c.craft} onChange={(craft) => void changeCrewCraft(c, craft)} placeholder={c.role === 'lead' ? 'Lead' : 'Set craft'} noneLabel="No craft" /></div>
                : <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)' }}>{c.craft || (c.role === 'lead' ? 'Lead' : 'Crew')}</span>}
              {isOwner && <DelBtn onClick={() => delCrew(c.id)} />}
            </Row>
          ))}
          {isOwner && <AddCrewForm accent={accent} onAdd={addCrew} />}
        </Panel>

        <Panel title="Portfolio" accent={accent}>
          {portfolio.length === 0 ? (
            <>
              <Empty>No pitch board yet</Empty>
              <Link href={`/projects/${projectId}/pitch`} style={{ marginTop: 4, width: '100%', boxSizing: 'border-box', display: 'block', textAlign: 'center', textDecoration: 'none', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', color: 'var(--violet)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)' }}>
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
                style={{ background: `color-mix(in srgb, ${FESTIVAL_STATUS_COLOR[f.status]} 9%, transparent)`, border: `1px solid color-mix(in srgb, ${FESTIVAL_STATUS_COLOR[f.status]} 25%, transparent)`, color: FESTIVAL_STATUS_COLOR[f.status], borderRadius: 4, padding: '2px 4px', fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', textTransform: 'var(--caps)' }}
              >
                {FESTIVAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {isOwner && <DelBtn onClick={() => delFestival(f.id)} />}
            </Row>
          ))}
          {isOwner && <AddForm placeholder="Festival name" fields={['text', 'date']} dateLabels={['Deadline']} onSubmit={(v) => v[0] && addFestival(v[0], v[1])} accent={accent} />}
        </Panel>

        {isOwner && <Panel title="Settings" accent={accent}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', letterSpacing: 'var(--caps-track)', marginBottom: 4 }}>Default script format</div>
          <select
            value={settings.defaultScriptFormat || ''}
            onChange={e => setDefaultFormat(e.target.value as ScriptFormat | '')}
            aria-label="Default script format"
            style={{ width: '100%', background: 'rgba(var(--ink-rgb), 0.04)', border: '1px solid rgba(var(--ink-rgb), 0.08)', borderRadius: 8, padding: '6px 8px', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 11, marginBottom: 12 }}
          >
            <option value="">Use the format’s default</option>
            {SCRIPT_FORMATS.map(f => <option key={f} value={f}>{SCRIPT_FORMAT_LABELS[f]}</option>)}
          </select>

          <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', letterSpacing: 'var(--caps-track)', marginBottom: 6 }}>Ecosystem modules</div>
          {([
            ['scriptos', 'ScriptOS'], ['studio', 'Studio'], ['lounge', 'Lounge'],
            ['portfolio', 'Portfolio'], ['distribution', 'Distribution'],
          ] as [keyof ProjectSettings['modules'], string][]).map(([key, label]) => (
            <Row key={key}>
              <span style={{ flex: 1, fontSize: 11 }}>{label}</span>
              <DiscSwitch on={settings.modules[key]} onChange={() => toggleModule(key)} label={`toggle ${label}`} accent={accent} />
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
        <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', color: accent }}>{title}</span>
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
      <button type="button" onClick={() => void submit()} disabled={!username.trim()} style={{ background: `${accent}1a`, border: `1px solid ${accent}40`, color: accent, borderRadius: 8, padding: '5px 10px', cursor: username.trim() ? 'pointer' : 'default', fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)' }}>ADD TO CREW</button>
    </div>
  );
}

