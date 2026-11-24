'use client';

import React, { useEffect, useRef, useState } from 'react';
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
import { lineCost, perDiemAmount } from '@/lib/studio/fringes';
import { addFringe, addPerDiem, deleteFringe, listFringeLinks, listFringes, setLineFringe, type BudgetFringe } from '@/lib/supabase/budget-fringes';
import { templateTotal, type BudgetTemplate } from '@/lib/studio/budget-templates';
import { applyBudgetTemplate, listBudgetTemplates, setBudgetAboveTheLine } from '@/lib/supabase/budget-templates';
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
  const [templates, setTemplates] = useState<BudgetTemplate[] | null>(null);
  const [starting, setStarting] = useState<string | null>(null);
  const empty = lines.length === 0;
  // Fringes (a project's own named rates) and which are applied to which line; per diems (days x rate x people).
  const [fringes, setFringes] = useState<BudgetFringe[]>([]);
  const [applied, setApplied] = useState<Set<string>>(new Set());   // "lineId:fringeId"
  const [fName, setFName] = useState('');
  const [fPercent, setFPercent] = useState('');
  const [fCap, setFCap] = useState('');
  const [pdName, setPdName] = useState('');
  const [pdDays, setPdDays] = useState('');
  const [pdRate, setPdRate] = useState('');
  const [pdPeople, setPdPeople] = useState('1');

  // A read that finishes after the view is gone must not set state (it also failed the unit run now and then, with the page already torn down).
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const loadFringes = () => Promise.all([listFringes(projectId), listFringeLinks(projectId)]).then(
    ([f, links]) => { if (mounted.current) { setFringes(f); setApplied(new Set(links.map((l) => `${l.budget_item_id}:${l.fringe_id}`))); } },
    () => { if (mounted.current) { setFringes([]); setApplied(new Set()); } },
  );
  useEffect(() => { void loadFringes(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // The starting points are only fetched when the budget is empty (that is the only time they are offered).
  useEffect(() => {
    if (!empty) return;
    let live = true;
    listBudgetTemplates().then((t) => { if (live) setTemplates(t); }, () => { if (live) setTemplates([]); });
    return () => { live = false; };
  }, [empty]);

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

  const addFringeRate = async (e: React.FormEvent) => {
    e.preventDefault();
    const percent = Number(fPercent);
    const cap = fCap.trim() === '' ? null : Number(fCap);
    if (!fName.trim() || !Number.isFinite(percent) || percent < 0 || percent > 100 || (cap != null && (!Number.isFinite(cap) || cap < 0)) || busy) return;
    setBusy(true);
    try { await addFringe(projectId, userId, fName, percent, cap); setFName(''); setFPercent(''); setFCap(''); await loadFringes(); }
    catch (err) { toast((err as { message?: string })?.message || 'Could not add the fringe.', 'error'); }
    finally { setBusy(false); }
  };

  const removeFringe = async (f: BudgetFringe) => {
    if (!await confirm(`Delete the fringe "${f.name}"? It comes off every line that carries it.`)) return;
    try { await deleteFringe(f.id); await loadFringes(); changed(); }
    catch (err) { toast((err as { message?: string })?.message || 'Could not delete the fringe.', 'error'); }
  };

  const toggleFringe = async (line: BudgetItem, f: BudgetFringe, on: boolean) => {
    try { await setLineFringe(projectId, line.id, f.id, on); await loadFringes(); changed(); }
    catch (err) { toast((err as { message?: string })?.message || 'Could not change the fringe.', 'error'); }
  };

  const addPerDiemLine = async (e: React.FormEvent) => {
    e.preventDefault();
    const [days, rate, people] = [Number(pdDays), Number(pdRate), Number(pdPeople)];
    if (!pdName.trim() || ![days, rate, people].every((x) => Number.isFinite(x) && x >= 0) || busy) return;
    setBusy(true);
    try { await addPerDiem(projectId, userId, pdName, days, rate, people); setPdName(''); setPdDays(''); setPdRate(''); setPdPeople('1'); changed(); }
    catch (err) { toast((err as { message?: string })?.message || 'Could not add the per diem.', 'error'); }
    finally { setBusy(false); }
  };

  const startFrom = async (t: BudgetTemplate) => {
    if (starting) return;
    setStarting(t.id);
    try { const n = await applyBudgetTemplate(projectId, userId, t); toast(`Started the budget from ${t.name}: ${n} lines added`, 'success'); changed(); }
    catch (err) { toast((err as { message?: string })?.message || 'Could not start the budget from this template.', 'error'); }
    finally { setStarting(null); }
  };

  const setAbove = async (line: BudgetItem, above: boolean) => {
    try { await setBudgetAboveTheLine(line.id, above); changed(); }
    catch (err) { toast((err as { message?: string })?.message || 'Could not move the line.', 'error'); }
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
      {empty && templates && templates.length > 0 && (
        <div className={s.stack} style={{ gap: 8 }} role="group" aria-label="Start from a template">
          <div className={s.hint}>Start from a template. You can change every line afterwards.</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
            {templates.map((t) => (
              <button key={t.id} type="button" className={s.panel} disabled={starting !== null} onClick={() => void startFrom(t)}
                aria-label={`Start from ${t.name}, ${money(templateTotal(t))}`}
                style={{ textAlign: 'left', padding: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4, color: 'inherit' }}>
                <span style={{ fontWeight: 600 }}>{t.name}</span>
                <span style={{ fontFamily: 'var(--display)', fontSize: '1.2rem' }}>{money(templateTotal(t))}</span>
                <span className={s.hint} style={{ margin: 0 }}>{t.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {lines.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {lines.map((line) => {
            const isPosted = posted.has(line.id);
            return (
              <li key={line.id} className={s.panel} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', flexWrap: 'wrap' }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {line.category}
                  {line.kind === 'per_diem' && <span className={s.hint} style={{ margin: '0 0 0 6px' }}>{Number(line.pd_days)} days × {money(Number(line.pd_rate))} × {Number(line.pd_people)} {Number(line.pd_people) === 1 ? 'person' : 'people'}</span>}
                </span>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>
                  <input type="checkbox" checked={line.above_the_line} onChange={(e) => void setAbove(line, e.target.checked)} aria-label={`${line.category} is above the line`} />
                  Above the line
                </label>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--fg-muted)' }}
                  title={Number(line.fringe_amount) ? `${money(Number(line.amount) || 0)} + ${money(Number(line.fringe_amount))} fringe` : undefined}>{money(lineCost(line))}</span>
                <button type="button" className={s.iconBtn} disabled={isPosted || posting === line.id} onClick={() => void postJob(line)}
                  aria-label={isPosted ? `${line.category} is already on the Jobs board` : `Post ${line.category} as a job`} title={isPosted ? 'Already posted to Jobs' : 'Post this line as an open Jobs listing'}>
                  <Briefcase size={14} aria-hidden />
                </button>
                <button type="button" className={s.iconBtn} onClick={() => void remove(line)} aria-label={`Delete ${line.category}`} title="Delete this line">
                  <Trash2 size={14} aria-hidden />
                </button>
                {fringes.length > 0 && (
                  <div role="group" aria-label={`Fringes on ${line.category}`} style={{ flexBasis: '100%', display: 'flex', flexWrap: 'wrap', gap: '2px 12px' }}>
                    {fringes.map((f) => (
                      <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>
                        <input type="checkbox" checked={applied.has(`${line.id}:${f.id}`)} onChange={(e) => void toggleFringe(line, f, e.target.checked)} aria-label={`Apply ${f.name} to ${line.category}`} />
                        {f.name} {Number(f.percent)}%
                      </label>
                    ))}
                    {Number(line.fringe_amount) > 0 && <span className={s.hint} style={{ margin: 0, fontSize: 11 }}>{money(Number(line.amount) || 0)} + {money(Number(line.fringe_amount))} fringe</span>}
                  </div>
                )}
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
      <form onSubmit={addPerDiemLine} className={s.row} style={{ gap: 8, flexWrap: 'wrap' }} aria-label="Add a per diem">
        <label className="sr-only" htmlFor="budget-pd-name">Per diem name</label>
        <input id="budget-pd-name" className={s.input} style={{ flex: '1 1 160px' }} placeholder="Per diem or allowance" value={pdName} onChange={(e) => setPdName(e.target.value)} />
        <label className="sr-only" htmlFor="budget-pd-days">Days</label>
        <input id="budget-pd-days" className={s.input} style={{ width: 80 }} type="number" min="0" step="any" placeholder="Days" value={pdDays} onChange={(e) => setPdDays(e.target.value)} />
        <label className="sr-only" htmlFor="budget-pd-rate">Daily rate</label>
        <input id="budget-pd-rate" className={s.input} style={{ width: 100 }} type="number" min="0" step="any" placeholder="Daily rate $" value={pdRate} onChange={(e) => setPdRate(e.target.value)} />
        <label className="sr-only" htmlFor="budget-pd-people">People</label>
        <input id="budget-pd-people" className={s.input} style={{ width: 80 }} type="number" min="0" step="any" placeholder="People" value={pdPeople} onChange={(e) => setPdPeople(e.target.value)} />
        <span className={s.hint} style={{ margin: 0 }} aria-live="polite">{pdDays && pdRate ? `= ${money(perDiemAmount(pdDays, pdRate, pdPeople))}` : ''}</span>
        <button type="submit" className={s.btn} disabled={!pdName.trim() || pdDays === '' || pdRate === '' || busy}><Plus size={12} aria-hidden /> Add per diem</button>
      </form>
      <div className={s.stack} style={{ gap: 6 }} role="group" aria-label="Fringes">
        <div className={s.hint}>Fringes: named rates you apply to lines (payroll tax, pension, vacation, a union rate). A cap limits one fringe on one line. Nothing is preset: type your own.</div>
        {fringes.length > 0 && (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {fringes.map((f) => (
              <li key={f.id} className={s.panel} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', fontSize: 12 }}>
                <span>{f.name} {Number(f.percent)}%{f.cap_per_line != null ? `, cap ${money(Number(f.cap_per_line))} a line` : ''}</span>
                <button type="button" className={s.iconBtn} onClick={() => void removeFringe(f)} aria-label={`Delete the fringe ${f.name}`} title="Delete this fringe"><Trash2 size={12} aria-hidden /></button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={addFringeRate} className={s.row} style={{ gap: 8, flexWrap: 'wrap' }} aria-label="Add a fringe">
          <label className="sr-only" htmlFor="budget-fringe-name">Fringe name</label>
          <input id="budget-fringe-name" className={s.input} style={{ flex: '1 1 160px' }} placeholder="Fringe name" value={fName} onChange={(e) => setFName(e.target.value)} />
          <label className="sr-only" htmlFor="budget-fringe-percent">Fringe percent</label>
          <input id="budget-fringe-percent" className={s.input} style={{ width: 100 }} type="number" min="0" max="100" step="any" placeholder="Percent %" value={fPercent} onChange={(e) => setFPercent(e.target.value)} />
          <label className="sr-only" htmlFor="budget-fringe-cap">Cap per line</label>
          <input id="budget-fringe-cap" className={s.input} style={{ width: 120 }} type="number" min="0" step="any" placeholder="Cap per line $ (optional)" value={fCap} onChange={(e) => setFCap(e.target.value)} />
          <button type="submit" className={s.btn} disabled={!fName.trim() || fPercent === '' || busy}><Plus size={12} aria-hidden /> Add fringe</button>
        </form>
      </div>
      <button type="button" className={s.btn} onClick={() => void syncFromBreakdown()} disabled={busy}>Update from the breakdown</button>
      <p className={s.hint} style={{ margin: 0 }}>
        {note ?? 'Writes one “Breakdown · …” line per category from the cost of its elements.'}{' '}
        <Link href="/studio?tab=production&view=breakdown" style={{ textDecoration: 'underline' }}>Open the breakdown</Link>
      </p>
    </section>
  );
}
