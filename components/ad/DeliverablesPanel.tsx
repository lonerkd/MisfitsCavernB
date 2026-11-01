'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useLoad } from '@/lib/hooks/useLoad';
import { useCanShape } from '@/lib/brief';
import { DELIVERABLE_KINDS, isDeliverableKind } from '@/lib/ad/kinds';
import { listBrandRules, listDeliverables, updateDeliverable, type Deliverable } from '@/lib/ad/api';
import { checkBrandRules, type BrandRule, type BrandRuleKind, type BrandRuleSeverity } from '@/lib/ad/brand-rules';
import { copyText, parseCopy } from '@/lib/ad/copy';
import { describePiece, exportFileName, needsPdfFallback, pieceToText, setToText, type ExportPiece } from '@/lib/ad/export';
import { fetchScriptContent } from '@/lib/studio';
import { sendDraftsForReview, listVersions, reviewUrl, STATE_LABEL, versionState } from '@/lib/review/versions';
import { useToast } from '@/components/ui/Toast';
import { useStudio } from '@/components/studio/StudioContext';
import s from '@/components/studio/studio.module.css';

/** Hand a file to the browser's download. */
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function DeliverablesPanel() {
  const { project, isOwner, scripts } = useStudio();
  const { toast } = useToast();
  const canShape = useCanShape(project.id, isOwner);
  const key = `ad-deliverables:${project.id}`;
  const deliverables = useLoad(key, () => listDeliverables(project.id));
  const versions = useLoad(key, () => listVersions(project.id));
  const rules = useLoad(key, () => listBrandRules(project.id));
  const [busy, setBusy] = useState(false);
  const [breached, setBreached] = useState<Set<string>>(new Set());

  const titleOf = useMemo(() => new Map(scripts.map((script) => [script.id, script.title])), [scripts]);
  const scriptIds = useMemo(() => (deliverables.data ?? []).map((item) => item.script_id), [deliverables.data]);
  const drafts = useMemo(() => (versions.data ?? []).filter((item) => item.status === 'draft' && scriptIds.includes(item.script_id)), [versions.data, scriptIds]);
  const latest = new Map<string, NonNullable<typeof versions.data>[number]>();
  for (const version of versions.data ?? []) {
    const current = latest.get(version.script_id);
    if (!current || current.number < version.number) latest.set(version.script_id, version);
  }

  useEffect(() => {
    if (!deliverables.data || !rules.data) return;
    let active = true;
    const checks: BrandRule[] = rules.data.map((rule) => ({
      id: rule.id,
      kind: rule.kind as BrandRuleKind,
      text: rule.text,
      severity: rule.severity as BrandRuleSeverity,
    }));
    Promise.all(deliverables.data.map(async (deliverable) => {
      const content = await fetchScriptContent(deliverable.script_id);
      return [deliverable.script_id, checkBrandRules(copyText(parseCopy(content)), checks).length > 0] as const;
    })).then((rows) => {
      if (active) setBreached(new Set(rows.filter(([, failed]) => failed).map(([id]) => id)));
    }).catch(() => {
      if (active) toast('Could not check every deliverable against the brand rules.', 'error');
    });
    return () => { active = false; };
  }, [deliverables.data, rules.data, toast]);

  const save = async (item: Deliverable, patch: Parameters<typeof updateDeliverable>[1]) => {
    setBusy(true);
    const error = await updateDeliverable(item.script_id, patch);
    setBusy(false);
    if (error) toast(`Could not update the deliverable: ${error}`, 'error');
    else deliverables.reload();
  };

  /** The working text of the chosen pieces (what the editor holds now), with where each one stands in review. */
  const gather = async (items: Deliverable[]): Promise<ExportPiece[]> => Promise.all(items.map(async (item) => {
    const version = latest.get(item.script_id);
    return {
      title: titleOf.get(item.script_id) ?? item.title,
      kind: item.kind,
      status: version ? STATE_LABEL[versionState(version)] : 'Draft',
      content: await fetchScriptContent(item.script_id),
      maxChars: item.max_chars,
      maxSeconds: item.max_seconds,
      wordsPerSecond: item.words_per_second,
      notes: item.notes ?? '',
    };
  }));

  /** Export one piece (`only`) or the whole set, as plain text or a PDF. */
  const exportPieces = async (only: Deliverable | null, format: 'txt' | 'pdf') => {
    const items = only ? [only] : (deliverables.data ?? []);
    if (items.length === 0) return;
    setBusy(true);
    try {
      const views = (await gather(items)).map(describePiece);
      const name = exportFileName(project.title, only ? views[0].title : null, format);
      if (format === 'txt') {
        const text = only ? pieceToText(views[0]) : setToText(project.title, views, new Date().toISOString().slice(0, 10));
        download(new Blob([text], { type: 'text/plain;charset=utf-8' }), name);
      } else {
        const { buildPdf } = await import('@/lib/ad/exportPdf');
        const doc = await buildPdf(project.title, views);
        download(doc.output('blob'), name);
        const everything = views.flatMap((view) => [view.title, ...view.sections.map((section) => section.text), view.notes]).join('\n');
        if (needsPdfFallback(everything)) toast('Some characters this PDF font cannot print are shown as “?”. The plain-text export keeps every character.', 'info');
      }
    } catch (error) {
      toast(`Could not export: ${error instanceof Error ? error.message : 'try again'}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const sendAll = async () => {
    setBusy(true);
    const result = await sendDraftsForReview(project.id, scriptIds, project.title);
    setBusy(false);
    if ('error' in result) { toast(result.error, 'error'); return; }
    const url = reviewUrl(window.location.origin, result.link.token);
    try { await navigator.clipboard.writeText(url); toast('All draft versions sent and the client link copied.', 'success'); }
    catch { toast(`Drafts sent. Copy this review link: ${url}`, 'success'); }
    versions.reload();
  };

  return (
    <section className={s.panel} aria-labelledby="ad-deliverables-title">
      <div className={s.panelTitle} id="ad-deliverables-title">Campaign deliverables</div>
      <p className={s.hint}>The project is the campaign; each copy script is one piece with its own limits and review versions.</p>
      {deliverables.error != null && <p className={s.hint} role="alert">Could not load deliverables. <button type="button" className={s.btn} onClick={deliverables.reload}>Try again</button></p>}
      {deliverables.data && (
        <>
          <p className={s.hint}>
            {breached.size} of {deliverables.data.length} pieces breach a required brand rule.
          </p>
          {deliverables.data.length === 0
            ? <p className={s.hint}>Create a copy script in the editor; it will appear here as a deliverable.</p>
            : <div className={s.stack} style={{ gap: 8 }}>
              {deliverables.data.map((item) => {
                const state = latest.get(item.script_id);
                const stateLabel = state ? STATE_LABEL[versionState(state)] : 'Draft';
                return (
                  <div key={item.script_id} className={s.publishRow} style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 180, flex: '1 1 200px' }}>
                      <div className={s.cardTitle}>{titleOf.get(item.script_id) ?? item.title}</div>
                      <div className={s.hint}>{stateLabel}{breached.has(item.script_id) ? ' · Brand rule breach' : ''}</div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }} role="group" aria-label={`Export ${item.title}`}>
                        <button type="button" className={s.btn} disabled={busy} onClick={() => void exportPieces(item, 'txt')}>Text</button>
                        <button type="button" className={s.btn} disabled={busy} onClick={() => void exportPieces(item, 'pdf')}>PDF</button>
                      </div>
                      <label className={s.hint}>Piece type
                        <select aria-label={`Piece type for ${item.title}`} className={s.input} value={item.kind} disabled={!canShape || busy}
                          onChange={(event) => {
                            if (!isDeliverableKind(event.target.value)) return;
                            const preset = DELIVERABLE_KINDS[event.target.value];
                            void save(item, { kind: event.target.value, max_chars: preset.max_chars, max_seconds: preset.max_seconds });
                          }}>
                          {Object.entries(DELIVERABLE_KINDS).map(([kind, preset]) => <option key={kind} value={kind}>{preset.label}</option>)}
                        </select>
                      </label>
                      <label className={s.hint}>Max characters
                        <input aria-label={`Character limit for ${item.title}`} className={s.input} type="number" min="1" max="100000" defaultValue={item.max_chars ?? ''}
                          key={`${item.script_id}-chars-${item.max_chars}`} disabled={!canShape || busy}
                          onBlur={(event) => {
                            const raw = event.currentTarget.value;
                            const value = raw === '' ? null : Number(raw);
                            if (value !== item.max_chars && (value === null || Number.isInteger(value))) void save(item, { max_chars: value });
                          }} />
                      </label>
                      <label className={s.hint}>Max seconds
                        <input aria-label={`Time limit for ${item.title}`} className={s.input} type="number" min="1" max="3600" defaultValue={item.max_seconds ?? ''}
                          key={`${item.script_id}-seconds-${item.max_seconds}`} disabled={!canShape || busy}
                          onBlur={(event) => {
                            const raw = event.currentTarget.value;
                            const value = raw === '' ? null : Number(raw);
                            if (value !== item.max_seconds && (value === null || Number.isInteger(value))) void save(item, { max_seconds: value });
                          }} />
                      </label>
                      <label className={s.hint}>Words / second
                        <input aria-label={`Reading pace for ${item.title}`} className={s.input} type="number" min="0.5" max="5" step="0.1" defaultValue={item.words_per_second}
                          key={`${item.script_id}-pace-${item.words_per_second}`} disabled={!canShape || busy} onBlur={(event) => {
                            const value = Number(event.target.value);
                            if (Number.isFinite(value) && value >= 0.5 && value <= 5 && value !== item.words_per_second) void save(item, { words_per_second: value });
                          }} />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>}
          {deliverables.data.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }} role="group" aria-label="Export the whole campaign">
              <span className={s.hint}>Export all {deliverables.data.length} pieces</span>
              <button type="button" className={s.btn} disabled={busy} onClick={() => void exportPieces(null, 'txt')}>Text</button>
              <button type="button" className={s.btn} disabled={busy} onClick={() => void exportPieces(null, 'pdf')}>PDF</button>
            </div>
          )}
          {canShape && (
            <button type="button" className={s.btnPrimary} style={{ marginTop: 12 }} onClick={() => void sendAll()} disabled={busy || drafts.length === 0}>
              Send all {drafts.length || ''} draft version{drafts.length === 1 ? '' : 's'} for review
            </button>
          )}
        </>
      )}
    </section>
  );
}
