'use client';

import React, { useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';
import { setBudgetApproved } from '@/lib/supabase/budget-approval';
import { announceProgressChange } from '@/lib/supabase/progress';
import { useProject } from '@/lib/os';
import { money, type BudgetItem } from '@/lib/studio';
import s from '../studio.module.css';

/** Where the budget stands against what the owner approved: approved as it is, changed since, or not approved. Pure. */
export function approvalState(
  approvedAt: string | null | undefined,
  approvedTotal: number | null | undefined,
  approvedLines: number | null | undefined,
  lines: readonly (Pick<BudgetItem, 'amount'> & Partial<Pick<BudgetItem, 'fringe_amount'>>)[],
): 'none' | 'approved' | 'changed' {
  if (!approvedAt) return 'none';
  const total = lines.reduce((n, l) => n + Number(l.amount ?? 0) + Number(l.fringe_amount ?? 0), 0);
  return Math.abs(total - Number(approvedTotal ?? 0)) < 0.005 && lines.length === (approvedLines ?? 0) ? 'approved' : 'changed';
}

/**
 * The owner's Approve button for the budget (BACKLOG 3.52). The database stamps who, when, and the total and line count at that moment, so
 * a later change to a line reads "changed since approved" until the owner approves again. Everyone who sees the budget sees the state.
 */
export function BudgetApproval({ projectId, isOwner, lines, approvedAt, approvedTotal, approvedLines, approvedByName }: {
  projectId: string; isOwner: boolean; lines: readonly BudgetItem[];
  approvedAt: string | null | undefined; approvedTotal: number | null | undefined; approvedLines: number | null | undefined; approvedByName?: string | null;
}) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const { refreshProject } = useProject();
  const [busy, setBusy] = useState(false);
  const state = approvalState(approvedAt, approvedTotal, approvedLines, lines);
  const total = lines.reduce((n, l) => n + Number(l.amount ?? 0) + Number(l.fringe_amount ?? 0), 0);

  const save = async (approve: boolean) => {
    if (busy) return;
    if (!approve && !await confirm({ title: 'Withdraw the approval?', message: 'The budget goes back to not approved.', confirmLabel: 'Withdraw' })) return;
    setBusy(true);
    try {
      await setBudgetApproved(projectId, approve);
      await refreshProject(projectId);
      announceProgressChange(projectId);
      toast(approve ? 'Budget approved' : 'Approval withdrawn', 'success');
    } catch (e) { toast(e instanceof Error ? e.message : 'Could not save the approval', 'error'); }
    finally { setBusy(false); }
  };

  const when = approvedAt ? new Date(approvedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  return (
    <div className={s.panel} data-testid="budget-approval" style={{ padding: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <BadgeCheck size={16} aria-hidden style={{ color: state === 'approved' ? 'var(--ok)' : state === 'changed' ? 'var(--warn)' : 'var(--fg-muted)' }} />
      <div style={{ flex: '1 1 220px' }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          {state === 'none' && 'Not approved'}
          {state === 'approved' && `Approved ${when}${approvedByName ? ` by ${approvedByName}` : ''}`}
          {state === 'changed' && 'Changed since approved'}
        </div>
        <div className={s.hint}>
          {state === 'none' && (lines.length ? `${lines.length} line${lines.length === 1 ? '' : 's'}, ${money(total)} planned.` : 'Add budget lines first.')}
          {state === 'approved' && `${approvedLines} line${approvedLines === 1 ? '' : 's'}, ${money(Number(approvedTotal ?? 0))} planned when approved.`}
          {state === 'changed' && `Approved at ${money(Number(approvedTotal ?? 0))} over ${approvedLines} line${approvedLines === 1 ? '' : 's'}; now ${money(total)} over ${lines.length}.`}
        </div>
      </div>
      {isOwner && (
        <div style={{ display: 'flex', gap: 6 }}>
          {state !== 'approved' && <button type="button" className={s.btnPrimary} disabled={busy || lines.length === 0} onClick={() => void save(true)}>{state === 'changed' ? 'Approve again' : 'Approve budget'}</button>}
          {state !== 'none' && <button type="button" className={s.btn} disabled={busy} onClick={() => void save(false)}>Withdraw</button>}
        </div>
      )}
    </div>
  );
}
