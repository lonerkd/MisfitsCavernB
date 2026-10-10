'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, DollarSign, PenLine, Plus, Printer, Settings2, Tags, Trash2 } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { useConfirm } from '@/components/ui/Confirm';
import { useToast } from '@/components/ui/Toast';
import { ElementCard, STATUS_LABEL, money } from '@/components/breakdown/ElementCard';
import { catStyle } from '@/components/breakdown/CategoryChips';
import { breakdown, costByCategory, useBreakdown, ELEMENT_STATUSES, type BreakdownCategory, type BreakdownElement, type BreakdownState, type ElementStatus } from '@/lib/breakdown';
import { useProject } from '@/lib/os';
import { announceProgressChange } from '@/lib/supabase/progress';
import { eighthsOf } from '@/lib/studio/shoot-days';
import { castOf, pages, stripKind, STRIP_LABEL } from '@/lib/studio/stripboard';
import type { SceneRow } from '@/lib/studio';
import { useStudio } from '../StudioContext';
import { Modal, cx } from '../ui';
import s from '../studio.module.css';
import v from './breakdownView.module.css';

const esc = (x: unknown) => String(x ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

/**
 * The production's breakdown: every element by category (with its cost and
 * who's on it) or scene by scene as breakdown sheets. Tagging happens in the
 * script; this is where the team sources, prices and prints it, and where
 * the categories and their unit costs are set.
 */
import { BriefHints } from '@/components/brief/BriefHints';

export function BreakdownView({ crew }: { crew: Array<{ user_id: string; username: string }> }) {
  const { project, scenes, scriptId, isOwner } = useStudio();
  const { refreshProject } = useProject();
  const { toast } = useToast();
  const bd = useBreakdown(project.id);
  const [mode, setMode] = useState<'category' | 'scene'>('category');
  const [status, setStatus] = useState<ElementStatus | 'all'>('all');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [pushing, setPushing] = useState(false);

  const categories = bd.categories.rows;
  const elements = bd.elements.rows;
  const costs = useMemo(() => costByCategory(categories, elements), [categories, elements]);
  const total = costs.reduce((n, c) => n + c.amount, 0);
  const unpriced = costs.reduce((n, c) => n + c.unpriced, 0);
  const ready = elements.filter((e) => e.status === 'ready').length;

  const sceneById = useMemo(() => new Map(scenes.rows.map((sc) => [sc.id, sc])), [scenes.rows]);
  const scenesOf = useMemo(() => {
    const m = new Map<string, SceneRow[]>();
    for (const t of bd.tags.rows) {
      const sc = sceneById.get(t.scene_id);
      if (sc) m.set(t.element_id, [...(m.get(t.element_id) ?? []), sc]);
    }
    m.forEach((list) => list.sort((a, b) => a.scene_number - b.scene_number));
    return m;
  }, [bd.tags.rows, sceneById]);

  const visible = (e: BreakdownElement) => (status === 'all' || e.status === status) && (!q.trim() || e.name.toLowerCase().includes(q.trim().toLowerCase()));
  const open = openId ? bd.elementById.get(openId) ?? null : null;

  const pushToBudget = async () => {
    setPushing(true);
    try {
      const r = await breakdown.syncBudget(project.id, costs.map((c) => ({ label: c.category.label, amount: c.amount })));
      await refreshProject(project.id);
      announceProgressChange(project.id);
      const changed = r.added + r.updated + r.removed;
      const n = costs.filter((c) => c.amount > 0).length;
      toast(changed ? `Budget updated from the breakdown — ${money(total)} across ${n} categor${n === 1 ? 'y' : 'ies'}.` : 'The budget already matches the breakdown.', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not update the budget', 'error');
    } finally {
      setPushing(false);
    }
  };

  const printSheets = () => {
    const w = window.open('', '_blank', 'width=860,height=1100');
    if (!w) { toast('Allow pop-ups to print breakdown sheets.', 'info'); return; }
    const ordered = [...categories].sort((a, b) => a.position - b.position);
    const sheet = (sc: SceneRow) => {
      const ids = new Set(bd.tags.rows.filter((t) => t.scene_id === sc.id).map((t) => t.element_id));
      const boxes = ordered.map((c) => {
        const names = elements.filter((e) => ids.has(e.id) && e.category_id === c.id).map((e) => esc(e.name));
        if (c.key === 'cast') names.unshift(...castOf(sc).map(esc));
        return names.length ? `<div class="box" style="border-color:${c.color}"><div class="lbl" style="color:${c.color}">${esc(c.label)}</div>${names.join('<br>')}</div>` : '';
      }).join('');
      return `<section><header><b>${sc.scene_number}</b> ${esc(sc.heading ?? sc.title)}<span>${STRIP_LABEL[stripKind(sc)]} · ${pages(eighthsOf(sc.est_duration))} pp · Day ${sc.shoot_day ?? 1}</span></header><div class="grid">${boxes || '<i>Nothing tagged</i>'}</div>${sc.note ? `<p class="note">${esc(sc.note)}</p>` : ''}</section>`;
    };
    w.document.write(`<!doctype html><html><head><title>${esc(project.title)} — Breakdown sheets</title><style>body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#111;margin:32px}h1{font-size:20px;letter-spacing:2px}section{page-break-inside:avoid;border:1px solid #ccc;border-radius:8px;padding:14px;margin:0 0 16px}header{font-size:13px;margin-bottom:10px;display:flex;gap:10px;align-items:baseline}header span{margin-left:auto;color:var(--fg-dim);font-size:11px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.box{border:2px solid;border-radius:6px;padding:6px 8px;font-size:12px;line-height:1.5}.lbl{font-size:9px;letter-spacing:1px;text-transform:uppercase;font-weight:700;margin-bottom:3px}.note{font-size:11px;color:var(--fg-dim);margin:10px 0 0}</style></head><body><h1>${esc(project.title).toUpperCase()} — BREAKDOWN</h1>${scenes.rows.map(sheet).join('')}<script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  };

  if (bd.status === 'loading' && !categories.length) {
    return <div className="skeleton" style={{ height: 240, borderRadius: 14 }} role="status" aria-busy="true" aria-label="Loading the breakdown" />;
  }

  return (
    <div>
      <div className={v.top}>
        <div className={v.totals}>
          <div className={v.total}><div className={v.totalValue}>{elements.length}</div><div className={v.totalLabel}>Elements</div></div>
          <div className={v.total}><div className={v.totalValue}>{elements.length ? Math.round((ready / elements.length) * 100) : 0}%</div><div className={v.totalLabel}>Ready</div></div>
          <div className={v.total}><div className={v.totalValue}>{money(total)}</div><div className={v.totalLabel}>Est. cost</div></div>
          {unpriced > 0 && <div className={v.total}><div className={v.totalValue}>{unpriced}</div><div className={v.totalLabel}>Unpriced</div></div>}
        </div>
        <span className={v.spacer} />
        <button type="button" className={cx(s.btn, s.small)} onClick={() => setEditing(true)}><Settings2 size={11} aria-hidden /> Categories & rates</button>
        <button type="button" className={cx(s.btn, s.small)} onClick={pushToBudget} disabled={pushing || !elements.length} title="Write the breakdown’s cost per category into the project budget"><DollarSign size={11} aria-hidden /> {pushing ? 'Updating…' : 'Push to budget'}</button>
        <button type="button" className={cx(s.btn, s.small)} onClick={printSheets} disabled={!scenes.rows.length}><Printer size={11} aria-hidden /> Breakdown sheets</button>
      </div>

      <BriefHints projectId={project.id} projectTitle={project.title} accent={project.accent_color} ids={['breakdown']} style={{ marginBottom: 16 }} />

      {elements.length === 0 ? (
        <EmptyState
          icon={<Tags size={26} />}
          title="Nothing broken down yet"
          subtitle="Tag props, wardrobe, effects and everything the shoot needs right in the script — select words in tag mode (Ctrl+Shift+B). They land here, ready to source and price."
          action={scriptId ? <Link href={`/editor?script=${scriptId}`} className={s.btnPrimary}><PenLine size={12} /> Break down the script</Link> : undefined}
        />
      ) : (
        <>
          <div className={v.filters}>
            <div className={s.chips} role="tablist" aria-label="Group by">
              <button type="button" role="tab" aria-selected={mode === 'category'} className={cx(s.chip, mode === 'category' && s.chipOn)} onClick={() => setMode('category')}>By category</button>
              <button type="button" role="tab" aria-selected={mode === 'scene'} className={cx(s.chip, mode === 'scene' && s.chipOn)} onClick={() => setMode('scene')}>By scene</button>
            </div>
            <div className={s.chips} role="group" aria-label="Status">
              {(['all', ...ELEMENT_STATUSES] as const).map((st) => (
                <button key={st} type="button" aria-pressed={status === st} className={cx(s.chip, status === st && s.chipOn)} onClick={() => setStatus(st)}>
                  {st !== 'all' && <span className={cx(v.status, v[`status_${st}`])} aria-hidden />}
                  {st === 'all' ? 'All' : STATUS_LABEL[st]}
                  <span className={s.count}>{st === 'all' ? elements.length : elements.filter((e) => e.status === st).length}</span>
                </button>
              ))}
            </div>
            <label className="sr-only" htmlFor="bd-search">Find an element</label>
            <input id="bd-search" className={cx(s.input, v.search)} placeholder="Find an element…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>

          <div className={cx(v.layout, open && v.layoutOpen)}>
            {mode === 'category' ? (
              <div className={v.cats}>
                {[...categories].sort((a, b) => a.position - b.position).map((c) => {
                  const mine = elements.filter((e) => e.category_id === c.id);
                  const shown = mine.filter(visible);
                  if (!mine.length || !shown.length) return null;
                  const cost = costs.find((x) => x.category.id === c.id);
                  return (
                    <section key={c.id} className={v.cat} style={catStyle(c.color)} aria-labelledby={`cat-${c.id}`}>
                      <div className={v.catHead}>
                        <span className={v.dot} aria-hidden />
                        <h3 id={`cat-${c.id}`} className={v.catName}>{c.label}</h3>
                        <span className={v.catMeta}>{mine.length} · {money(cost?.amount ?? 0)}</span>
                      </div>
                      <ul className={v.rows}>
                        {shown.map((e) => {
                          const where = scenesOf.get(e.id) ?? [];
                          const owner = crew.find((m) => m.user_id === e.assigned_to)?.username;
                          return (
                            <li key={e.id}>
                              <button type="button" className={cx(v.row, openId === e.id && v.rowOn)} aria-expanded={openId === e.id} onClick={() => setOpenId(openId === e.id ? null : e.id)}>
                                <span className={cx(v.status, v[`status_${e.status}`])} aria-hidden />
                                <span style={{ minWidth: 0 }}>
                                  <span className={v.rowName} style={{ display: 'block' }}>{e.name}<span className="sr-only">, {STATUS_LABEL[e.status]}</span></span>
                                  <span className={v.rowSub} style={{ display: 'block' }}>
                                    {where.length ? `Sc ${where.map((x) => x.scene_number).join(' · ')}` : 'Not in this script'}{owner ? ` · ${owner}` : ''}
                                  </span>
                                </span>
                                <span className={v.rowCost}>{e.cost != null ? money(e.cost) : c.unit_cost ? `${money(c.unit_cost)}*` : '—'}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  );
                })}
              </div>
            ) : (
              <div className={v.sheets}>
                {scenes.rows.map((sc) => {
                  const ids = new Set(bd.tags.rows.filter((t) => t.scene_id === sc.id).map((t) => t.element_id));
                  const cast = castOf(sc);
                  const castCat = categories.find((c) => c.key === 'cast');
                  const boxes = [...categories].sort((a, b) => a.position - b.position)
                    .map((c) => ({ c, items: elements.filter((e) => ids.has(e.id) && e.category_id === c.id && visible(e)) }))
                    .filter((x) => x.items.length || (x.c.id === castCat?.id && cast.length));
                  return (
                    <section key={sc.id} className={v.sheet} aria-label={`Scene ${sc.scene_number}`}>
                      <div className={v.sheetHead}>
                        <span className={v.sheetNum}>{sc.scene_number}</span>
                        <span className={v.sheetHeading}>{sc.heading ?? sc.title}</span>
                        <span className={v.sheetMeta}>{STRIP_LABEL[stripKind(sc)]} · {pages(eighthsOf(sc.est_duration))} pp · Day {sc.shoot_day ?? 1}</span>
                      </div>
                      {boxes.length === 0 ? <p className={v.empty}>Nothing tagged in this scene.</p> : (
                        <div className={v.boxes}>
                          {boxes.map(({ c, items }) => (
                            <div key={c.id} className={v.box} style={catStyle(c.color)}>
                              <div className={v.boxLabel}>{c.label}</div>
                              <div className={v.boxItems}>
                                {c.id === castCat?.id && cast.map((name) => <span key={name} className={v.boxItem} style={{ cursor: 'default' }}>{name}</span>)}
                                {items.map((e) => <button key={e.id} type="button" className={v.boxItem} onClick={() => setOpenId(e.id)}>{e.name}</button>)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            )}

            {open && (
              <div className={v.drawer}>
                <ElementCard
                  key={open.id}
                  element={open}
                  state={bd}
                  crew={crew}
                  scenes={(scenesOf.get(open.id) ?? []).map((sc) => ({ key: sc.id, label: String(sc.scene_number) }))}
                  scenesLabel={`In ${(scenesOf.get(open.id) ?? []).length} scene${(scenesOf.get(open.id) ?? []).length === 1 ? '' : 's'}`}
                  onClose={() => setOpenId(null)}
                />
              </div>
            )}
          </div>
        </>
      )}

      {editing && <CategoryEditor bd={bd} projectId={project.id} isOwner={isOwner} onClose={() => setEditing(false)} />}
    </div>
  );
}

/** The project's categories: names, colours, unit costs and order — data, not code. */
function CategoryEditor({ bd, projectId, isOwner, onClose }: { bd: BreakdownState; projectId: string; isOwner: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [label, setLabel] = useState('');
  const [color, setColor] = useState('#7c8dff');
  const cats = [...bd.categories.rows].sort((a, b) => a.position - b.position);
  const countOf = (id: string) => bd.elements.rows.filter((e) => e.category_id === id).length;

  const save = async (c: BreakdownCategory, patch: Partial<Pick<BreakdownCategory, 'label' | 'color' | 'position' | 'unit_cost'>>) => {
    bd.categories.upsertLocal({ ...c, ...patch });
    try {
      bd.categories.upsertLocal(await breakdown.updateCategory(c.id, patch));
    } catch (e) {
      bd.categories.upsertLocal(c);
      toast(e instanceof Error ? e.message : 'Could not save the category', 'error');
    }
  };

  const move = async (i: number, dir: -1 | 1) => {
    const a = cats[i];
    const b = cats[i + dir];
    if (!a || !b) return;
    await Promise.all([save(a, { position: b.position }), save(b, { position: a.position })]);
  };

  const add = async () => {
    const name = label.trim();
    if (!name) return;
    try {
      const row = await breakdown.addCategory(projectId, name, color, new Set(cats.map((c) => c.key)), (cats[cats.length - 1]?.position ?? -1) + 1);
      bd.categories.upsertLocal(row);
      setLabel('');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not add the category', 'error');
    }
  };

  const remove = async (c: BreakdownCategory) => {
    const n = countOf(c.id);
    if (!await confirm({ title: `Delete “${c.label}”?`, message: n ? `Its ${n} element${n === 1 ? '' : 's'} come out of the breakdown too, off every scene. The script text is not changed.` : 'It has no elements.', confirmLabel: 'Delete category' })) return;
    try {
      await breakdown.deleteCategory(c.id);
      bd.categories.removeLocal(c.id);
      await bd.elements.reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not delete the category', 'error');
    }
  };

  return (
    <Modal title="Categories & rates" onClose={onClose} actions={<button type="button" className={s.btnPrimary} onClick={onClose}>Done</button>}>
      <p className={s.hint} style={{ marginTop: 0 }}>Rename, recolour and reorder the project’s breakdown categories. A unit cost prices every element in the category that has no cost of its own.</p>
      <div className={v.edRows}>
        {cats.map((c, i) => (
          <div key={c.id} className={v.edRow}>
            <label className="sr-only" htmlFor={`cc-${c.id}`}>{c.label} colour</label>
            <input id={`cc-${c.id}`} type="color" className={v.colorInput} defaultValue={c.color} onBlur={(e) => { if (e.target.value !== c.color) void save(c, { color: e.target.value }); }} />
            <div>
              <label className="sr-only" htmlFor={`cl-${c.id}`}>Name</label>
              <input id={`cl-${c.id}`} className={s.input} defaultValue={c.label} maxLength={60}
                onBlur={(e) => { const x = e.target.value.trim(); if (x && x !== c.label) void save(c, { label: x }); else e.target.value = c.label; }} />
              <div className={v.edCount}>{countOf(c.id)} element{countOf(c.id) === 1 ? '' : 's'}</div>
            </div>
            <div>
              <label className="sr-only" htmlFor={`cu-${c.id}`}>{c.label} unit cost</label>
              <input id={`cu-${c.id}`} className={s.input} inputMode="decimal" defaultValue={c.unit_cost ? String(c.unit_cost) : ''} placeholder="$ each"
                onBlur={(e) => { const n = e.target.value.trim() === '' ? 0 : Number(e.target.value.replace(/[^0-9.]/g, '')); if (Number.isFinite(n) && n !== c.unit_cost) void save(c, { unit_cost: n }); }} />
            </div>
            <div className={v.edActions}>
              <button type="button" className={s.iconBtn} aria-label={`Move ${c.label} up`} disabled={i === 0} onClick={() => void move(i, -1)}><ArrowUp size={12} /></button>
              <button type="button" className={s.iconBtn} aria-label={`Move ${c.label} down`} disabled={i === cats.length - 1} onClick={() => void move(i, 1)}><ArrowDown size={12} /></button>
              {isOwner && <button type="button" className={s.iconBtn} aria-label={`Delete ${c.label}`} onClick={() => void remove(c)}><Trash2 size={12} /></button>}
            </div>
          </div>
        ))}
        <div className={v.edRow} style={{ marginTop: 8 }}>
          <label className="sr-only" htmlFor="cc-new">New category colour</label>
          <input id="cc-new" type="color" className={v.colorInput} value={color} onChange={(e) => setColor(e.target.value)} />
          <div>
            <label className="sr-only" htmlFor="cl-new">New category name</label>
            <input id="cl-new" className={s.input} value={label} maxLength={60} placeholder="New category, e.g. Weapons" onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void add(); }} />
          </div>
          <span />
          <button type="button" className={cx(s.btn, s.small)} onClick={() => void add()} disabled={!label.trim()}><Plus size={11} aria-hidden /> Add</button>
        </div>
      </div>
    </Modal>
  );
}
