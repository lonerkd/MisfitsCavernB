'use client';

// The project's guide: a walkthrough of the workflow that fits it (a first
// short, a feature, a music video, a podcast, a place on someone else's
// crew…), as deep as the person asked for and paced to the hours they have.
// Steps tick themselves from the project's data where they can; the rest are
// ticked here. Private to each person (guide_progress, ui_prefs.guide).

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Settings2 } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { accentVars } from '@/components/progress/Bricks';
import { supabase } from '@/lib/supabase/client';
import { useUiPrefs } from '@/lib/os/uiPrefs';
import { placeHref, type ProjectSignals } from '@/lib/os/progress';
import {
  WORKFLOWS, computeGuide, departmentOf, describeWeeks, pickWorkflow, useGuideProgress, workflowById,
  type GuideProfile, type GuideStep,
} from '@/lib/guides';
import { GuideSetup } from './GuideSetup';
import g from './guides.module.css';

const hrs = (n: number) => (n < 1 ? `${n * 60} min` : `${n}h`);

function StepItem({ step, projectId, open, busy, onTick }: {
  step: GuideStep; projectId: string; open: boolean; busy: boolean; onTick: (done: boolean) => void;
}) {
  const id = `guide-step-${step.id}`;
  const t = step.text;
  const deep = !!(t.why || t.how?.length || t.watch);
  return (
    <li className={`${g.step} ${step.done ? g.done : ''}`}>
      <input id={id} type="checkbox" className={g.check} checked={step.done} disabled={step.auto || busy}
        onChange={(e) => onTick(e.target.checked)} aria-describedby={step.auto ? `${id}-auto` : undefined} />
      <div>
        <label htmlFor={id} className={g.stepTitle}>
          {step.title}
          {step.learn && <span className={`${g.meta} ${g.learn}`}>Basics</span>}
          {!step.done && <span className={g.meta}>{step.progress ? `${step.progress.value}/${step.progress.of} · ` : ''}~{hrs(step.hours)}</span>}
        </label>
        <p className={g.do}>{t.do}</p>
        {t.tip && <p className={g.tip}>{t.tip}</p>}
        {deep && (
          <details className={g.details} open={open}>
            <summary className={g.summary}>Walk me through it</summary>
            {t.why && <p className={g.why}>{t.why}</p>}
            {t.how && t.how.length > 0 && <ol className={g.how}>{t.how.map((h) => <li key={h}>{h}</li>)}</ol>}
            {t.watch && <p className={g.watch}>Watch for: {t.watch}</p>}
          </details>
        )}
        <div className={g.actions}>
          {!step.done && <Link href={placeHref(step.place, projectId)} className={g.btn}>Go <ArrowRight size={11} aria-hidden /></Link>}
          {step.auto && <span id={`${id}-auto`} className={g.auto}>{step.done ? 'Done — the project shows it.' : 'Ticks itself when the work is in.'}</span>}
        </div>
      </div>
    </li>
  );
}

export function GuidePanel({ projectId, signals, isOwner, format, structure, accent, userId, role }: {
  projectId: string;
  signals: ProjectSignals;
  isOwner: boolean;
  format: string | null;
  structure: string | null;
  accent?: string;
  userId: string | null;
  role: string | null;
}) {
  const { toast } = useToast();
  const { prefs, loaded, save: savePrefs } = useUiPrefs();
  const { progress, loaded: progressLoaded, update } = useGuideProgress(projectId, userId);
  const [tuning, setTuning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [craft, setCraft] = useState<string | null>(null);

  // On someone else's project, the guide follows your craft on it.
  useEffect(() => {
    if (isOwner || !userId) return;
    let alive = true;
    supabase.from('project_crew').select('craft').eq('project_id', projectId).eq('user_id', userId).maybeSingle()
      .then(({ data }) => { if (alive) setCraft(data?.craft ?? null); });
    return () => { alive = false; };
  }, [isOwner, projectId, userId]);

  const profile = prefs.guide;
  const workflow = useMemo(
    () => workflowById(progress.workflow) ?? pickWorkflow(format, profile?.experience ?? 'some', isOwner),
    [progress.workflow, format, profile?.experience, isOwner],
  );
  const view = useMemo(
    () => (profile ? computeGuide({ workflow, profile, signals, ticked: progress.done, structure, dept: departmentOf(craft ?? role) }) : null),
    [workflow, profile, signals, progress.done, structure, craft, role],
  );

  if (!loaded || !userId || !progressLoaded) return null;

  const saveProfile = async (p: GuideProfile) => {
    try {
      await savePrefs({ guide: p });
      setTuning(false);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save that', 'error');
    }
  };
  const change = async (patch: Parameters<typeof update>[0], failed = 'Could not save the guide') => {
    setBusy(true);
    try { await update(patch); } catch { toast(failed, 'error'); } finally { setBusy(false); }
  };
  const tick = (step: GuideStep, done: boolean) => {
    const rest = progress.done.filter((x) => x !== step.id);
    void change({ done: done ? [...rest, step.id] : rest }, 'Could not tick that step');
  };

  if (progress.hidden) {
    return (
      <section id="guide" className={`${g.panel} ${g.slim}`} style={accentVars(accent)} aria-label="Guide">
        <p className={g.eyebrow}>Guide put away</p>
        <button type="button" className={g.ghost} disabled={busy} onClick={() => change({ hidden: false })}><BookOpen size={11} aria-hidden /> Show the guide</button>
      </section>
    );
  }

  if (!profile || !view) {
    return (
      <section id="guide" className={g.panel} style={accentVars(accent)} aria-labelledby="guide-title">
        <div className={g.head}>
          <div>
            <p className={g.eyebrow}>A guide for this project</p>
            <h2 id="guide-title" className={g.title}>How do you work?</h2>
            <p className={g.lead}>Four quick answers set how much the guide explains and how it paces the work — step by step for a first film, a checklist for a seasoned crew.</p>
          </div>
          <button type="button" className={g.ghost} disabled={busy} onClick={() => change({ hidden: true })}>Not now</button>
        </div>
        <GuideSetup initial={null} onSave={saveProfile} saveLabel="Show my guide" idPrefix="guide-first" />
      </section>
    );
  }

  const { next, thisWeek } = view;
  const firstWeek = new Set(thisWeek.map((s) => s.id));
  const pace = view.hoursLeft > 0
    ? `${view.totals.done} of ${view.totals.total} steps · about ${Math.ceil(view.hoursLeft)} hours left — ${describeWeeks(view.weeksLeft)} at ${profile.hours}h a week`
    : `All ${view.totals.total} steps done`;
  const options = WORKFLOWS.filter((w) => !!w.crew === !isOwner || w.id === workflow.id);

  return (
    <section id="guide" className={g.panel} style={accentVars(accent)} aria-labelledby="guide-title">
      <div className={g.head}>
        <div>
          <p className={g.eyebrow}>Your guide · {workflow.label}</p>
          <h2 id="guide-title" className={g.title}>{next ? next.title : 'Every step done'}</h2>
          <p className={g.pace}>{pace}</p>
        </div>
        <div className={g.controls}>
          <label htmlFor="guide-workflow" className="sr-only">Guide</label>
          <select id="guide-workflow" className={g.select} value={workflow.id} disabled={busy}
            onChange={(e) => change({ workflow: e.target.value })}>
            {options.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
          </select>
          <button type="button" className={g.ghost} aria-expanded={tuning} onClick={() => setTuning((v) => !v)}><Settings2 size={11} aria-hidden /> Tune</button>
          <button type="button" className={g.ghost} disabled={busy} onClick={() => change({ hidden: true })}>Put away</button>
        </div>
      </div>
      <p className={g.lead}>{workflow.blurb}</p>

      {tuning && <GuideSetup key={JSON.stringify(profile)} initial={profile} onSave={saveProfile} onCancel={() => setTuning(false)} idPrefix="guide-tune" />}

      {thisWeek.length > 0 && (
        <>
          <h3 className={g.sectionTitle}>This week · {profile.hours}h</h3>
          <ul className={g.steps} aria-label="This week">
            {thisWeek.map((s, i) => (
              <StepItem key={s.id} step={s} projectId={projectId} open={i === 0} busy={busy} onTick={(d) => tick(s, d)} />
            ))}
          </ul>
        </>
      )}

      <h3 className={g.sectionTitle}>Every step</h3>
      <div className={g.phases}>
        {view.phases.filter((p) => p.total > 0).map((p) => (
          <details key={p.id} className={g.phase} open={p.index === view.currentIndex}>
            <summary className={g.phaseSummary}>
              <span>{p.label}{p.index === view.currentIndex && <span className={g.now}>· now</span>}</span>
              <span className={g.phaseCount}>{p.done}/{p.total}</span>
            </summary>
            <ul className={g.steps} aria-label={`${p.label} steps`}>
              {p.steps.filter((s) => !firstWeek.has(s.id)).map((s) => (
                <StepItem key={s.id} step={s} projectId={projectId} open={false} busy={busy} onTick={(d) => tick(s, d)} />
              ))}
            </ul>
          </details>
        ))}
      </div>
    </section>
  );
}
