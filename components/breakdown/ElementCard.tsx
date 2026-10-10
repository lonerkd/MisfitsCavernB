'use client';

import React, { useEffect, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { useConfirm } from '@/components/ui/Confirm';
import { useToast } from '@/components/ui/Toast';
import { breakdown, ELEMENT_STATUSES, type BreakdownElement, type BreakdownState, type ElementStatus } from '@/lib/breakdown';
import { readable } from '@/lib/util/color';
import { CategoryChips, catStyle } from './CategoryChips';
import b from './breakdown.module.css';
import { useOnChange } from '@/lib/hooks/useOnChange';

export const STATUS_LABEL: Record<ElementStatus, string> = { needed: 'Needed', sourcing: 'Sourcing', ready: 'Ready' };
export const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

/**
 * One element of the breakdown: name, category, status, cost, who's on it,
 * notes, and the scenes it's tagged in. Used beside the script and in the
 * Studio's breakdown.
 */
export function ElementCard({ element, state, crew, scenes, scenesLabel, onJumpToScene, onUntagHere, onClose }: {
  element: BreakdownElement;
  state: BreakdownState;
  crew: Array<{ user_id: string; username: string }>;
  /** The scenes it's tagged in, as the host numbers them. */
  scenes: Array<{ key: string; label: string; current?: boolean }>;
  scenesLabel: string;
  onJumpToScene?: (key: string) => void;
  /** Offered when the host has a current scene the element is tagged in. */
  onUntagHere?: () => void;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [name, setName] = useState(element.name);
  const [cost, setCost] = useState(element.cost == null ? '' : String(element.cost));
  const [notes, setNotes] = useState(element.notes ?? '');
  // The saved values changed (here or elsewhere): show them.
  useOnChange(`${element.name}\u0000${element.cost ?? ''}\u0000${element.notes ?? ''}`, () => {
    setName(element.name); setCost(element.cost == null ? '' : String(element.cost)); setNotes(element.notes ?? '');
  });
  const category = state.categoryById.get(element.category_id);
  const unitCost = category?.unit_cost ?? 0;

  const save = async (patch: Parameters<typeof breakdown.updateElement>[1]) => {
    const before = element;
    state.elements.upsertLocal({ ...element, ...patch, updated_at: new Date().toISOString() });
    try {
      state.elements.upsertLocal(await breakdown.updateElement(element.id, patch));
    } catch (e) {
      state.elements.upsertLocal({ ...before, updated_at: new Date().toISOString() });
      toast(e instanceof Error ? e.message : 'Could not save', 'error');
    }
  };

  const remove = async () => {
    const n = state.tags.rows.filter((t) => t.element_id === element.id).length;
    if (!await confirm({ title: `Delete “${element.name}”?`, message: `It comes out of the breakdown${n ? ` and off ${n} scene${n === 1 ? '' : 's'}` : ''}. The script text is not changed.`, confirmLabel: 'Delete' })) return;
    try {
      await breakdown.deleteElement(element.id);
      state.elements.removeLocal(element.id);
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not delete', 'error');
    }
  };

  return (
    <section className={b.card} style={catStyle(category?.color ?? '#888888')} aria-label={`Element: ${element.name}`}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label htmlFor="bd-el-name" className="sr-only">Name</label>
        <input id="bd-el-name" className={b.input} value={name} maxLength={120} onChange={(e) => setName(e.target.value)}
          onBlur={() => { const v = name.trim(); if (v && v !== element.name) void save({ name: v }); else setName(element.name); }}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
        <button type="button" className={b.iconBtn} aria-label="Close element" onClick={onClose}><X size={13} /></button>
      </div>

      <div>
        <span className={b.fieldLabel}>Category</span>
        <CategoryChips categories={state.categories.rows} selected={element.category_id} label="Category" onPick={(c) => { if (c.id !== element.category_id) void save({ category_id: c.id }); }} />
      </div>

      <div>
        <span className={b.fieldLabel} id="bd-status">Status</span>
        <div className={b.seg} role="radiogroup" aria-labelledby="bd-status">
          {ELEMENT_STATUSES.map((s) => (
            <button key={s} type="button" role="radio" aria-checked={element.status === s} className={`${b.segBtn} ${element.status === s ? b.segOn : ''}`} onClick={() => { if (s !== element.status) void save({ status: s }); }}>
              <span className={`${b.status} ${b[`status_${s}`]}`} aria-hidden />{STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div className={b.row2}>
        <div>
          <label htmlFor="bd-el-cost" className={b.fieldLabel}>Cost</label>
          <input id="bd-el-cost" className={b.input} inputMode="decimal" value={cost} placeholder={unitCost ? `${money(unitCost)} (category)` : '$0'}
            onChange={(e) => setCost(e.target.value.replace(/[^0-9.]/g, ''))}
            onBlur={() => {
              const v = cost === '' ? null : Number(cost);
              if (v !== null && !Number.isFinite(v)) { setCost(element.cost == null ? '' : String(element.cost)); return; }
              if (v !== element.cost) void save({ cost: v });
            }} />
        </div>
        <div>
          <span className={b.fieldLabel} id="bd-owner">Who’s on it</span>
          <div className={b.chips} role="radiogroup" aria-labelledby="bd-owner">
            {crew.length === 0 && <span className={b.hint}>Add crew on the project page.</span>}
            {crew.map((c) => (
              <button key={c.user_id} type="button" role="radio" aria-checked={element.assigned_to === c.user_id}
                className={`${b.sceneLink} ${element.assigned_to === c.user_id ? b.sceneLinkOn : ''}`}
                onClick={() => void save({ assigned_to: element.assigned_to === c.user_id ? null : c.user_id })}>
                {c.username}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="bd-el-notes" className={b.fieldLabel}>Notes</label>
        <textarea id="bd-el-notes" className={b.textarea} value={notes} maxLength={2000} placeholder="Continuity, where it comes from, what it must do on camera…"
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => { const v = notes.trim() || null; if (v !== (element.notes ?? null)) void save({ notes: v }); }} />
      </div>

      <div>
        <span className={b.fieldLabel}>{scenesLabel}</span>
        <div className={b.sceneLinks}>
          {scenes.length === 0 && <span className={b.hint}>Not tagged in any scene.</span>}
          {scenes.map((sc) => onJumpToScene ? (
            <button key={sc.key} type="button" className={`${b.sceneLink} ${sc.current ? b.sceneLinkOn : ''}`} aria-current={sc.current ? 'true' : undefined} onClick={() => onJumpToScene(sc.key)}>{sc.label}</button>
          ) : (
            <span key={sc.key} className={b.sceneLink} style={{ cursor: 'default' }}>{sc.label}</span>
          ))}
        </div>
      </div>

      <div className={b.barActions} style={{ marginTop: 0 }}>
        {onUntagHere && (
          <button type="button" className={b.btn} onClick={onUntagHere}>Untag in this scene</button>
        )}
        <button type="button" className={b.btn} style={{ color: readable('var(--danger)') }} onClick={remove}><Trash2 size={11} aria-hidden /> Delete element</button>
      </div>
    </section>
  );
}
