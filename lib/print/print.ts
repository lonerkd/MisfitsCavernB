'use client';

import { printHtml, type PrintDoc } from './kit';

/** Opens the browser's print dialog for a document (choose "Save as PDF" there for a file). A hidden frame, not a pop-up, so a
 *  pop-up blocker cannot stop it. Returns false when it could not start, so the caller can say so. */
export function printDocument(doc: PrintDoc): boolean {
  if (typeof document === 'undefined') return false;
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  const cleanup = () => { window.setTimeout(() => frame.remove(), 1000); };
  frame.onload = () => {
    const w = frame.contentWindow;
    if (!w) { cleanup(); return; }
    w.addEventListener('afterprint', cleanup);
    w.focus();
    w.print();
    // Some browsers never report afterprint: do not leave the frame behind.
    window.setTimeout(cleanup, 60_000);
  };
  frame.srcdoc = printHtml(doc);
  document.body.appendChild(frame);
  return true;
}
