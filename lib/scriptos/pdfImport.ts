// Reads the text out of a screenplay PDF. pdf.js reports text items with their
// positions on the page; turning them into a script is pdfLayout's job (it reads
// the document's own columns, not fixed coordinates).

import { layoutPages } from './pdfLayout';

export interface PdfImportProgress {
  page: number;
  totalPages: number;
}

export interface PositionedItem {
  str: string;
  transform: number[];
}

export async function extractTextFromPdf(
  file: File,
  onProgress?: (p: PdfImportProgress) => void
): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: PositionedItem[][] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    pages.push((textContent.items as unknown as Array<PositionedItem & { str?: string }>).filter((it) => typeof it.str === 'string'));
    onProgress?.({ page: i, totalPages: pdf.numPages });
  }

  return layoutPages(pages);
}
