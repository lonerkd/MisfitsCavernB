'use client';

import { useCallback, useMemo, useState } from 'react';
import { GitCompare, History, RotateCcw, Save, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';
import { supabase } from '@/lib/supabase/client';
import { studio, type SceneRow, type ShootDay } from '@/lib/studio';
import { describeDiff, diffSchedules, parseSnapshot, restorePlan, type ScheduleSnapshot } from '@/lib/studio/schedule-versions';
import { autoVersionLabel, createScheduleVersionsApi, VERSION_LABEL_MAX, type ScheduleVersion } from '@/lib/studio/schedule-versions-api';
import { cx } from '../ui';
import s from '../studio.module.css';
import b from './stripboard.module.css';

const scheduleVersions = createScheduleVersionsApi(supabase);
const when = (iso: string) => new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const dateText = (d: string | null) => (d ? new Date(`${d}T00:00`).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'no date');

/**
 * Named versions of the schedule: save the board as it is, compare any version with the live board, restore one. Restoring
 * saves the live board as a version first, then puts each scene and day date back through the ordinary updates.
 */
export function ScheduleVersions({ projectId, live, canWrite, upsertScene, upsertDay, onAnnounce }: {
  projectId: string;
  live: ScheduleSnapshot;
  canWrite: boolean;
  upsertScene: (row: SceneRow) => void;
  upsertDay: (row: ShootDay) => void;
  onAnnounce: (text: string) => void;
}) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<ScheduleVersion[] | null>(null);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [comparing, setComparing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setVersions(await scheduleVersions.listVersions(projectId)); }
    catch (e) { setVersions([]); toast(e instanceof Error ? e.message : 'Could not load the versions', 'error'); }
  }, [projectId, toast]);
  const toggle = () => {
    if (!open && versions === null) void load();
    setOpen(!open);
  };

  const shown = comparing ? versions?.find((v) => v.id === comparing) ?? null : null;
  const diff = useMemo(() => {
    const snap = shown ? parseSnapshot(shown.snapshot) : null;
    return snap ? diffSchedules(snap, live) : null;
  }, [shown, live]);

  const save = async () => {
    setBusy(true);
    try {
      const v = await scheduleVersions.saveVersion(projectId, label, live);
      setVersions((cur) => [v, ...(cur ?? [])]);
      setLabel('');
      toast(`Saved “${v.label}”`, 'success');
      onAnnounce(`Saved schedule version ${v.label}.`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save the version', 'error');
    }
    setBusy(false);
  };

  const remove = async (v: ScheduleVersion) => {
    if (!await confirm({ title: 'Delete this version?', message: `“${v.label}” is removed for good. The live schedule is not touched.`, confirmLabel: 'Delete', danger: true })) return;
    try {
      await scheduleVersions.removeVersion(v.id);
      setVersions((cur) => (cur ?? []).filter((x) => x.id !== v.id));
      if (comparing === v.id) setComparing(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not delete the version', 'error');
    }
  };

  const restore = async (v: ScheduleVersion) => {
    const snap = parseSnapshot(v.snapshot);
    if (!snap) { toast('That version is unreadable, so it cannot be restored.', 'error'); return; }
    const plan = restorePlan(snap, live);
    if (!plan.moves.length && !plan.dates.length) { toast('The schedule already matches this version.', 'info'); return; }
    const parts = [
      plan.moves.length ? `${plan.moves.length} scene${plan.moves.length === 1 ? '' : 's'} move back` : '',
      plan.dates.length ? `${plan.dates.length} day date${plan.dates.length === 1 ? '' : 's'} change` : '',
    ].filter(Boolean).join(' and ');
    if (!await confirm({
      title: `Restore “${v.label}”?`,
      message: `${parts}. The schedule as it is now is saved as a version first, so you can come back to it.${plan.gone ? ` ${plan.gone} scene${plan.gone === 1 ? ' in this version is' : 's in this version are'} gone from the script and stay${plan.gone === 1 ? 's' : ''} out.` : ''}`,
      confirmLabel: 'Restore',
      danger: false,
    })) return;
    setBusy(true);
    try {
      // Nothing is lost: the live board is saved first, and if that fails the restore does not start.
      const auto = await scheduleVersions.saveVersion(projectId, autoVersionLabel(v.label), live, true);
      setVersions((cur) => [auto, ...(cur ?? [])]);
    } catch (e) {
      toast(`${e instanceof Error ? e.message : 'Could not save the current schedule'} — nothing was restored.`, 'error');
      setBusy(false);
      return;
    }
    let failed = 0;
    for (const m of plan.moves) {
      try { upsertScene(await studio.updateScene(m.id, { shoot_day: m.to })); } catch { failed++; }
    }
    for (const d of plan.dates) {
      try { upsertDay(await studio.setShootDayDate(projectId, d.day, d.to)); } catch { failed++; }
    }
    setBusy(false);
    setComparing(null);
    if (failed) toast(`Restored with ${failed} change${failed === 1 ? '' : 's'} that could not be written — try again.`, 'error');
    else { toast(`Restored “${v.label}”`, 'success'); onAnnounce(`Restored schedule version ${v.label}.`); }
  };

  return (
    <div className={b.versions}>
      <button type="button" className={cx(s.btn, s.small)} aria-expanded={open} aria-controls="schedule-versions" onClick={toggle}>
        <History size={11} aria-hidden /> Versions{versions && versions.length ? ` (${versions.length})` : ''}
      </button>
      {open && (
        <div id="schedule-versions" className={b.versionsPanel} role="region" aria-label="Schedule versions">
          {canWrite ? (
            <form className={b.versionsSave} onSubmit={(e) => { e.preventDefault(); void save(); }}>
              <input className={s.input} aria-label="Version name" placeholder="Name this version, e.g. Locations first" maxLength={VERSION_LABEL_MAX} value={label} onChange={(e) => setLabel(e.target.value)} />
              <button type="submit" className={cx(s.btn, s.small)} disabled={busy || !label.trim()}><Save size={11} aria-hidden /> Save a version</button>
            </form>
          ) : (
            <p className={b.hint}>Only the project owner saves and restores versions.</p>
          )}
          {versions === null && <p className={b.hint}>Loading…</p>}
          {versions && versions.length === 0 && <p className={b.hint}>No versions yet. Save one before you try a different order.</p>}
          {versions && versions.length > 0 && (
            <ul className={b.versionList} aria-label="Saved versions">
              {versions.map((v) => (
                <li key={v.id} className={b.versionRow} data-testid="schedule-version">
                  <span className={b.versionName}>{v.label}{v.auto && <em> · auto-saved</em>}</span>
                  <span className={b.hint}>{when(v.created_at)}</span>
                  <button type="button" className={cx(s.btn, s.small)} aria-pressed={comparing === v.id} aria-label={`Compare “${v.label}” with the live schedule`} onClick={() => setComparing(comparing === v.id ? null : v.id)}><GitCompare size={11} aria-hidden /> Compare</button>
                  {canWrite && <button type="button" className={cx(s.btn, s.small)} disabled={busy} aria-label={`Restore “${v.label}”`} onClick={() => void restore(v)}><RotateCcw size={11} aria-hidden /> Restore</button>}
                  {canWrite && <button type="button" className={cx(s.btn, s.small)} disabled={busy} aria-label={`Delete “${v.label}”`} onClick={() => void remove(v)}><Trash2 size={11} aria-hidden /></button>}
                </li>
              ))}
            </ul>
          )}
          {shown && (
            <div className={b.versionDiff} role="region" aria-label={`“${shown.label}” compared with the live schedule`}>
              <strong>“{shown.label}” → live: {diff ? describeDiff(diff) : 'unreadable'}</strong>
              {diff && !diff.same && (
                <ul>
                  {diff.moved.map((m) => <li key={m.id}>Scene {m.scene_number}: day {m.from} → day {m.to}</li>)}
                  {diff.added.map((m) => <li key={m.id}>Scene {m.scene_number} is new, on day {m.day}</li>)}
                  {diff.removed.map((m) => <li key={m.id}>Scene {m.scene_number} (day {m.day}) is gone</li>)}
                  {diff.dates.map((d) => <li key={d.day}>Day {d.day} date: {dateText(d.from)} → {dateText(d.to)}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
