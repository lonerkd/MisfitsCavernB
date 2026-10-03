'use client';

import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { useUiPrefs } from '@/lib/os/uiPrefs';
import { localDay } from '@/lib/writing/core';
import { useConfirm } from '@/components/Confirm';
import { useToast } from '@/components/Toast';
import { suggestPhase, toolsOpenedAt, type Place, type ProjectProgress, type ToolState } from '@/lib/os/progress';
import type { ProjectProgressState } from '@/lib/hooks/useProjectProgress';
import { setProjectFormat, setProjectPhase, setUnlockAllTools } from '@/lib/supabase/progress';
import { FormatPicker } from '@/components/formats/FormatPicker';
import { Brick, PlaceLink, accentVars } from './Bricks';
import { UnlockReveal } from './UnlockReveal';
import p from './progress.module.css';

const SEEN_KEY = (projectId: string) => `mc_seen_phase:${projectId}`;

function Ring({ done, total }: { done: number; total: number }) {
  const r = 27;
  const c = 2 * Math.PI * r;
  const frac = total ? done / total : 0;
  return (
    <div className={p.ring} role="img" aria-label={`${done} of ${total} milestones done in this phase`}>
      <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden>
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="4" className={p.ringTrack} />
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="4" strokeLinecap="round" className={p.ringValue}
          strokeDasharray={c} strokeDashoffset={c * (1 - frac)} />
      </svg>
      <span className={p.ringLabel} aria-hidden>{done}/{total}</span>
    </div>
  );
}

/**
 * Where the project is, what's done, what's next, and the tools it has
 * unlocked — the project built up phase by phase. Everything is read from
 * the project's data; only the owner moves it between phases.
 */
export function PhasePanel({ projectId, state, isOwner, accent, onNavigate, onFormatChanged, headingLevel = 2 }: {
  projectId: string;
  state: ProjectProgressState;
  isOwner: boolean;
  accent?: string | null;
  /** Handle a place in-page (return true), e.g. the Studio switching tabs. */
  onNavigate?: (place: Place) => boolean;
  /** After the owner changes the project's format. */
  onFormatChanged?: (format: string) => void;
  headingLevel?: 2 | 3;
}) {
  const confirm = useConfirm();
  const { toast } = useToast();
  const { progress, signals, loading, error, reload } = state;
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [reveal, setReveal] = useState<{ label: string; tools: ToolState[] } | null>(null);
  const [formatDraft, setFormatDraft] = useState<string | null>(null);
  const style = accentVars(accent);
  const { prefs: uiPrefs, save: saveUiPrefs } = useUiPrefs();

  // Celebrate phases reached since this device last saw the project
  // (the first visit only records where it is).
  const currentIndex = progress?.currentIndex;
  useEffect(() => {
    if (!progress || currentIndex == null) return;
    let seen: number | null = null;
    try { const v = localStorage.getItem(SEEN_KEY(projectId)); seen = v == null ? null : Number(v); } catch {}
    try { localStorage.setItem(SEEN_KEY(projectId), String(currentIndex)); } catch {}
    if (seen != null && Number.isFinite(seen) && seen < currentIndex) {
      const tools = progress.phases.slice(seen + 1, currentIndex + 1).flatMap((ph) => toolsOpenedAt(progress, ph.index));
      setReveal({ label: progress.current.label, tools });
    }
    setSelected(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a phase change should trigger this
  }, [projectId, currentIndex]);

  if (loading && !progress) return <div className={`skeleton ${p.skeleton}`} role="status" aria-busy="true" aria-label="Loading project progress" />;
  if (!progress || !signals) {
    return error ? <div className={p.panel} style={style}><p className={p.error} role="alert">{error}</p></div> : null;
  }

  const suggested = suggestPhase(signals, progress, localDay());
  const suggestion = suggested && !uiPrefs.dismissed.includes(`${projectId}:${progress.phases[suggested.index].id}`) ? suggested : null;
  const notYet = async (index: number) => {
    const key = `${projectId}:${progress.phases[index].id}`;
    try { await saveUiPrefs({ dismissed: [...uiPrefs.dismissed.filter((d) => d !== key), key].slice(-200) }); }
    catch (e) { toast(e instanceof Error ? e.message : 'Could not save that', 'error'); }
  };
  const shown = progress.phases[selected ?? progress.currentIndex];
  const isCurrent = shown.index === progress.currentIndex;
  const H = `h${headingLevel}` as 'h2' | 'h3';
  const Sub = `h${headingLevel + 1}` as 'h3' | 'h4';

  const moveTo = async (index: number) => {
    const target = progress.phases[index];
    const forward = index > progress.currentIndex;
    if (forward) {
      const left = progress.phases.slice(0, index).reduce((n, ph) => n + (ph.total - ph.done), 0);
      if (left > 0 && !await confirm({
        title: `Move to ${target.label}?`,
        message: `${left} milestone${left === 1 ? '' : 's'} before ${target.label} ${left === 1 ? 'isn’t' : 'aren’t'} done yet. You can come back to ${left === 1 ? 'it' : 'them'} — nothing is lost.`,
        confirmLabel: `Move to ${target.label}`,
        danger: false,
      })) return;
    } else if (!await confirm({
      title: `Back to ${target.label}?`,
      message: 'Tools already opened stay open for work in progress; the project page and Studio show this phase.',
      confirmLabel: `Back to ${target.label}`,
      danger: false,
    })) return;
    setBusy(true);
    try {
      await setProjectPhase(projectId, target.id);
      await reload();
      toast(`${target.label} — ${forward ? 'unlocked' : 'set as the current phase'}.`, 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not change the phase', 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveFormat = async () => {
    if (!formatDraft || formatDraft === signals.project_type) { setFormatDraft(null); return; }
    setBusy(true);
    try {
      await setProjectFormat(projectId, formatDraft);
      await reload();
      onFormatChanged?.(formatDraft);
      toast(`Now a ${formatDraft}. Phases and milestones follow the new format.`, 'success');
      setFormatDraft(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not change the format', 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggleUnlockAll = async () => {
    const next = !signals.unlock_all;
    try {
      await setUnlockAllTools(projectId, next);
      toast(next ? 'Every tool is open for this project.' : 'Tools now open phase by phase.', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not change this setting', 'error');
    }
  };

  return (
    <section className={p.panel} style={style} aria-labelledby={`phase-title-${projectId}`}>
      <div className={p.head}>
        <Ring done={progress.current.done} total={progress.current.total} />
        <div className={p.headText}>
          <div className={p.eyebrow}>
            Phase {progress.currentIndex + 1} of {progress.phases.length}
            {signals.project_type && <> · {signals.project_type}</>}
            {isOwner && formatDraft == null && (
              <button type="button" className={p.inlineBtn} onClick={() => setFormatDraft(signals.project_type ?? 'Feature')}>
                Change format
              </button>
            )}
          </div>
          <H id={`phase-title-${projectId}`} className={p.phaseName}>{progress.current.label}</H>
          <div className={p.summary}>
            {progress.ready && progress.next ? <span className={p.ready}>Everything here is done — ready for {progress.next.label}.</span>
              : progress.ready ? <span className={p.ready}>Every milestone is done.</span>
              : `${progress.current.done} of ${progress.current.total} milestones · ${progress.totals.done} of ${progress.totals.total} across the project`}
          </div>
        </div>
      </div>

      {isOwner && formatDraft != null && (
        <div className={p.formatBox}>
          <FormatPicker value={formatDraft} onChange={setFormatDraft} label="Project format" disabled={busy} />
          <p className={p.note}>Work already done stays; milestones that don’t apply to the new format are hidden, not deleted.</p>
          <div className={p.advance}>
            <button type="button" className={p.primary} disabled={busy || formatDraft === signals.project_type} onClick={saveFormat}>
              Make it a {formatDraft}
            </button>
            <button type="button" className={p.ghost} disabled={busy} onClick={() => setFormatDraft(null)}>Cancel</button>
          </div>
        </div>
      )}

      {suggestion && (
        <div className={p.suggest} role="status">
          <Sparkles size={14} aria-hidden className={p.suggestIcon} />
          <div className={p.suggestText}>
            <strong>Looks like {suggestion.label}</strong> — {suggestion.reasons.join('; ')}.
            {!isOwner && <span className={p.note}> The project owner moves it.</span>}
          </div>
          {isOwner && (
            <div className={p.suggestActions}>
              <button type="button" className={p.primary} disabled={busy} onClick={() => moveTo(suggestion.index)}>
                Move to {suggestion.label} <ArrowRight size={13} aria-hidden />
              </button>
              <button type="button" className={p.ghost} disabled={busy} onClick={() => void notYet(suggestion.index)}>Not yet</button>
            </div>
          )}
        </div>
      )}

      <ol className={p.rail} aria-label="Phases">
        {progress.phases.map((ph, i) => (
          <li key={ph.id} className={p.railItem}>
            <button
              type="button"
              className={[p.railBtn, i < progress.currentIndex && p.railDone, i === progress.currentIndex && p.railCurrent, i === shown.index && p.railSelected].filter(Boolean).join(' ')}
              aria-pressed={i === shown.index}
              aria-current={i === progress.currentIndex ? 'step' : undefined}
              aria-label={`${ph.label}: ${ph.done} of ${ph.total} milestones${i === progress.currentIndex ? ', current phase' : ''}`}
              onClick={() => setSelected(i === progress.currentIndex ? null : i)}
            >
              {i < progress.currentIndex && <Check size={10} aria-hidden />}
              {ph.abbr}
              <span className={p.railCount} aria-hidden>{ph.done}/{ph.total}</span>
            </button>
            {i < progress.phases.length - 1 && <span aria-hidden className={`${p.railLine} ${i < progress.currentIndex ? p.railLineDone : ''}`} />}
          </li>
        ))}
      </ol>

      <div className={p.cols}>
        <div>
          <div className={p.sectionTitle}>
            <Sub className={p.sectionHeading}>{isCurrent ? 'Milestones' : `${shown.label} milestones`}</Sub>
          </div>
          <MilestoneList progress={progress} phaseIndex={shown.index} projectId={projectId} onNavigate={onNavigate} />
          <div className={p.advance}>
            {isOwner && isCurrent && progress.next && (
              <button type="button" className={p.primary} disabled={busy} onClick={() => moveTo(progress.currentIndex + 1)}>
                Move to {progress.next.label} <ArrowRight size={13} aria-hidden />
              </button>
            )}
            {isOwner && !isCurrent && (
              <button type="button" className={p.ghost} disabled={busy} onClick={() => moveTo(shown.index)}>
                {shown.index > progress.currentIndex ? `Jump to ${shown.label}` : `Back to ${shown.label}`}
              </button>
            )}
            {!isOwner && isCurrent && progress.next && <span className={p.note}>The project owner moves it to {progress.next.label}.</span>}
            {!isCurrent && <button type="button" className={p.ghost} onClick={() => setSelected(null)}>Current phase</button>}
          </div>
        </div>

        <div>
          <div className={p.sectionTitle}>
            <Sub className={p.sectionHeading}>Toolkit · {progress.tools.filter((t) => t.unlocked).length} of {progress.tools.length} open</Sub>
            {isOwner && (
              <button type="button" role="switch" aria-checked={signals.unlock_all} className={`${p.switch} ${signals.unlock_all ? p.switchOn : ''}`} onClick={toggleUnlockAll}>
                <span className={p.switchTrack} aria-hidden /> Open all
              </button>
            )}
          </div>
          <div className={p.bricks}>
            {progress.tools.map((t) => <Brick key={t.id} tool={t} projectId={projectId} onNavigate={onNavigate} />)}
          </div>
        </div>
      </div>

      {reveal && (
        <UnlockReveal phaseLabel={reveal.label} tools={reveal.tools} projectId={projectId} style={style} onNavigate={onNavigate} onClose={() => setReveal(null)} />
      )}
    </section>
  );
}

function MilestoneList({ progress, phaseIndex, projectId, onNavigate }: {
  progress: ProjectProgress;
  phaseIndex: number;
  projectId: string;
  onNavigate?: (place: Place) => boolean;
}) {
  const phase = progress.phases[phaseIndex];
  if (!phase.milestones.length) return <p className={p.note}>Nothing to track in this phase for this kind of project.</p>;
  return (
    <ul className={p.list}>
      {phase.milestones.map((m) => (
        <li key={m.id} className={`${p.milestone} ${m.done ? p.milestoneDone : ''}`}>
          <span className={`${p.check} ${m.done ? p.checkDone : ''}`} aria-hidden><Check size={11} strokeWidth={3} /></span>
          <div style={{ minWidth: 0 }}>
            <div className={p.mLabel}>
              {m.label}
              <span className="sr-only">{m.done ? ' — done' : ' — to do'}</span>
            </div>
            {!m.done && <div className={p.mHint}>{m.hint}</div>}
            {!m.done && m.progress && (
              <div className={p.bar} role="progressbar" aria-label={`${m.label} progress`} aria-valuemin={0} aria-valuemax={m.progress.of} aria-valuenow={m.progress.value}>
                <div className={p.barFill} style={{ width: `${Math.round((m.progress.value / m.progress.of) * 100)}%` }} />
              </div>
            )}
          </div>
          {!m.done && (
            <PlaceLink place={m.place} projectId={projectId} onNavigate={onNavigate} className={p.go} label={`Go: ${m.label}`}>Go</PlaceLink>
          )}
        </li>
      ))}
    </ul>
  );
}
