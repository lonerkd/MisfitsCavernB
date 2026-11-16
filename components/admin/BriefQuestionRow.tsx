'use client';

// One question on /admin/brief-questions: its place in the phase (up / down
// buttons, real buttons so the keyboard moves a question too), an Edit panel
// (the words, when it is asked, and per option what it implies and how a
// script shows it) and Remove. The checks are lib/brief/rules.ts; the save and
// the move are the page's, which says whether the database took them.

import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { BriefOption, BriefQuestion } from '@/lib/brief/core';
import { BRIEF_PHASES } from '@/lib/brief/check';
import {
  checkAskWhen, checkOptionLabel, checkOptionRules, checkWords, draftFromAskWhen, draftFromOption, newOptionId,
  type AskWhenDraft, type OptionRulesDraft, type RuleVocab,
} from '@/lib/brief/rules';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

const field: React.CSSProperties = { background: 'rgba(var(--ink-rgb), 0.05)', border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 8, padding: '8px 12px', color: 'var(--fg-strong)', fontSize: 14 };
const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--fg-muted)' };
const iconBtn: React.CSSProperties = { display: 'inline-flex', background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', padding: 6 };

export type QuestionPatch = { label: string; hint: string; phase: string; options: unknown[]; ask_when: Record<string, unknown> };

export function BriefQuestionRow({ q, all, vocab, first, last, moving, onMove, onRemove, onRemoveOption, onSave }: {
  q: BriefQuestion;
  all: BriefQuestion[];
  vocab: RuleVocab;
  first: boolean;
  last: boolean;
  moving: boolean;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  /** Asks, then removes one option and clears the answers that chose it; the page says whether it happened. */
  onRemoveOption: (optionId: string, label: string) => Promise<void>;
  onSave: (patch: QuestionPatch) => Promise<string | null>;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [label, setLabel] = useState(q.label);
  const [hint, setHint] = useState(q.hint);
  const [when, setWhen] = useState<AskWhenDraft>(() => draftFromAskWhen(q.ask_when));
  const [phase, setPhase] = useState<string>(q.phase);
  const [rules, setRules] = useState<Record<string, OptionRulesDraft>>(() => Object.fromEntries(q.options.map((o) => [o.id, draftFromOption(o)])));
  const [optLabels, setOptLabels] = useState<Record<string, string>>(() => Object.fromEntries(q.options.map((o) => [o.id, o.label])));
  // Options typed in this panel and not saved yet; they take their id when saved.
  const [added, setAdded] = useState<{ tid: number; label: string }[]>([]);
  const [nextTid, setNextTid] = useState(1);
  const choice = q.kind !== 'number';

  const reset = () => {
    setLabel(q.label); setHint(q.hint); setPhase(q.phase); setWhen(draftFromAskWhen(q.ask_when));
    setRules(Object.fromEntries(q.options.map((o) => [o.id, draftFromOption(o)])));
    setOptLabels(Object.fromEntries(q.options.map((o) => [o.id, o.label])));
    setAdded([]);
  };

  const save = async () => {
    const words = checkWords(label, hint);
    if (!words.ok) { toast(words.error, 'error'); return; }
    const askWhen = checkAskWhen(when, all, q.key, vocab);
    if (!askWhen.ok) { toast(askWhen.error, 'error'); return; }
    const options: BriefOption[] = [];
    for (const o of q.options) {
      const text = checkOptionLabel(optLabels[o.id] ?? o.label);
      if (!text.ok) { toast(text.error, 'error'); return; }
      const checked = checkOptionRules({ ...o, label: text.value }, rules[o.id] ?? draftFromOption(o), vocab);
      if (!checked.ok) { toast(checked.error, 'error'); return; }
      options.push(checked.value);
    }
    for (const a of added) {
      const text = checkOptionLabel(a.label);
      if (!text.ok) { toast(text.error, 'error'); return; }
      options.push({ id: newOptionId(text.value, options.map((o) => o.id)), label: text.value });
    }
    const dupe = options.find((o, i) => options.findIndex((p) => p.label.toLowerCase() === o.label.toLowerCase()) !== i);
    if (dupe) { toast(`Two options are called “${dupe.label}”: make each one different.`, 'error'); return; }
    setSaving(true);
    const error = await onSave({ ...words.value, phase, options: choice ? options : q.options, ask_when: askWhen.value });
    setSaving(false);
    if (error) { toast(`Could not save it: ${error}`, 'error'); return; }
    toast('Question saved', 'success');
    setAdded([]);
    setOpen(false);
  };

  const removeSaved = async (o: BriefOption) => {
    setRemoving(o.id);
    await onRemoveOption(o.id, o.label);
    setRemoving(null);
  };

  const setRule = (id: string, patch: Partial<OptionRulesDraft>) => setRules((r) => ({ ...r, [id]: { ...r[id], ...patch } }));

  return (
    <li style={{ border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 14, padding: '8px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14 }}>{q.label} <span style={{ color: 'var(--fg-muted)', fontSize: 12 }}>· {q.key} · {q.kind === 'number' ? `${q.min_value}–${q.max_value}${q.unit ? ` ${q.unit}` : ''}` : `${q.options.length} options`}</span></div>
          {q.hint && <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{q.hint}</div>}
        </div>
        <button type="button" aria-label={`Move ${q.label} up`} disabled={first || moving} onClick={() => onMove(-1)} style={{ ...iconBtn, opacity: first ? 0.35 : 1 }}><ArrowUp size={14} aria-hidden /></button>
        <button type="button" aria-label={`Move ${q.label} down`} disabled={last || moving} onClick={() => onMove(1)} style={{ ...iconBtn, opacity: last ? 0.35 : 1 }}><ArrowDown size={14} aria-hidden /></button>
        <button type="button" aria-label={`Edit ${q.label}`} aria-expanded={open} onClick={() => { if (open) reset(); setOpen(!open); }} style={iconBtn}><Pencil size={14} aria-hidden /></button>
        <button type="button" aria-label={`Remove ${q.label}`} onClick={onRemove} style={iconBtn}><Trash2 size={14} aria-hidden /></button>
      </div>

      {open && (
        <form aria-label={`Edit ${q.label}`} onSubmit={(e) => { e.preventDefault(); void save(); }} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 0 4px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <label style={labelStyle}>Question
              <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={120} style={{ ...field, minWidth: 280 }} />
            </label>
            <label style={labelStyle}>Hint (optional)
              <input value={hint} onChange={(e) => setHint(e.target.value)} maxLength={300} style={{ ...field, minWidth: 260 }} />
            </label>
            <label style={labelStyle}>Phase
              <select value={phase} onChange={(e) => setPhase(e.target.value)} style={field}>{BRIEF_PHASES.map((p) => <option key={p} value={p}>{p}</option>)}</select>
            </label>
          </div>

          <fieldset style={{ border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 8, padding: 10, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <legend style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Ask only when (leave empty to ask every project)</legend>
            <label style={labelStyle}>Only for formats
              <input value={when.formats} onChange={(e) => setWhen({ ...when, formats: e.target.value })} placeholder="Feature film, Short" style={{ ...field, minWidth: 200 }} />
            </label>
            <label style={labelStyle}>Never for formats
              <input value={when.notFormats} onChange={(e) => setWhen({ ...when, notFormats: e.target.value })} placeholder="Podcast" style={{ ...field, minWidth: 200 }} />
            </label>
            <label style={labelStyle}>After an earlier answer, one line each: question_key: option, option
              <textarea value={when.answer} onChange={(e) => setWhen({ ...when, answer: e.target.value })} rows={2} placeholder="goal: festivals" style={{ ...field, minWidth: 260, resize: 'vertical' }} />
            </label>
          </fieldset>

          {q.options.map((o) => {
            const d = rules[o.id] ?? draftFromOption(o);
            return (
              <fieldset key={o.id} style={{ border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 8, padding: 10, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <legend style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{o.label}</legend>
                <label style={labelStyle}>Option label
                  <input value={optLabels[o.id] ?? o.label} onChange={(e) => setOptLabels((l) => ({ ...l, [o.id]: e.target.value }))} maxLength={80} style={{ ...field, minWidth: 200 }} />
                </label>
                <label style={labelStyle}>Roles it calls for
                  <input value={d.crafts} onChange={(e) => setRule(o.id, { crafts: e.target.value })} placeholder="Gaffer, Electrician" style={{ ...field, minWidth: 200 }} />
                </label>
                <label style={labelStyle}>Breakdown categories
                  <input value={d.breakdown} onChange={(e) => setRule(o.id, { breakdown: e.target.value })} placeholder="props, vehicles" style={{ ...field, minWidth: 160 }} />
                </label>
                <label style={labelStyle}>Lounge channels
                  <input value={d.channels} onChange={(e) => setRule(o.id, { channels: e.target.value })} placeholder="dailies" style={{ ...field, minWidth: 140 }} />
                </label>
                <label style={labelStyle}>Pages per day
                  <input value={d.pagesPerDay} onChange={(e) => setRule(o.id, { pagesPerDay: e.target.value })} inputMode="decimal" style={{ ...field, width: 90 }} />
                </label>
                <label style={labelStyle}>Found in a script by these words
                  <input value={d.words} onChange={(e) => setRule(o.id, { words: e.target.value })} placeholder="fight, punch" style={{ ...field, minWidth: 220 }} />
                </label>
                <label style={labelStyle}>A character younger than
                  <input value={d.agesUnder} onChange={(e) => setRule(o.id, { agesUnder: e.target.value })} inputMode="numeric" style={{ ...field, width: 90 }} />
                </label>
                <label style={{ ...labelStyle, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" checked={d.nightExteriors} onChange={(e) => setRule(o.id, { nightExteriors: e.target.checked })} /> Night exteriors
                </label>
                <Button type="button" variant="ghost" disabled={q.options.length <= 2 || removing !== null || saving} onClick={() => void removeSaved(o)} aria-label={`Remove option ${o.label}`}>
                  <Trash2 size={14} aria-hidden /> Remove option
                </Button>
              </fieldset>
            );
          })}

          {choice && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {added.map((a) => (
                <div key={a.tid} style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                  <label style={labelStyle}>New option
                    <input value={a.label} onChange={(e) => setAdded((list) => list.map((x) => (x.tid === a.tid ? { ...x, label: e.target.value } : x)))} maxLength={80} style={{ ...field, minWidth: 200 }} />
                  </label>
                  <button type="button" aria-label="Discard new option" onClick={() => setAdded((list) => list.filter((x) => x.tid !== a.tid))} style={iconBtn}><X size={14} aria-hidden /></button>
                </div>
              ))}
              <div><Button type="button" variant="ghost" onClick={() => { setAdded((list) => [...list, { tid: nextTid, label: '' }]); setNextTid(nextTid + 1); }}><Plus size={14} aria-hidden /> Add option</Button></div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save question'}</Button>
            <Button type="button" variant="ghost" onClick={() => { reset(); setOpen(false); }}>Cancel</Button>
          </div>
        </form>
      )}
    </li>
  );
}
