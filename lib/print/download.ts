'use client';

import { docToCsv, csvFileName } from './csv';
import type { PrintDoc } from './kit';

/** Saves a document's tables as a .csv file (a byte-order mark first, so Excel reads accents and non-Latin text correctly). Returns false when
 *  the browser cannot make the file, so the caller can say so. */
export function downloadCsv(doc: PrintDoc): boolean {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) return false;
  const blob = new Blob(['﻿', docToCsv(doc)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = csvFileName(doc);
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
