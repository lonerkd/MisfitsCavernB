import { parseScript } from './parser';
import { readingFormat } from './reading-format';
import type { StoredScript } from './storage';

/**
 * The PDF of a script that is not a screenplay and has no format-shaped print of its own (podcast, ad copy,
 * documentary outline — video, article and game scripts print through the print kit, see format-export.ts).
 * Courier at screenplay margins is wrong for these: a section is a heading, a speaker is a label, and the text is
 * read, not timed at a page a minute. Helvetica, one-inch margins, page numbers at the foot.
 */
export async function exportDocumentPdf(script: StoredScript, titlePage?: { title?: string; author?: string }): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const lines = parseScript(script.content, readingFormat(script.format)).lines;
  const doc = new jsPDF({ unit: 'in', format: 'letter' });
  const M = 1, W = 6.5, BOTTOM = 10;
  let y = M;
  let page = 1;

  const foot = () => { doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(String(page), 4.25, 10.5, { align: 'center' }); };
  const ensure = (h: number) => { if (y + h > BOTTOM) { foot(); doc.addPage(); page += 1; y = M; } };
  const write = (text: string, x: number, width: number, size: number, bold: boolean, gap: number) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const lh = size / 72 * 1.4;
    for (const l of doc.splitTextToSize(text, width) as string[]) { ensure(lh); doc.text(l, x, y); y += lh; }
    y += gap;
  };

  write(titlePage?.title || script.title || 'Untitled', M, W, 20, true, 0.1);
  if (titlePage?.author) write(titlePage.author, M, W, 11, false, 0.1);
  y += 0.25;

  for (const line of lines) {
    const t = line.text.trim();
    if (line.type === 'empty' || !t) continue;
    if (line.type === 'slug') { y += 0.15; ensure(0.8); write(t, M, W, 14, true, 0.08); }
    else if (line.type === 'character') { ensure(0.6); write(t.replace(/:$/, ''), M, W, 10, true, 0); }
    else if (line.type === 'dialogue' || line.type === 'parenthetical') write(t, M + 0.3, W - 0.3, 11, false, 0.1);
    else write(t, M, W, 11, false, 0.1);
  }
  foot();
  doc.save(`${script.title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
}
