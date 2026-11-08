'use client';

import React from 'react';
import { Printer } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { printDocument } from '@/lib/print/print';
import type { PrintDoc } from '@/lib/print/kit';
import s from '@/components/studio/studio.module.css';

/** One Print / PDF button for any tool: it builds its document when pressed (so the page is what is on screen now) and opens the print dialog. */
export function PrintButton({ build, label }: { build: () => PrintDoc; label: string }) {
  const { toast } = useToast();
  const go = () => {
    let doc: PrintDoc;
    try { doc = build(); } catch (e) { toast(e instanceof Error ? e.message : 'Could not prepare the page to print.', 'error'); return; }
    if (!printDocument(doc)) toast('Could not open the print dialog.', 'error');
  };
  return (
    <button type="button" className={`${s.btn} ${s.small}`} onClick={go} aria-label={`Print ${label} (or save as PDF)`}>
      <Printer size={11} aria-hidden /> Print / PDF
    </button>
  );
}
