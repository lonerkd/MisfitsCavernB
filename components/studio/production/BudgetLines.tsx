'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Briefcase, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';
import { breakdown, costByCategory } from '@/lib/breakdown';
import { addBudgetItem, deleteBudgetItem } from '@/lib/supabase/project-hub';
import { createJob, getBudgetItemIdsWithJobs } from '@/lib/supabase/jobs';
import { loadCrafts, suggestCraft } from '@/lib/crafts/crafts';
import { announceProgressChange } from '@/lib/supabase/progress';
import { money, type BudgetItem } from '@/lib/studio';
import s from '../studio.module.css';

/**
 * The budget's lines, made and kept here: the one budget in the suite (it used to be a second panel on the project page).
 * Add a line, remove one, post one as an open Jobs listing, or let the breakdown write its own lines from the cost of its
 * elements. What was paid is not typed here: it follows the spend below (purchase orders and expenses).
 */
export function BudgetLines({ projectId, userId, lines, onChange }: {
  projectId: string;
  userId: string | null;
  lines: BudgetItem[];
  onChange: () => void;
}) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [posted, setPosted] = useState<Set<string>>(new Set());
  const [posting, setPosting] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => { getBudgetItemIdsWithJobs(projectId).then(setPosted).catch(() => setPosted(new Set())); }, [projectId]);

  const changed = () => { announceProgressChange(projectId); onChange(); };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = category.trim();
    if (!name || busy) return;
    setBusy(true);
    try { await addBudgetItem(projectId, userId, name, Number(amount || 0)); setCategory(''); setAmount(''); changed(); }
    catch (err) { toast((err as { message?: string })?.message || 'Could not add the line.', 'error'); }
    finally { setBusy(false); }
  };

  const remove = async (line: BudgetItem) => {
    if (!await confirm(`Delete the budget line "${line.category}"? This cannot be undone.`)) return;
    try { await deleteBudgetItem(line.id); changed(); }
    catch (err) { toast((err as { message?: string })?.message || 'Could not delete the line.', 'error'); }
  };

  const postJob = async (line: BudgetItem) => {
    if (!userId || posted.has(line.id)) return;
    setPosting(line.id);
    try {
      // The job's craft: the one this line is about (a job needs one from the crafts list).
      const craft = suggestCraft(line.category, await loadCrafts());
      await createJob(projectId, userId, line.category.replace(/^Breakdown · /, ''), craft, '', Number(line.amount) || undefined, line.id);
      setPosted((prev) => new Set(prev).add(line.id));
      toast(`Posted "${line.category}" to the Jobs board`, 'success');
    } catch (err) {
      toast((err as { message?: string })?.message || 'Could not post this as a job', 'error');
    } finally { setPosting(null); }
  };

  // The breakdown's lines come from the breakdown itself: each element's cost, or its category's unit cost.
  const syncFromBreakdown = async () => {
    setBusy(true);
    try {
      const [cats, els] = await Promise.all([breakdown.listCategories(projectId), breakdown.listElements(projectId)]);
      if (!els.length) { setNote('Nothing is tagged yet. Break the script down in the editor (tag mode) first.'); return; }
      const costs = costByCategory(cats, els);
      const r = await breakdown.syncBudget(projectId, costs.map((c) => ({ label: c.category.label, amount: c.amount })));
      const unpriced = costs.reduce((n, c) => n + c.unpriced, 0);
      setNote(`${els.length} elements · ${money(costs.reduce((n, c) => n + c.amount, 0))}${unpriced ? ` · ${unpriced} still unpriced` : ''}${r.added + r.updated + r.removed ? '' : ' · already up to date'}`);
      changed();
    } catch (err) { toast((err as { message?: string })?.message || 'Could not read the breakdown.', 'error'); }
    finally { setBusy(false); }
  };

  return (
    <section aria-label="Budget lines" className={s.stack} style={{ gap: 10 }}>
      <div className={s.cardTitle}>Budget lines</div>
      {lines.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {lines.map((line) => {
            const isPosted = posted.has(line.id);
            return (
              <li key={line.id} className={s.panel} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px' }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis' }}>{line.category}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--fg-muted)' }}>{money(Number(line.amount) || 0)}</span>
                <button type="button" className={s.iconBtn} disabled={isPosted || posting === line.id} onClick={() => void postJob(line)}
                  aria-label={isPosted ? `${line.category} is already on the Jobs board` : `Post ${line.category} as a job`} title={isPosted ? 'Already posted to Jobs' : 'Post this line as an open Jobs listing'}>
                  <Briefcase size={14} aria-hidden />
                </button>
                <button type="button" className={s.iconBtn} onClick={() => void remove(line)} aria-label={`Delete ${line.category}`} title="Delete this line">
                  <Trash2 size={14} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <form onSubmit={add} className={s.row} style={{ gap: 8, flexWrap: 'wrap' }}>
        <label className="sr-only" htmlFor="budget-line-category">Category</label>
        <input id="budget-line-category" className={s.input} style={{ flex: '1 1 160px' }} placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
        <label className="sr-only" htmlFor="budget-line-amount">Planned amount</label>
        <input id="budget-line-amount" className={s.input} style={{ width: 120 }} type="number" min="0" step="any" placeholder="Planned $" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <button type="submit" className={s.btn} disabled={!category.trim() || busy}><Plus size={12} aria-hidden /> Add line</button>
      </form>
      <button type="button" className={s.btn} onClick={() => void syncFromBreakdown()} disabled={busy}>Update from the breakdown</button>
      <p className={s.hint} style={{ margin: 0 }}>
        {note ?? 'Writes one “Breakdown · …” line per category from the cost of its elements.'}{' '}
        <Link href="/studio?tab=production&view=breakdown" style={{ textDecoration: 'underline' }}>Open the breakdown</Link>
      </p>
    </section>
  );
}
