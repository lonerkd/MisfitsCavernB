'use client';

// The gate: leaving a phase, the owner decides what the library carries
// forward and what is archived. Nothing here deletes — an archived item is
// kept, hidden from the library by default, and taken off the public share
// link; it can be restored. Behind flag `phase_gates`.

import React, { useMemo, useState } from 'react';
import { Modal } from '@/components/studio/ui';
import s from '@/components/studio/studio.module.css';
import type { Phase } from '@/lib/os/phases';
import { defaultAction, summarize, toDecisions, type GateAction, type GateDecision, type GateItem } from '@/lib/studio/gate';

export function PhaseGate({ fromPhase, fromLabel, toLabel, items, busy, onCancel, onPass }: {
  fromPhase: Phase;
  fromLabel: string;
  toLabel: string;
  items: GateItem[];
  busy: boolean;
  onCancel: () => void;
  onPass: (decisions: GateDecision[]) => void;
}) {
  const [choice, setChoice] = useState<Record<string, GateAction>>({});
  const decisions = useMemo(() => toDecisions(items, choice, fromPhase), [items, choice, fromPhase]);
  const sum = summarize(decisions, items);
  const actionOf = (id: string) => choice[id] ?? defaultAction(fromPhase);
  const setAll = (action: GateAction) => setChoice(Object.fromEntries(items.map((m) => [m.id, action])));

  return (
    <Modal
      title={`Leaving ${fromLabel}`}
      onClose={onCancel}
      actions={<button type="button" className={s.btnPrimary} disabled={busy} onClick={() => onPass(decisions)} data-autofocus>Move to {toLabel}</button>}
    >
      <p className={s.hint}>
        For each item in the library, carry it into {toLabel} or archive it. Archived items are kept — hidden from the library until you show them, and taken off your share link — and you can restore any of them.
        {defaultAction(fromPhase) === 'archive' ? ` This is real work, so everything starts archived; carry what is still needed.` : ''}
      </p>
      <div className={s.toolbar} style={{ marginBottom: 8 }}>
        <button type="button" className={s.btn} onClick={() => setAll('carry')}>Carry all</button>
        <button type="button" className={s.btn} onClick={() => setAll('archive')}>Archive all</button>
        <span className={s.hint}>{sum.carried} carry · {sum.archived} archive{sum.unpublished ? ` · ${sum.unpublished} come off the share link` : ''}</span>
      </div>
      <div className={s.stack} style={{ gap: 6, maxHeight: '50vh', overflowY: 'auto' }}>
        {items.map((m) => (
          <div key={m.id} className={s.publishRow}>
            <div style={{ minWidth: 0 }}>
              <div className={s.cardTitle}>{m.title || 'Untitled'}</div>
              <div className={s.hint}>{m.kind}{m.shared ? ' · on the share link' : ''}</div>
            </div>
            <div className={s.chips} role="group" aria-label={`What to do with ${m.title || 'this item'}`}>
              {(['carry', 'archive'] as const).map((a) => (
                <button key={a} type="button" aria-pressed={actionOf(m.id) === a} className={`${s.chip} ${actionOf(m.id) === a ? s.chipOn : ''}`} onClick={() => setChoice((c) => ({ ...c, [m.id]: a }))}>
                  {a === 'carry' ? 'Carry on' : 'Archive'}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
