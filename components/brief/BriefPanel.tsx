'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, CircleDashed, HelpCircle, Lightbulb } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { accentVars } from '@/components/progress/Bricks';
import { PHASES, type Phase } from '@/lib/os/phases';
import {
  briefProgress, briefSummary, rolePost, rolePostHref, visibleQuestions,
  sceneList, type BriefQuestion, type BriefValue, type Evidence, type Move, type ProjectBrief,
} from '@/lib/brief';
import b from './brief.module.css';

const ICON = { warn: AlertTriangle, gap: CircleDashed, tip: Lightbulb, ask: HelpCircle } as const;

/** One brief question as choices (or a number) — also asked when a project starts (/welcome). */
export function Question({ q, value, disabled, onAnswer, found = [] }: { q: BriefQuestion; value: BriefValue | undefined; disabled: boolean; onAnswer: (v: BriefValue | null) => void; found?: Evidence[] }) {
  const id = `brief-${q.key}`;
  const [draft, setDraft] = useState(typeof value === 'number' ? String(value) : '');
  useEffect(() => { setDraft(typeof value === 'number' ? String(value) : ''); }, [value]);

  if (q.kind === 'number') {
    const commit = () => {
      const t = draft.trim();
      if (!t) { if (value != null) onAnswer(null); return; }
      const n = Number(t);
      if (!Number.isFinite(n) || n === value) return;
      onAnswer(n);
    };
    return (
      <div className={b.question}>
        <label htmlFor={id} className={b.qLabel}>{q.label}</label>
        {q.hint && <p className={b.qHint}>{q.hint}</p>}
        <div className={b.number}>
          <input id={id} className={b.numberInput} type="number" inputMode="numeric" min={q.min_value ?? undefined} max={q.max_value ?? undefined}
            value={draft} disabled={disabled} onChange={(e) => setDraft(e.target.value)} onBlur={commit}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }} />
          {q.unit && <span className={b.unit}>{q.unit}</span>}
        </div>
      </div>
    );
  }

  const selected = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
  const pick = (optionId: string) => {
    if (q.kind === 'one') onAnswer(selected[0] === optionId ? null : optionId);
    else onAnswer(selected.includes(optionId) ? selected.filter((x) => x !== optionId) : [...selected, optionId]);
  };
  return (
    <fieldset className={b.question}>
      <legend className={b.qLabel}>{q.label}</legend>
      {q.hint && <p className={b.qHint}>{q.hint}</p>}
      <div className={b.chips} role={q.kind === 'one' ? 'radiogroup' : 'group'} aria-label={q.label}>
        {q.options.map((o) => {
          const on = selected.includes(o.id);
          const ev = !on ? found.find((e) => e.option === o.id) : undefined;
          const seen = ev ? `In the script: ${sceneList(ev.scenes)} — ${ev.hits.slice(0, 3).join(', ')}` : undefined;
          return (
            <button key={o.id} type="button" className={`${b.chip} ${ev ? b.fromScript : ''}`} disabled={disabled} title={seen ?? o.hint}
              {...(q.kind === 'one' ? { role: 'radio', 'aria-checked': on } : { 'aria-pressed': on })}
              onClick={() => pick(o.id)}>
              {o.label}{ev && <span className={b.scriptMark} aria-hidden> · script</span>}{seen && <span className="sr-only"> ({seen})</span>}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function MoveItem({ m, brief, projectTitle, format, onAsk, onAdd, canEdit }: { m: Move; brief: ProjectBrief; projectTitle: string; format: string | null; onAsk: (key: string) => void; onAdd: (question: string, option: string) => void; canEdit: boolean }) {
  const Icon = ICON[m.kind];
  return (
    <li className={`${b.move} ${b[m.kind]}`}>
      <Icon size={15} className={b.moveIcon} aria-hidden />
      <div>
        <p className={b.moveTitle}>{m.title}</p>
        <p className={b.moveDetail}>{m.detail}</p>
        <div className={b.moveActions}>
          {m.kind === 'ask' && m.question && (
            <button type="button" className={b.link} onClick={() => onAsk(m.question!)}>Answer <ArrowRight size={11} aria-hidden /></button>
          )}
          {canEdit && m.suggest?.map((sg) => (
            <button key={sg.option} type="button" className={b.link} onClick={() => onAdd(sg.question, sg.option)} aria-label={`Add ${sg.label} to the brief`}>
              Add: {sg.label}
            </button>
          ))}
          {m.crafts?.map((craft) => (
            <Link key={craft} className={b.link} aria-label={`Post a job for a ${craft}`}
              href={rolePostHref(rolePost(craft, { projectTitle, questions: brief.questions, answers: brief.answers, format, context: brief.context, script: brief.script }))}>
              Post: {craft}
            </Link>
          ))}
          {m.href && m.kind !== 'ask' && <Link className={b.link} href={m.href}>{m.action ?? 'Open'} <ArrowRight size={11} aria-hidden /></Link>}
        </div>
      </div>
    </li>
  );
}

/**
 * The project brief — what the project is, answered as choices phase by
 * phase — beside what would move it forward now, read from the brief and
 * everything the suite already knows about the project.
 */
export function BriefPanel({ brief, projectTitle, format, phase, canEdit, accent }: {
  brief: ProjectBrief;
  projectTitle: string;
  format: string | null;
  phase: Phase;
  canEdit: boolean;
  accent?: string | null;
}) {
  const { toast } = useToast();
  const [tab, setTab] = useState<Phase>(phase);
  const [showAll, setShowAll] = useState(false);
  useEffect(() => { setTab(phase); }, [phase]);

  const visible = useMemo(() => visibleQuestions(brief.questions, brief.answers, format), [brief.questions, brief.answers, format]);
  const phases = PHASES.filter((p) => visible.some((q) => q.phase === p.id));
  const current = phases.some((p) => p.id === tab) ? tab : (phases[0]?.id ?? tab);
  const inTab = visible.filter((q) => q.phase === current);
  const total = briefProgress(brief.questions, brief.answers, format);
  const summary = briefSummary(brief.questions, brief.answers, format);
  const moves = brief.moves.filter((m) => m.kind !== 'ask' || canEdit);
  const shown = showAll ? moves : moves.slice(0, 5);

  const answer = async (key: string, v: BriefValue | null) => {
    try { await brief.answer(key, v); } catch (e) { toast(e instanceof Error ? e.message : 'Could not save that', 'error'); }
  };
  const addOption = (question: string, option: string) => {
    const q = brief.questions.find((x) => x.key === question);
    if (!q) return;
    const current = brief.answers[question];
    const ids = Array.isArray(current) ? current : typeof current === 'string' ? [current] : [];
    void answer(question, q.kind === 'one' ? option : [...ids.filter((x) => x !== option), option]);
  };
  const goTo = (key: string) => {
    const q = visible.find((x) => x.key === key);
    if (!q) return;
    setTab(q.phase);
    requestAnimationFrame(() => document.getElementById(`brief-q-${key}`)?.querySelector<HTMLElement>('button, input')?.focus());
  };

  if (brief.loading && !brief.questions.length) return <div className="skeleton" style={{ height: 220, borderRadius: 18 }} aria-busy="true" aria-label="Loading the brief" />;
  if (brief.error) return <div className={b.panel} style={accentVars(accent)}><p className={b.empty} role="alert">{brief.error}</p></div>;

  return (
    <section id="brief" className={b.panel} style={accentVars(accent)} aria-labelledby="brief-title">
      <div className={b.head}>
        <div>
          <div className={b.eyebrow}>Project brief</div>
          <h2 id="brief-title" className={b.title}>{summary || 'What are you making?'}</h2>
        </div>
        <div className={b.count}>{total.answered} of {total.of} answered</div>
      </div>

      <div className={b.cols}>
        <div>
          <h3 className={b.sectionTitle}>What moves it forward</h3>
          {moves.length === 0 ? (
            <p className={b.empty}>Nothing pressing — the brief and the project agree. Keep going.</p>
          ) : (
            <>
              <ul className={b.moves} aria-label="Next moves">
                {shown.map((m) => <MoveItem key={m.id} m={m} brief={brief} projectTitle={projectTitle} format={format} onAsk={goTo} onAdd={addOption} canEdit={canEdit} />)}
              </ul>
              {moves.length > 5 && (
                <button type="button" className={`${b.more} mc-hit`} onClick={() => setShowAll((v) => !v)}>
                  {showAll ? 'Show fewer' : `Show all ${moves.length}`}
                </button>
              )}
            </>
          )}
        </div>

        <div>
          <h3 className={b.sectionTitle}>The brief</h3>
          {!canEdit && <p className={b.readonly}>The owner and contributors fill this in.</p>}
          <div className={b.tabs} role="tablist" aria-label="Brief by phase">
            {phases.map((p) => {
              const qs = visible.filter((q) => q.phase === p.id);
              const done = qs.filter((q) => brief.answers[q.key] != null).length;
              return (
                <button key={p.id} type="button" role="tab" id={`brief-tab-${p.id}`} aria-controls="brief-tabpanel" aria-selected={current === p.id}
                  className={b.tab} onClick={() => setTab(p.id)}>
                  {p.label}<span className={b.tabCount}>{done}/{qs.length}</span>
                </button>
              );
            })}
          </div>
          <div className={b.questions} role="tabpanel" id="brief-tabpanel" aria-labelledby={`brief-tab-${current}`}>
            {inTab.map((q) => (
              <div key={q.key} id={`brief-q-${q.key}`}>
                <Question q={q} value={brief.answers[q.key]} disabled={!canEdit} onAnswer={(v) => void answer(q.key, v)} found={(brief.script?.evidence ?? []).filter((e) => e.question === q.key)} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
