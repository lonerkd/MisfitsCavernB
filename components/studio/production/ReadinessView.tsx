'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, ChevronDown, FileText, Minus, PenLine } from 'lucide-react';
import { useBreakdown } from '@/lib/breakdown';
import { useCallSheets, useCastings } from '@/lib/studio';
import { nextShootDay, readinessByDay, type CheckId, type ReadinessDay, type ReadinessInput, type SceneReadiness } from '@/lib/studio/readiness';
import type { Place } from '@/lib/os/progress';
import { useStudio } from '../StudioContext';
import { cx } from '../ui';
import s from '../studio.module.css';
import r from './readiness.module.css';

type Filter = 'all' | 'blocked' | 'ready' | 'done';

/** Where each check is fixed. Breaking a scene down happens in the script. */
const FIX: Record<CheckId, { label: string; place: Place }> = {
  cast: { label: 'Cast it', place: { kind: 'studio', tab: 'production', view: 'crew' } },
  elements: { label: 'Open the breakdown', place: { kind: 'studio', tab: 'production', view: 'breakdown' } },
  shots: { label: 'Plan shots', place: { kind: 'studio', tab: 'scenes' } },
  date: { label: 'Schedule it', place: { kind: 'studio', tab: 'production', view: 'schedule' } },
  refs: { label: 'Add references', place: { kind: 'studio', tab: 'scenes' } },
};

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const fmtDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

/**
 * Can we shoot it? Every scene against what it needs — cast, breakdown,
 * shots, a dated shoot day, references — grouped by shoot day, with the next
 * day to prepare first and each blocker linked to where it's fixed. Nothing
 * here is ticked by hand: it all follows the project's data, live.
 */
export function ReadinessView({ onNavigate }: { onNavigate: (place: Place) => boolean }) {
  const { project, scenes, shots, mediaByScene, scriptId, followScene, openInScript } = useStudio();
  const bd = useBreakdown(project.id);
  const castings = useCastings(project.id);
  const sheets = useCallSheets(project.id);
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<string | null>(null);

  // Linked split screen: open the scene the script's caret is in.
  useEffect(() => {
    if (!followScene) return;
    setFilter('all');
    setOpen(followScene.sceneId);
    requestAnimationFrame(() => document.getElementById(`rd-row-${followScene.sceneId}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  }, [followScene]);

  const input: ReadinessInput = useMemo(() => {
    const elementsByScene: ReadinessInput['elementsByScene'] = new Map();
    for (const t of bd.tags.rows) {
      const e = bd.elementById.get(t.element_id);
      if (!e) continue;
      const list = elementsByScene.get(t.scene_id) ?? [];
      list.push({ name: e.name, status: e.status });
      elementsByScene.set(t.scene_id, list);
    }
    const shotsByScene = new Map<string, number>();
    for (const sh of shots.rows) shotsByScene.set(sh.scene_id, (shotsByScene.get(sh.scene_id) ?? 0) + 1);
    const refsByScene = new Map(Array.from(mediaByScene.entries()).map(([id, list]) => [id, list.length]));
    const dateOfDay = new Map(sheets.rows.filter((c) => c.shoot_date).map((c) => [c.shoot_day, c.shoot_date as string]));
    return { cast: new Set(castings.rows.map((c) => c.character_name.toUpperCase())), elementsByScene, shotsByScene, refsByScene, dateOfDay };
  }, [bd.tags.rows, bd.elementById, shots.rows, mediaByScene, sheets.rows, castings.rows]);

  const days = useMemo(() => readinessByDay(scenes.rows, input), [scenes.rows, input]);
  const all = useMemo(() => days.flatMap((d) => d.scenes), [days]);
  const next = useMemo(() => nextShootDay(days, localToday()), [days]);
  const headingOf = useMemo(() => new Map(scenes.rows.map((sc) => [sc.id, sc])), [scenes.rows]);

  const count = (st: SceneReadiness['state'][]) => all.filter((x) => st.includes(x.state)).length;
  const ready = count(['ready']);
  const blocked = count(['blocked']);
  const done = count(['shot', 'wrapped']);
  const toShoot = ready + blocked;

  // What would unblock the most, across every scene still to shoot.
  const todo = useMemo(() => {
    const open = all.filter((x) => x.state === 'blocked');
    const of = (id: CheckId) => open.filter((x) => x.checks.some((c) => c.id === id && c.state === 'todo'));
    const uncast = new Set<string>();
    const notReady = new Set<string>();
    for (const x of open) {
      const sc = headingOf.get(x.sceneId);
      for (const name of (sc?.cast_list ?? '').split(',').map((n) => n.trim().toUpperCase()).filter(Boolean)) if (!input.cast.has(name)) uncast.add(name);
      for (const e of input.elementsByScene.get(x.sceneId) ?? []) if (e.status !== 'ready') notReady.add(e.name);
    }
    const unbroken = open.filter((x) => (input.elementsByScene.get(x.sceneId) ?? []).length === 0).length;
    const undatedDays = Array.from(new Set(of('date').map((x) => headingOf.get(x.sceneId)?.shoot_day).filter((d): d is number => d != null))).sort((a, b) => a - b);
    const unscheduled = of('date').filter((x) => headingOf.get(x.sceneId)?.shoot_day == null).length;
    const items: Array<{ id: CheckId; text: string; scenes: number; editor?: boolean }> = [];
    if (uncast.size) items.push({ id: 'cast', text: `Cast ${Array.from(uncast).sort().slice(0, 4).join(', ')}${uncast.size > 4 ? ` +${uncast.size - 4}` : ''}`, scenes: of('cast').length });
    if (unbroken) items.push({ id: 'elements', text: `Break down ${unbroken} scene${unbroken === 1 ? '' : 's'}`, scenes: unbroken, editor: true });
    if (notReady.size) items.push({ id: 'elements', text: `${notReady.size} element${notReady.size === 1 ? '' : 's'} still needed or sourcing`, scenes: open.filter((x) => (input.elementsByScene.get(x.sceneId) ?? []).some((e) => e.status !== 'ready')).length });
    if (of('shots').length) items.push({ id: 'shots', text: `Plan shots for ${of('shots').length} scene${of('shots').length === 1 ? '' : 's'}`, scenes: of('shots').length });
    if (undatedDays.length) items.push({ id: 'date', text: `Date day${undatedDays.length === 1 ? '' : 's'} ${undatedDays.slice(0, 5).join(', ')}${undatedDays.length > 5 ? '…' : ''}`, scenes: of('date').length - unscheduled });
    if (unscheduled) items.push({ id: 'date', text: `Schedule ${unscheduled} scene${unscheduled === 1 ? '' : 's'}`, scenes: unscheduled });
    return items.sort((a, b) => b.scenes - a.scenes);
  }, [all, headingOf, input]);

  const matches = (x: SceneReadiness) =>
    filter === 'all' || (filter === 'blocked' && x.state === 'blocked') || (filter === 'ready' && x.state === 'ready') || (filter === 'done' && (x.state === 'shot' || x.state === 'wrapped'));
  const shown = days.map((d) => ({ ...d, scenes: d.scenes.filter(matches) })).filter((d) => d.scenes.length > 0);
  const loading = scenes.status === 'loading' || bd.status === 'loading' || castings.status === 'loading';

  if (!loading && scenes.rows.length === 0) {
    return (
      <div className={r.empty}>
        <p>No scenes yet. Scene headings in the script (INT. / EXT.) become scenes here, each checked for what it needs before the shoot.</p>
        {scriptId && <Link href={`/editor?script=${scriptId}`} className={s.btn}><PenLine size={12} /> Open the script</Link>}
      </div>
    );
  }

  return (
    <div className={r.wrap} aria-busy={loading}>
      <div className={r.top}>
        <section className={r.summary} aria-labelledby="readiness-summary">
          <h3 id="readiness-summary" className={r.eyebrow}>Ready to shoot</h3>
          <div className={r.big}>
            <span className={r.bigNum}>{ready}</span>
            <span className={r.bigOf}>of {toShoot} scene{toShoot === 1 ? '' : 's'} left to shoot</span>
          </div>
          <div className={r.bar} role="img" aria-label={`${ready} ready, ${blocked} blocked, ${done} shot or wrapped`}>
            <span className={r.barReady} style={{ flexGrow: ready }} />
            <span className={r.barBlocked} style={{ flexGrow: blocked }} />
            <span className={r.barDone} style={{ flexGrow: done }} />
          </div>
          <div className={r.legend}>
            <span><i className={r.dotReady} /> {ready} ready</span>
            <span><i className={r.dotBlocked} /> {blocked} blocked</span>
            <span><i className={r.dotDone} /> {done} shot or wrapped</span>
          </div>
        </section>

        {next && <NextDay day={next} headingOf={headingOf} onNavigate={onNavigate} />}

        <section className={r.todo} aria-labelledby="readiness-todo">
          <h3 id="readiness-todo" className={r.eyebrow}>What unblocks the most</h3>
          {todo.length === 0 ? (
            <p className={r.clear}>{toShoot > 0 ? 'Nothing blocking — every scene left to shoot is ready.' : 'Every scene is shot.'}</p>
          ) : (
            <ol className={r.todoList}>
              {todo.slice(0, 5).map((t, i) => (
                <li key={`${t.id}-${i}`} className={r.todoItem}>
                  <span className={r.todoText}>{t.text}</span>
                  <span className={r.todoCount}>{t.scenes} scene{t.scenes === 1 ? '' : 's'}</span>
                  {t.editor && scriptId
                    ? <Link href={`/editor?script=${scriptId}`} className={cx(s.btnGhost, s.small)}>Tag in the script <ArrowRight size={11} aria-hidden /></Link>
                    : <FixButton id={t.id} onNavigate={onNavigate} />}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className={s.chips} role="group" aria-label="Show scenes">
        {([['all', `All ${all.length}`], ['blocked', `Blocked ${blocked}`], ['ready', `Ready ${ready}`], ['done', `Shot ${done}`]] as Array<[Filter, string]>).map(([id, label]) => (
          <button key={id} type="button" className={cx(s.chip, filter === id && s.chipOn)} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className={r.clear}>No scenes here.</p>
      ) : shown.map((d) => (
        <section key={d.day} className={r.day} aria-labelledby={`rd-day-${d.day}`}>
          <h3 id={`rd-day-${d.day}`} className={r.dayHead}>
            {d.day ? `Day ${d.day}` : 'Not scheduled'}
            {d.day > 0 && <span className={r.dayDate}>{d.date ? fmtDate(d.date) : 'no date'}</span>}
            <span className={r.dayCount}>{d.scenes.length} scene{d.scenes.length === 1 ? '' : 's'}{d.blocked ? ` · ${d.blocked} blocked` : ''}</span>
          </h3>
          <ul className={r.rows}>
            {d.scenes.map((x) => {
              const sc = headingOf.get(x.sceneId);
              const expanded = open === x.sceneId;
              return (
                <li key={x.sceneId} id={`rd-row-${x.sceneId}`} className={cx(r.row, r[`row_${x.state}`], followScene?.sceneId === x.sceneId && r.rowFollow)}>
                  <button type="button" className={r.rowBtn} aria-expanded={expanded} aria-controls={`rd-${x.sceneId}`} onClick={() => setOpen(expanded ? null : x.sceneId)}>
                    <span className={r.num}>{sc?.scene_number}</span>
                    <span className={r.heading}>
                      {sc?.heading ?? sc?.title}
                      <span className={r.why}>{x.state === 'blocked' ? x.blocker?.detail : x.state === 'ready' ? 'Ready to shoot' : x.state === 'shot' ? 'Shot' : 'Wrapped'}</span>
                    </span>
                    <span className={r.pips} aria-hidden>
                      {x.checks.map((c) => <Pip key={c.id} state={c.state} optional={c.optional} label={c.label} />)}
                    </span>
                    <span className={r.score}>{x.done}/{x.total}</span>
                    <ChevronDown size={14} className={cx(r.chev, expanded && r.chevOpen)} aria-hidden />
                  </button>
                  {expanded && (
                    <ul id={`rd-${x.sceneId}`} className={r.checks}>
                      {x.checks.map((c) => (
                        <li key={c.id} className={r.check}>
                          <Pip state={c.state} optional={c.optional} label={c.label} />
                          <span className={r.checkLabel}>{c.label}{c.optional ? ' (optional)' : ''}</span>
                          <span className={r.checkDetail}>{c.state === 'done' ? 'Done' : c.state === 'none' ? 'Nobody speaks here' : c.detail}</span>
                          {c.state === 'todo' && (
                            c.id === 'elements' && c.detail === 'Not broken down' && scriptId
                              ? <Link href={`/editor?script=${scriptId}`} className={cx(s.btnGhost, s.small)}>Tag in the script <ArrowRight size={11} aria-hidden /></Link>
                              : <FixButton id={c.id} onNavigate={onNavigate} />
                          )}
                        </li>
                      ))}
                      {sc && (
                        <li className={r.checkActions}>
                          <button type="button" className={cx(s.btnGhost, s.small)} onClick={() => openInScript(sc)}>
                            <FileText size={11} aria-hidden /> Open in script
                          </button>
                        </li>
                      )}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Pip({ state, optional, label }: { state: 'done' | 'todo' | 'none'; optional?: boolean; label: string }) {
  return (
    <span className={cx(r.pip, state === 'done' ? r.pipDone : state === 'none' ? r.pipNone : optional ? r.pipSoft : r.pipTodo)} title={label}>
      {state === 'done' ? <Check size={10} strokeWidth={3} aria-hidden /> : state === 'none' ? <Minus size={10} aria-hidden /> : null}
      <span className="sr-only">{label}: {state === 'done' ? 'done' : state === 'none' ? 'not needed' : 'to do'}</span>
    </span>
  );
}

function FixButton({ id, onNavigate }: { id: CheckId; onNavigate: (place: Place) => boolean }) {
  return (
    <button type="button" className={cx(s.btnGhost, s.small)} onClick={() => onNavigate(FIX[id].place)}>
      {FIX[id].label} <ArrowRight size={11} aria-hidden />
    </button>
  );
}

function NextDay({ day, headingOf, onNavigate }: { day: ReadinessDay; headingOf: Map<string, { scene_number: number; heading: string | null; title: string }>; onNavigate: (place: Place) => boolean }) {
  const left = day.scenes.filter((x) => x.state === 'ready' || x.state === 'blocked');
  const blocked = left.filter((x) => x.state === 'blocked');
  return (
    <section className={cx(r.next, blocked.length ? r.nextBlocked : r.nextReady)} aria-labelledby="readiness-next">
      <h3 id="readiness-next" className={r.eyebrow}>Next shoot day</h3>
      <div className={r.nextTitle}>Day {day.day}<span className={r.dayDate}>{day.date ? fmtDate(day.date) : 'no date yet'}</span></div>
      <p className={r.nextLine}>
        {left.length} scene{left.length === 1 ? '' : 's'} · {blocked.length ? `${blocked.length} blocked` : 'all ready'}
      </p>
      {blocked.length > 0 && (
        <ul className={r.nextList}>
          {blocked.slice(0, 3).map((x) => (
            <li key={x.sceneId}><strong>{headingOf.get(x.sceneId)?.scene_number}.</strong> {x.blocker?.detail}</li>
          ))}
        </ul>
      )}
      {!day.date && (
        <button type="button" className={cx(s.btnGhost, s.small)} onClick={() => onNavigate(FIX.date.place)}>Date it <ArrowRight size={11} aria-hidden /></button>
      )}
    </section>
  );
}
