// The PDF half of lib/ad/export.ts. jsPDF is large and only needed when a PDF is asked for, so it loads then.
import type { jsPDF } from 'jspdf';
import { pdfSafe, type PieceView } from './export';

const LEFT = 1;
const WIDTH = 6.5; // letter, one-inch margins
const TOP = 1;
const BOTTOM = 10; // the text stops here; the footer sits below it
const GREY: [number, number, number] = [110, 110, 110];
const INK: [number, number, number] = [20, 20, 20];

/** One piece per page (or more when it runs long), the campaign name above each title, a page number below. */
export async function buildPdf(campaign: string, views: PieceView[]): Promise<jsPDF> {
  const { jsPDF: Doc } = await import('jspdf');
  const doc = new Doc({ unit: 'in', format: 'letter' });
  let y = TOP;

  const write = (text: string, { size, bold = false, color = INK, after = 0 }: { size: number; bold?: boolean; color?: [number, number, number]; after?: number }) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lineHeight = (size / 72) * 1.4;
    for (const line of doc.splitTextToSize(pdfSafe(text), WIDTH) as string[]) {
      if (y + lineHeight > BOTTOM) { doc.addPage(); y = TOP; }
      doc.text(line, LEFT, y + size / 72);
      y += lineHeight;
    }
    y += after;
  };

  views.forEach((view, index) => {
    if (index > 0) { doc.addPage(); y = TOP; }
    write(campaign.trim() || 'Campaign', { size: 9, color: GREY, after: 0.1 });
    write(view.title, { size: 20, bold: true, after: 0.05 });
    write(`${view.kindLabel} · ${view.status}`, { size: 10, color: GREY });
    for (const limit of view.limits) write(limit, { size: 10, color: GREY });
    y += 0.25;
    for (const section of view.sections) {
      write(section.label.toUpperCase(), { size: 8.5, bold: true, color: GREY, after: 0.04 });
      write(section.text, { size: 12, after: 0.22 });
    }
    if (view.notes) {
      write('NOTES', { size: 8.5, bold: true, color: GREY, after: 0.04 });
      write(view.notes, { size: 10, color: GREY });
    }
  });

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GREY);
    doc.text(pdfSafe(`${campaign.trim() || 'Campaign'} · page ${page} of ${pages}`), LEFT, 10.6);
  }
  return doc;
}
