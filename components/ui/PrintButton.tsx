'use client';

import React from 'react';
import { Download, Printer } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { printDocument } from '@/lib/print/print';
import { downloadCsv } from '@/lib/print/download';
import { hasTable } from '@/lib/print/csv';
import type { PrintDoc } from '@/lib/print/kit';
import s from '@/components/studio/studio.module.css';

/** Print / PDF for any tool, and a CSV file of its tables when it has any. The document is built when a button is pressed, so the page is what
 *  is on screen now. */
export function PrintButton({ build, label, csv = true }: { build: () => PrintDoc; label: string; csv?: boolean }) {
  const { toast } = useToast();
  const make = (): PrintDoc | null => {
    try { return build(); } catch (e) { toast(e instanceof Error ? e.message : 'Could not prepare the page to print.', 'error'); return null; }
  };
  const print = () => {
    const doc = make();
    if (doc && !printDocument(doc)) toast('Could not open the print dialog.', 'error');
  };
  const save = () => {
    const doc = make();
    if (!doc) return;
    if (!hasTable(doc)) { toast('There is nothing in a table to save yet.', 'info'); return; }
    if (!downloadCsv(doc)) toast('Could not save the file.', 'error');
  };
  return (
    <span style={{ display: 'inline-flex', gap: 6 }}>
      <button type="button" className={`${s.btn} ${s.small}`} onClick={print} aria-label={`Print ${label} (or save as PDF)`}>
        <Printer size={11} aria-hidden /> Print / PDF
      </button>
      {csv && (
        <button type="button" className={`${s.btn} ${s.small}`} onClick={save} aria-label={`Save ${label} as a spreadsheet (CSV)`}>
          <Download size={11} aria-hidden /> CSV
        </button>
      )}
    </span>
  );
}
