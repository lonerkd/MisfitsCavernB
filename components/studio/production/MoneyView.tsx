'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Check, Clock, DollarSign, Plus, Store, Trash2, X } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/Confirm';
import { useCanShape } from '@/lib/brief';
import {
  money, moneySummary, studio, useExpenses, useTimesheets,
  type BudgetItem, type Expense, type Timesheet, type Vendor,
} from '@/lib/studio';
import { useStudio } from '../StudioContext';
import { cx } from '../ui';
import s from '../studio.module.css';

type CrewName = { user_id: string; username: string };

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * The money: each budget line's plan against what's committed (a purchase
 * order is out) and paid, the vendors, and the crew's hours. Paid spend keeps
 * the budget line's actual in step on the project page. The owner and leads
 * see and run all of it; everyone logs their own hours here.
 */
export function MoneyView({ crew }: { crew: CrewName[] }) {
  const { project, isOwner, userId } = useStudio();
  const canShape = useCanShape(project.id, isOwner);
  const expenses = useExpenses(project.id);
  const timesheets = useTimesheets(project.id);
  const [lines, setLines] = useState<BudgetItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    studio.listBudgetLines(project.id).then(setLines).catch(() => setLines([]));
    if (canShape) studio.listVendors(project.id).then(setVendors).catch(() => setVendors([]));
  }, [project.id, canShape]);

  const summary = useMemo(() => moneySummary(lines, expenses.rows, timesheets.rows), [lines, expenses.rows, timesheets.rows]);
  const nameOf = useMemo(() => new Map(crew.map((c) => [c.user_id, c.username])), [crew]);

  return (
    <div className={s.stack} style={{ gap: 28, maxWidth: 1000 }}>
      {canShape && (
        <>
          <section aria-labelledby="money-summary" className={s.stack} style={{ gap: 12 }}>
            <h3 id="money-summary" className={s.panelTitle} style={{ marginBottom: 0 }}><DollarSign size={14} /> Budget vs spend</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
              {([
                ['Planned', summary.totals.planned, undefined],
                ['Committed', summary.totals.committed, 'Purchase orders out, not yet paid'],
                ['Paid', summary.totals.paid, summary.labour.paid ? `Includes ${money(summary.labour.paid)} of approved labour` : undefined],
                ['Left', summary.totals.left, undefined],
              ] as Array<[string, number, string | undefined]>).map(([label, v, hint]) => (
                <div key={label} className={s.panel} style={{ padding: 12 }} title={hint}>
                  <div className={s.hint}>{label}</div>
                  <div style={{ fontFamily: 'var(--display)', fontSize: '1.5rem', letterSpacing: 1, color: label === 'Left' && v < 0 ? 'var(--danger)' : undefined }}>{money(v)}</div>
                </div>
              ))}
            </div>
            {lines.length === 0 ? (
              <p className={s.hint}>No budget lines yet — set the budget on the project page (or estimate it from the script), then track spend against it here.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <caption className="sr-only">Each budget line: planned, committed, paid, left</caption>
                <thead>
                  <tr className={s.hint} style={{ textAlign: 'left' }}>
                    <th scope="col" style={{ padding: 6, fontWeight: 400 }}>Line</th>
                    {['Planned', 'Committed', 'Paid', 'Left'].map((h) => <th key={h} scope="col" style={{ padding: 6, fontWeight: 400, textAlign: 'right' }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {summary.lines.map((l) => (
                    <tr key={l.id} style={{ borderTop: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
                      <td style={{ padding: 6 }}>{l.label}</td>
                      <td style={{ padding: 6, textAlign: 'right' }}>{money(l.planned)}</td>
                      <td style={{ padding: 6, textAlign: 'right' }}>{l.committed ? money(l.committed) : '—'}</td>
                      <td style={{ padding: 6, textAlign: 'right' }}>{l.paid ? money(l.paid) : '—'}</td>
                      <td style={{ padding: 6, textAlign: 'right', color: l.left < 0 ? 'var(--danger)' : undefined }}>{l.left < 0 ? `${money(-l.left)} over` : money(l.left)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <SpendSection lines={lines} vendors={vendors} rows={expenses.rows}
            onChange={(row, removedId) => { if (row) expenses.upsertLocal(row); else if (removedId) expenses.removeLocal(removedId); }}
            onVendor={(v) => setVendors((prev) => [...prev, v].sort((a, b) => a.name.localeCompare(b.name)))} />
        </>
      )}

      <HoursSection rows={timesheets.rows} canShape={canShape} userId={userId} nameOf={nameOf}
        onChange={(row, removedId) => { if (row) timesheets.upsertLocal(row); else if (removedId) timesheets.removeLocal(removedId); }}
        onError={(m) => toast(m, 'error')} />
    </div>
  );
}

function SpendSection({ lines, vendors, rows, onChange, onVendor }: {
  lines: BudgetItem[]; vendors: Vendor[]; rows: Expense[];
  onChange: (row: Expense | null, removedId?: string) => void; onVendor: (v: Vendor) => void;
}) {
  const { project } = useStudio();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [form, setForm] = useState({ description: '', amount: '', line: '', vendor: '', newVendor: '', status: 'committed', po: '', date: today() });
  const [busy, setBusy] = useState(false);
  const lineName = new Map(lines.map((l) => [l.id, l.description ? `${l.category} — ${l.description}` : l.category]));
  const vendorName = new Map(vendors.map((v) => [v.id, v.name]));

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!form.description.trim() || !Number.isFinite(amount) || amount < 0) return;
    setBusy(true);
    try {
      let vendorId = form.vendor || null;
      if (form.vendor === '__new' && form.newVendor.trim()) {
        const v = await studio.addVendor(project.id, { name: form.newVendor });
        onVendor(v);
        vendorId = v.id;
      } else if (form.vendor === '__new') vendorId = null;
      onChange(await studio.addExpense(project.id, {
        description: form.description.trim(), amount, budget_item_id: form.line || null, vendor_id: vendorId,
        status: form.status, po_number: form.po.trim() || null, spent_on: form.date,
      }));
      setForm((f) => ({ ...f, description: '', amount: '', po: '', newVendor: '', vendor: vendorId ?? '' }));
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not add the spend', 'error');
    } finally {
      setBusy(false);
    }
  };

  const markPaid = async (x: Expense) => {
    try { onChange(await studio.updateExpense(x.id, { status: 'paid' })); }
    catch (err) { toast(err instanceof Error ? err.message : 'Could not update', 'error'); }
  };
  const remove = async (x: Expense) => {
    if (!(await confirm(`Remove “${x.description}” (${money(Number(x.amount))})?`))) return;
    try { await studio.deleteExpense(x.id); onChange(null, x.id); }
    catch (err) { toast(err instanceof Error ? err.message : 'Could not remove it', 'error'); }
  };

  return (
    <section aria-labelledby="money-spend" className={s.stack} style={{ gap: 12 }}>
      <h3 id="money-spend" className={s.panelTitle} style={{ marginBottom: 0 }}><Store size={14} /> Spend <span className={s.hint}>· purchase orders and payments</span></h3>
      <form onSubmit={add} className={s.panel} style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, alignItems: 'end' }}>
        <label className={s.stack} style={{ gap: 4, gridColumn: 'span 2' }}><span className={s.hint}>What for</span>
          <input className={s.input} value={form.description} maxLength={300} required onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Lens package, 3 days" /></label>
        <label className={s.stack} style={{ gap: 4 }}><span className={s.hint}>Amount ($)</span>
          <input className={s.input} type="number" min={0} step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
        <label className={s.stack} style={{ gap: 4 }}><span className={s.hint}>Budget line</span>
          <select className={s.select} value={form.line} onChange={(e) => setForm({ ...form, line: e.target.value })}>
            <option value="">Not charged to a line</option>
            {lines.map((l) => <option key={l.id} value={l.id}>{lineName.get(l.id)}</option>)}
          </select></label>
        <label className={s.stack} style={{ gap: 4 }}><span className={s.hint}>Vendor</span>
          <select className={s.select} value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })}>
            <option value="">No vendor</option>
            {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            <option value="__new">+ New vendor…</option>
          </select></label>
        {form.vendor === '__new' && (
          <label className={s.stack} style={{ gap: 4 }}><span className={s.hint}>New vendor name</span>
            <input className={s.input} value={form.newVendor} maxLength={200} onChange={(e) => setForm({ ...form, newVendor: e.target.value })} /></label>
        )}
        <label className={s.stack} style={{ gap: 4 }}><span className={s.hint}>Status</span>
          <select className={s.select} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="committed">Committed (PO out)</option>
            <option value="paid">Paid</option>
          </select></label>
        <label className={s.stack} style={{ gap: 4 }}><span className={s.hint}>PO number</span>
          <input className={s.input} value={form.po} maxLength={40} onChange={(e) => setForm({ ...form, po: e.target.value })} /></label>
        <label className={s.stack} style={{ gap: 4 }}><span className={s.hint}>Date</span>
          <input className={s.input} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
        <button type="submit" className={s.btnPrimary} disabled={busy || !form.description.trim() || form.amount === ''}><Plus size={12} /> Add spend</button>
      </form>
      {rows.length === 0 ? (
        <p className={s.hint}>Nothing spent yet. Add a purchase order when you commit to a rental or a location, and mark it paid when the money goes out.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rows.map((x) => (
            <li key={x.id} className={s.panel} style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ flex: '1 1 220px', minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13 }}>{x.description}</span>
                <span className={s.hint}>
                  {[x.spent_on, x.vendor_id ? vendorName.get(x.vendor_id) : null, x.budget_item_id ? lineName.get(x.budget_item_id) : 'no line', x.po_number].filter(Boolean).join(' · ')}
                </span>
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>{money(Number(x.amount))}</span>
              <span className={s.hint} style={{ color: x.status === 'paid' ? '#6ee7b7' : undefined }}>{x.status === 'paid' ? 'Paid' : 'Committed'}</span>
              {x.status !== 'paid' && <button type="button" className={cx(s.btn, s.small)} onClick={() => void markPaid(x)}><Check size={11} /> Mark paid</button>}
              <button type="button" className={cx(s.btnGhost, s.small)} aria-label={`Remove ${x.description}`} onClick={() => void remove(x)}><Trash2 size={11} /></button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function HoursSection({ rows, canShape, userId, nameOf, onChange, onError }: {
  rows: Timesheet[]; canShape: boolean; userId: string; nameOf: Map<string, string>;
  onChange: (row: Timesheet | null, removedId?: string) => void; onError: (m: string) => void;
}) {
  const { project } = useStudio();
  const [date, setDate] = useState(today());
  const [hours, setHours] = useState('');
  const [note, setNote] = useState('');
  const [rates, setRates] = useState<Record<string, string>>({});

  const log = async (e: React.FormEvent) => {
    e.preventDefault();
    const h = Number(hours);
    if (!(h > 0 && h <= 24)) return;
    try { onChange(await studio.logHours(project.id, date, h, note)); setHours(''); setNote(''); }
    catch (err) { onError(err instanceof Error ? err.message : 'Could not log the hours'); }
  };
  const decide = async (t: Timesheet, status: 'approved' | 'rejected') => {
    const raw = rates[t.id] ?? (t.rate != null ? String(t.rate) : '');
    const rate = raw.trim() === '' ? null : Number(raw);
    try { onChange(await studio.decideTimesheet(t.id, status, status === 'approved' && rate != null && Number.isFinite(rate) ? rate : undefined)); }
    catch (err) { onError(err instanceof Error ? err.message : 'Could not update'); }
  };
  const remove = async (t: Timesheet) => {
    try { await studio.deleteTimesheet(t.id); onChange(null, t.id); }
    catch (err) { onError(err instanceof Error ? err.message : 'Could not remove it'); }
  };

  const pending = rows.filter((t) => t.status === 'submitted');

  return (
    <section aria-labelledby="money-hours" className={s.stack} style={{ gap: 12 }}>
      <h3 id="money-hours" className={s.panelTitle} style={{ marginBottom: 0 }}>
        <Clock size={14} /> {canShape ? 'Timesheets' : 'Your hours'}
        {canShape && pending.length > 0 && <span className={s.hint}>· {pending.length} to approve</span>}
      </h3>
      <form onSubmit={log} className={s.row} style={{ gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
        <label className={s.stack} style={{ gap: 4 }}><span className={s.hint}>Day</span>
          <input className={s.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label className={s.stack} style={{ gap: 4 }}><span className={s.hint}>Hours</span>
          <input className={s.input} type="number" min={0.25} max={24} step={0.25} value={hours} onChange={(e) => setHours(e.target.value)} style={{ width: 90 }} /></label>
        <label className={s.stack} style={{ gap: 4, flex: '1 1 200px' }}><span className={s.hint}>Note (optional)</span>
          <input className={s.input} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="Prep day, wrap-out…" /></label>
        <button type="submit" className={s.btnPrimary} disabled={!(Number(hours) > 0)}><Plus size={12} /> Log my hours</button>
      </form>
      {rows.length === 0 ? (
        <p className={s.hint}>{canShape ? 'No hours logged yet. The crew log theirs here; you approve them and set the rate.' : 'No hours logged yet. Log each day you work; the owner approves them.'}</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rows.map((t) => {
            const who = t.user_id === userId ? 'You' : (t.user_id ? nameOf.get(t.user_id) ?? 'Crew' : 'Deleted account');
            return (
              <li key={t.id} className={s.panel} style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ flex: '1 1 200px' }}>
                  <span style={{ fontSize: 13 }}>{who} · {t.work_date} · {Number(t.hours)}h</span>
                  {t.note && <span className={s.hint} style={{ display: 'block' }}>{t.note}</span>}
                </span>
                <span className={s.hint} style={{ color: t.status === 'approved' ? '#6ee7b7' : t.status === 'rejected' ? 'var(--danger)' : undefined }}>
                  {t.status === 'approved' ? `Approved${t.rate != null ? ` · ${money(Number(t.rate))}/h = ${money(Number(t.rate) * Number(t.hours))}` : ' · no rate'}` : t.status === 'rejected' ? 'Rejected' : 'Waiting for approval'}
                </span>
                {canShape && t.status === 'submitted' && (
                  <>
                    <input className={s.input} type="number" min={0} step="0.01" placeholder="Rate $/h" aria-label={`Hourly rate for ${who} on ${t.work_date}`}
                      value={rates[t.id] ?? (t.rate != null ? String(t.rate) : '')} onChange={(e) => setRates((r) => ({ ...r, [t.id]: e.target.value }))} style={{ width: 100 }} />
                    <button type="button" className={cx(s.btn, s.small)} onClick={() => void decide(t, 'approved')}><Check size={11} /> Approve</button>
                    <button type="button" className={cx(s.btnGhost, s.small)} onClick={() => void decide(t, 'rejected')}><X size={11} /> Reject</button>
                  </>
                )}
                {(canShape || (t.user_id === userId && t.status === 'submitted')) && (
                  <button type="button" className={cx(s.btnGhost, s.small)} aria-label={`Remove ${who}’s hours on ${t.work_date}`} onClick={() => void remove(t)}><Trash2 size={11} /></button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
