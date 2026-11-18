'use client';

import React, { useMemo, useState } from 'react';
import { Music2, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { useSettingsList } from './useSettingsList';
import { SceneLinkField, useRecordTargets } from './RecordLinks';
import { sceneChip } from '@/lib/studio/record-links';
import {
  CUE_KINDS, CUE_USES, LICENCE_LABEL, LICENCE_STATUSES, cueProblems, cueSeconds, fmtDuration, summarize,
  type Cue, type LicenceStatus,
} from '@/lib/studio/cues';
import { useStudio } from '../StudioContext';
import { ToolHeader } from '../ToolHeader';
import { cx } from '../ui';
import s from '../studio.module.css';

const BLANK: Omit<Cue, 'id'> = {
  scene: '', cue: '', title: '', kind: 'score', use: 'background instrumental', composer: '', publisher: '', pro: '', masterOwner: '',
  tcIn: '', tcOut: '', status: 'needed', fee: null, territory: '', term: '', contact: '', notes: '',
};
const money = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

/**
 * The music cue sheet and licensing tracker: every cue in the film with where it plays, who wrote and owns it, whether the
 * production may use it, and what it costs. It says what still stops a cue from locking the picture, and prints as the cue sheet
 * a performing-rights society expects.
 */
export function CuesView() {
  const { project } = useStudio();
  const { items, shown, save, remove } = useSettingsList('cues');
  const t = useRecordTargets();
  const [draft, setDraft] = useState<Omit<Cue, 'id'>>(BLANK);
  const [filter, setFilter] = useState<'all' | 'open'>('all');

  const sum = useMemo(() => summarize(items), [items]);
  const list = useMemo(() => (filter === 'open' ? shown.filter((c) => cueProblems(c, items).length > 0) : shown), [shown, items, filter]);

  const add = async () => {
    if (!draft.title.trim()) return;
    if (!(await save([...items, { ...draft, id: `cue-${Date.now()}` }]))) return;
    setDraft({ ...BLANK, kind: draft.kind });
  };
  const patch = async (id: string, p: Partial<Cue>) => { await save(items.map((c) => (c.id === id ? { ...c, ...p } : c))); };

  return (
    <div className={s.stack} style={{ gap: 24, maxWidth: 1000 }}>
      <ToolHeader icon={<Music2 size={16} />} eyebrow="Departments" title="Music cues & licensing" accent={project.accent_color}
        purpose="Every piece of music: where it plays, who owns it, whether you may use it, and what it costs."
        summary={<>{sum.count} cues · {fmtDuration(sum.seconds)} of music{sum.open ? ` · ${sum.open} without a licence` : ''}{sum.denied ? ` · ${sum.denied} denied` : ''}{sum.fees ? ` · ${money(sum.fees)} agreed` : ''}{sum.unpriced ? ` · ${sum.unpriced} unpriced` : ''}</>}
        next={sum.denied ? { text: `${sum.denied} cue${sum.denied === 1 ? ' was' : 's were'} denied a licence: replace or cut ${sum.denied === 1 ? 'it' : 'them'} before the picture locks.` } : sum.open ? { text: `${sum.open} cue${sum.open === 1 ? ' has' : 's have'} no licence yet. Clear ${sum.open === 1 ? 'it' : 'them'} or commission replacements.` } : null}
      />

      <div className={s.panel} style={{ padding: 12 }}>
        <div className={s.row} style={{ gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label className={s.field} style={{ flex: '0 0 80px' }}><span className={s.label}>Cue #</span>
            <input className={s.input} value={draft.cue} onChange={(e) => setDraft({ ...draft, cue: e.target.value })} placeholder="1M1" /></label>
          <label className={s.field} style={{ flex: '1 1 180px' }}><span className={s.label}>Title</span>
            <input className={s.input} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Harbour theme" /></label>
          <label className={s.field} style={{ flex: '0 0 130px' }}><span className={s.label}>Kind</span>
            <select className={s.select} value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as Cue['kind'] })}>
              {CUE_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}</select></label>
          <label className={s.field} style={{ flex: '0 0 190px' }}><span className={s.label}>How it is heard</span>
            <select className={s.select} value={draft.use} onChange={(e) => setDraft({ ...draft, use: e.target.value as Cue['use'] })}>
              {CUE_USES.map((u) => <option key={u} value={u}>{u}</option>)}</select></label>
          <SceneLinkField scenes={t.scenes} sceneById={t.sceneById} ids={draft.scene_ids ?? []} text={draft.scene} onChange={(n) => setDraft({ ...draft, scene: n.text, scene_ids: n.ids })} placeholder="12" />
          <label className={s.field} style={{ flex: '0 0 90px' }}><span className={s.label}>In</span>
            <input className={s.input} value={draft.tcIn} onChange={(e) => setDraft({ ...draft, tcIn: e.target.value })} placeholder="1:05:00" /></label>
          <label className={s.field} style={{ flex: '0 0 90px' }}><span className={s.label}>Out</span>
            <input className={s.input} value={draft.tcOut} onChange={(e) => setDraft({ ...draft, tcOut: e.target.value })} placeholder="1:06:30" /></label>
          <button className={s.btnPrimary} onClick={() => void add()} disabled={!draft.title.trim()}><Plus size={12} /> Add cue</button>
        </div>
      </div>

      {items.length > 0 && (
        <div className={s.chips} role="group" aria-label="Show">
          <button type="button" className={cx(s.chip, filter === 'all' && s.chipOn)} onClick={() => setFilter('all')}>All cues</button>
          <button type="button" className={cx(s.chip, filter === 'open' && s.chipOn)} onClick={() => setFilter('open')}>Needs attention</button>
        </div>
      )}

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.map((c) => {
          const problems = cueProblems(c, items);
          const secs = cueSeconds(c);
          return (
            <li key={c.id} className={s.panel} style={{ padding: 12, display: 'grid', gap: 8 }}>
              <div className={s.row} style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className={s.chip}>{c.cue || 'no #'}</span>
                <span style={{ fontWeight: 600 }}>{c.title}</span>
                <span className={s.hint}>{c.kind} · {c.use}</span>
                {sceneChip(c, t.sceneById) && <span className={s.chip}>Sc {sceneChip(c, t.sceneById)}</span>}
                {secs != null && <span className={s.hint}>{c.tcIn}–{c.tcOut} · {fmtDuration(secs)}</span>}
                <select className={s.select} style={{ marginLeft: 'auto', width: 170 }} aria-label={`Licence for ${c.title}`} value={c.status} onChange={(e) => void patch(c.id, { status: e.target.value as LicenceStatus })}>
                  {LICENCE_STATUSES.map((st) => <option key={st} value={st}>{LICENCE_LABEL[st]}</option>)}</select>
                <button className={s.btn} onClick={() => remove(c.id)} aria-label={`Delete ${c.title}`}><Trash2 size={12} /></button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
                <Field label="Composer" value={c.composer} onSave={(v) => patch(c.id, { composer: v })} />
                <Field label="Publisher" value={c.publisher} onSave={(v) => patch(c.id, { publisher: v })} />
                <Field label="PRO" value={c.pro} onSave={(v) => patch(c.id, { pro: v })} placeholder="ASCAP, BMI, PRS" />
                <Field label="Master owner" value={c.masterOwner} onSave={(v) => patch(c.id, { masterOwner: v })} placeholder="Label or artist" />
                <Field label="Fee" value={c.fee == null ? '' : String(c.fee)} onSave={(v) => { const n = Number(v.replace(/[^0-9.]/g, '')); return patch(c.id, { fee: v.trim() && Number.isFinite(n) ? n : null }); }} placeholder="2500" />
                <Field label="Territory" value={c.territory} onSave={(v) => patch(c.id, { territory: v })} placeholder="Worldwide" />
                <Field label="Term" value={c.term} onSave={(v) => patch(c.id, { term: v })} placeholder="In perpetuity" />
                <Field label="Contact" value={c.contact} onSave={(v) => patch(c.id, { contact: v })} />
              </div>
              {problems.length > 0 && (
                <p className={s.hint} style={{ margin: 0, color: 'var(--warn)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <AlertTriangle size={12} aria-hidden style={{ marginTop: 2, flex: '0 0 auto' }} />
                  <span>{problems.join(' · ')}</span>
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {items.length > 0 && list.length === 0 && <p className={s.hint}>{shown.length === 0 ? 'No records match your search.' : 'Every cue is in good order.'}</p>}
    </div>
  );
}

/** A text box that saves when the person leaves it, and only if it changed. */
function Field({ label, value, onSave, placeholder }: { label: string; value: string; onSave: (v: string) => unknown; placeholder?: string }) {
  return (
    <label className={s.field}><span className={s.label}>{label}</span>
      <input className={s.input} defaultValue={value} key={value} placeholder={placeholder} maxLength={200}
        onBlur={(e) => { const v = e.target.value.trim(); if (v !== value) void onSave(v); }} /></label>
  );
}
