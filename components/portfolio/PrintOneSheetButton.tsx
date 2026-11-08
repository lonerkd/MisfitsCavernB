'use client';

import React from 'react';
import { Printer } from 'lucide-react';
import { oneSheet } from '@/lib/portfolio/one-sheet';
import { printDocument } from '@/lib/print/print';
import { pagePath } from '@/lib/portfolio/page-setting';
import type { PortfolioPageData } from '@/lib/supabase/public';
import { useToast } from '@/components/ui/Toast';

/** Prints the person's one-sheet, or saves it as a PDF (the print dialog's "Save as PDF"). */
export function PrintOneSheetButton({ data }: { data: PortfolioPageData }) {
  const { toast } = useToast();
  const go = () => {
    const url = `${window.location.origin}${pagePath(data.profile.username ?? '')}`;
    const generated = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    if (!printDocument(oneSheet(data, url, generated))) toast('Could not open the print dialog.', 'error');
  };
  return (
    <button type="button" onClick={go}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--panel-2)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 12 }}>
      <Printer size={14} /> One-sheet (print or PDF)
    </button>
  );
}
