'use client';

import React, { useState } from 'react';
import { Printer } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { listRecords, type RecordKind } from '@/lib/supabase/productionRecords';
import { recordsDoc, RECORD_PRINT } from '@/lib/studio/records-print';
import { characterName, sceneChip } from '@/lib/studio/record-links';
import { printDocument } from '@/lib/print/print';
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

  const go = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const rows = await listRecords(project.id, kind);
      const ok = printDocument(recordsDoc({
        kind, project: project.title, accent: project.accent_color,
        rows,
        sceneOf: (r) => sceneChip(r as never, t.sceneById),
        characterOf: (r) => characterName(r as never, t.characterById),
        generated: new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }),
      }));
      if (!ok) toast('Could not open the print dialog.', 'error');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not read the list to print it.', 'error');
    } finally { setBusy(false); }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
      <button type="button" className={cx(s.btn, s.small)} onClick={() => void go()} disabled={busy} aria-label={`Print ${RECORD_PRINT[kind].title} (or save as PDF)`}>
        <Printer size={11} aria-hidden /> Print / PDF
      </button>
    </div>
  );
}
