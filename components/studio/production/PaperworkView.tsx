'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileCheck2, FileUp, Lightbulb, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/Confirm';
import { useCanShape } from '@/lib/brief';
import {
  DOC_KINDS, STATUS_LABEL, docState, paperworkGaps, studio, useCastings, useDocuments, useProjectLocations,
  type DocKind, type DocStatus, type ProjectDocument, type Vendor,
} from '@/lib/studio';
import { useStudio } from '../StudioContext';
import { cx } from '../ui';
import s from '../studio.module.css';

type CrewRow = { user_id: string; username: string; craft: string | null };

const TONE: Record<string, string | undefined> = { done: '#6ee7b7', open: undefined, warn: '#fbbf24', bad: '#fca5a5' };

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * The production's paperwork — permits, insurance, releases, contracts —
 * each with where it stands, who or what it's with, when it expires, and the
 * file (kept out of the library, private). "Still needed" reads the
 * production itself: a permit for each location that needs one, a release for
 * everyone cast, a deal memo for the crew, insurance. The crew see only their
 * own paperwork here.
 */
export function PaperworkView({ crew }: { crew: CrewRow[] }) {
  const { project, isOwner, userId } = useStudio();
  const canShape = useCanShape(project.id, isOwner);
  const docs = useDocuments(project.id);
  const locations = useProjectLocations(project.id);
  const castings = useCastings(project.id);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [adding, setAdding] = useState<{ kind: DocKind; title: string } | null>(null);
  const { toast } = useToast();
  const today = localToday();

  useEffect(() => { if (canShape) studio.listVendors(project.id).then(setVendors).catch(() => setVendors([])); }, [project.id, canShape]);

  const gaps = useMemo(() => (canShape ? paperworkGaps({
    docs: docs.rows,
    locations: locations.rows.map((l) => ({ id: l.id, name: l.name, permit: l.permit })),
    castings: castings.rows,
    crew,
  }) : []), [canShape, docs.rows, locations.rows, castings.rows, crew]);

  const add = async (fields: Parameters<typeof studio.addDocument>[1]) => {
    try { docs.upsertLocal(await studio.addDocument(project.id, fields)); setAdding(null); }
    catch (e) { toast(e instanceof Error ? e.message : 'Could not add the document', 'error'); }
  };

  const byKind = DOC_KINDS.map((k) => ({ ...k, rows: docs.rows.filter((d) => d.kind === k.id) })).filter((g) => g.rows.length);
  const soon = docs.rows.filter((d) => { const t = docState(d, today).tone; return t === 'bad' || (t === 'warn' && d.expires_on); });

  return (
    <div className={s.stack} style={{ gap: 24, maxWidth: 960 }}>
      <div className={s.toolbar}>
        <div className={s.panelTitle} style={{ marginBottom: 0 }}>
          <FileCheck2 size={14} /> {canShape ? 'Paperwork' : 'Your paperwork'}
          <span className={s.hint}>· {docs.rows.filter((d) => d.status === 'done').length} of {docs.rows.length} done{soon.length ? ` · ${soon.length} expiring or expired` : ''}</span>
        </div>
        {canShape && <button type="button" className={cx(s.btn, s.small)} onClick={() => setAdding({ kind: 'other', title: '' })}><Plus size={11} /> Add a document</button>}
      </div>

      {canShape && gaps.length > 0 && (
        <section aria-labelledby="paper-gaps" className={s.panel} style={{ padding: 14 }}>
          <h3 id="paper-gaps" className={s.hint} style={{ margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 2 }}><Lightbulb size={11} aria-hidden /> Still needed</h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {gaps.map((g) => (
              <li key={g.key} className={s.row} style={{ gap: 10, flexWrap: 'wrap' }}>
                <span style={{ flex: '1 1 260px', fontSize: 13 }}>{g.title} <span className={s.hint}>— {g.why}</span></span>
                <button type="button" className={cx(s.btnGhost, s.small)} aria-label={`Add ${g.title}`}
                  onClick={() => void add({ kind: g.kind, title: g.title, person_id: g.person_id ?? null, location_id: g.location_id ?? null })}>
                  <Plus size={11} /> Add
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {adding && (
        <form className={s.panel} style={{ padding: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}
          onSubmit={(e) => { e.preventDefault(); if (adding.title.trim()) void add({ kind: adding.kind, title: adding.title.trim() }); }}>
          <label className={s.stack} style={{ gap: 4 }}><span className={s.hint}>Kind</span>
            <select className={s.select} value={adding.kind} onChange={(e) => setAdding({ ...adding, kind: e.target.value as DocKind })}>
              {DOC_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
            </select></label>
          <label className={s.stack} style={{ gap: 4, flex: '1 1 260px' }}><span className={s.hint}>Title</span>
            <input className={s.input} autoFocus value={adding.title} maxLength={200} onChange={(e) => setAdding({ ...adding, title: e.target.value })} placeholder="Equipment insurance certificate" /></label>
          <button type="submit" className={s.btnPrimary} disabled={!adding.title.trim()}>Add</button>
          <button type="button" className={cx(s.btnGhost, s.small)} onClick={() => setAdding(null)}>Cancel</button>
        </form>
      )}

      {docs.rows.length === 0 ? (
        <p className={s.hint}>{canShape ? 'No paperwork yet. Add what the production needs above, or any document — attach the PDF or a photo when you have it.' : 'Nothing for you here yet. When the production sends you a contract or release, it shows up here.'}</p>
      ) : byKind.map((g) => (
        <section key={g.id} aria-labelledby={`paper-${g.id}`} className={s.stack} style={{ gap: 6 }}>
          <h3 id={`paper-${g.id}`} className={s.hint} style={{ margin: 0, textTransform: 'uppercase', letterSpacing: 2 }}>{g.plural} · {g.rows.length}</h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {g.rows.map((d) => (
              <DocItem key={d.id} doc={d} canShape={canShape} today={today} crew={crew} vendors={vendors}
                locations={locations.rows.map((l) => ({ id: l.id, name: l.name }))} isMine={d.person_id === userId}
                onChange={(row, removedId) => { if (row) docs.upsertLocal(row); else if (removedId) docs.removeLocal(removedId); }} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function DocItem({ doc, canShape, today, crew, vendors, locations, isMine, onChange }: {
  doc: ProjectDocument; canShape: boolean; today: string; crew: CrewRow[]; vendors: Vendor[];
  locations: { id: string; name: string }[]; isMine: boolean;
  onChange: (row: ProjectDocument | null, removedId?: string) => void;
}) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const kind = doc.kind as DocKind;
  const st = docState(doc, today);
  const who = [
    doc.person_id ? (isMine ? 'you' : crew.find((c) => c.user_id === doc.person_id)?.username ?? 'crew member') : null,
    doc.location_id ? locations.find((l) => l.id === doc.location_id)?.name : null,
    doc.vendor_id ? vendors.find((v) => v.id === doc.vendor_id)?.name : null,
    doc.party,
  ].filter(Boolean).join(' · ');

  const save = async (patch: Parameters<typeof studio.updateDocument>[1]) => {
    try { onChange(await studio.updateDocument(doc.id, patch)); }
    catch (e) { toast(e instanceof Error ? e.message : 'Could not save', 'error'); }
  };
  const attach = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try { onChange(await studio.attachDocumentFile(doc, file)); toast('File attached', 'success'); }
    catch (e) { toast(e instanceof Error ? e.message : 'Could not attach the file', 'error'); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  };
  const openFile = async () => {
    if (!doc.storage_path) return;
    try { window.open(await studio.documentUrl(doc.storage_path), '_blank', 'noopener'); }
    catch (e) { toast(e instanceof Error ? e.message : 'Could not open the file', 'error'); }
  };
  const remove = async () => {
    if (!(await confirm(`Remove “${doc.title}”${doc.file_name ? ' and its file' : ''}?`))) return;
    try { await studio.deleteDocument(doc); onChange(null, doc.id); }
    catch (e) { toast(e instanceof Error ? e.message : 'Could not remove it', 'error'); }
  };

  return (
    <li className={s.panel} style={{ padding: 0 }}>
      <div className={s.row} style={{ gap: 10, padding: '10px 12px', flexWrap: 'wrap' }}>
        <span style={{ flex: '1 1 240px', minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 13 }}>{doc.title}</span>
          <span className={s.hint}>{who || 'Not linked to anyone yet'}{doc.expires_on ? ` · until ${doc.expires_on}` : ''}</span>
        </span>
        <span className={s.hint} style={{ color: TONE[st.tone] }}>{st.label}</span>
        {doc.storage_path
          ? <button type="button" className={cx(s.btn, s.small)} onClick={() => void openFile()}>Open {doc.file_name}</button>
          : <span className={s.hint}>No file</span>}
        {canShape && <button type="button" className={cx(s.btnGhost, s.small)} aria-expanded={open} aria-label={open ? `Done editing ${doc.title}` : `Edit ${doc.title}`} onClick={() => setOpen((v) => !v)}>{open ? 'Done' : 'Edit'}</button>}
      </div>
      {canShape && open && (
        <div style={{ padding: '0 12px 12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, alignItems: 'end' }}>
          <div className={s.row} style={{ gap: 6, gridColumn: '1 / -1', flexWrap: 'wrap' }} role="radiogroup" aria-label={`${doc.title} status`}>
            {(['needed', 'pending', 'done'] as DocStatus[]).map((x) => (
              <button key={x} type="button" role="radio" aria-checked={doc.status === x} className={cx(s.chip, doc.status === x && s.chipOn)}
                onClick={() => void save({ status: x })}>{STATUS_LABEL[kind]?.[x] ?? x}</button>
            ))}
          </div>
          <label className={s.stack} style={{ gap: 4 }}><span className={s.hint}>Person (on the crew)</span>
            <select className={s.select} value={doc.person_id ?? ''} onChange={(e) => void save({ person_id: e.target.value || null })}>
              <option value="">—</option>
              {crew.map((c) => <option key={c.user_id} value={c.user_id}>{c.username}{c.craft ? ` (${c.craft})` : ''}</option>)}
            </select></label>
          <label className={s.stack} style={{ gap: 4 }}><span className={s.hint}>Location</span>
            <select className={s.select} value={doc.location_id ?? ''} onChange={(e) => void save({ location_id: e.target.value || null })}>
              <option value="">—</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select></label>
          <label className={s.stack} style={{ gap: 4 }}><span className={s.hint}>Vendor</span>
            <select className={s.select} value={doc.vendor_id ?? ''} onChange={(e) => void save({ vendor_id: e.target.value || null })}>
              <option value="">—</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select></label>
          <label className={s.stack} style={{ gap: 4 }}><span className={s.hint}>Other party</span>
            <input className={s.input} defaultValue={doc.party ?? ''} key={`p:${doc.party}`} maxLength={200}
              onBlur={(e) => { const v = e.target.value.trim() || null; if (v !== doc.party) void save({ party: v }); }} /></label>
          <label className={s.stack} style={{ gap: 4 }}><span className={s.hint}>Expires</span>
            <input className={s.input} type="date" defaultValue={doc.expires_on ?? ''} key={`x:${doc.expires_on}`}
              onBlur={(e) => { const v = e.target.value || null; if (v !== doc.expires_on) void save({ expires_on: v }); }} /></label>
          <div className={s.row} style={{ gap: 8 }}>
            <input ref={fileRef} type="file" accept="application/pdf,image/*" className="sr-only" id={`file-${doc.id}`}
              onChange={(e) => void attach(e.target.files?.[0])} />
            <label htmlFor={`file-${doc.id}`} className={cx(s.btn, s.small)} style={{ cursor: 'pointer' }}>
              <FileUp size={11} /> {busy ? 'Uploading…' : doc.storage_path ? 'Replace file' : 'Attach file'}
            </label>
            <button type="button" className={cx(s.btnGhost, s.small)} aria-label={`Remove ${doc.title}`} onClick={() => void remove()}><Trash2 size={11} /></button>
          </div>
        </div>
      )}
    </li>
  );
}
