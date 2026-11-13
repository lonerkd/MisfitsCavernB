'use client';

import React, { useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { listRecords, type RecordKind } from '@/lib/supabase/productionRecords';
import { recordsDoc, RECORD_PRINT } from '@/lib/studio/records-print';
import { characterName, sceneChip } from '@/lib/studio/record-links';
import { printDocument } from '@/lib/print/print';
import { downloadCsv } from '@/lib/print/download';
import type { PrintDoc } from '@/lib/print/kit';
import { useStudio } from '../StudioContext';
import { useRecordTargets } from './RecordLinks';
import { cx } from '../ui';
import s from '../studio.module.css';

/** Prints (or saves as a PDF) one role tool's records. Reads the list fresh when pressed, so the page is what is saved, not what was loaded. */
export function PrintRecordsButton({ kind }: { kind: RecordKind }) {
  const { project } = useStudio();
  const { toast } = useToast();
  const t = useRecordTargets();
  const [busy, setBusy] = useState(false);

  const run = async (act: (doc: PrintDoc) => boolean, failed: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const rows = await listRecords(project.id, kind);
      const doc = recordsDoc({
        kind, project: project.title, accent: project.accent_color,
        rows,
        sceneOf: (r) => sceneChip(r as never, t.sceneById),
        characterOf: (r) => characterName(r as never, t.characterById),
        generated: new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }),
      });
      if (!act(doc)) toast(failed, 'error');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not read the list to print it.', 'error');
    } finally { setBusy(false); }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 8 }}>
      <button type="button" className={cx(s.btn, s.small)} onClick={() => void run(printDocument, 'Could not open the print dialog.')} disabled={busy} aria-label={`Print / PDF: ${RECORD_PRINT[kind].title}`}>
        <Printer size={11} aria-hidden /> Print / PDF
      </button>
      <button type="button" className={cx(s.btn, s.small)} onClick={() => void run(downloadCsv, 'Could not save the file.')} disabled={busy} aria-label={`CSV: ${RECORD_PRINT[kind].title}`}>
        <Download size={11} aria-hidden /> CSV
      </button>
    </div>
  );
}
