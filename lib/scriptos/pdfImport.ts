/* =========================================================================
   SCRIPTOS — PDF IMPORT
   PDF text extraction is column/row-naive by default: pdf.js hands back a
   flat stream of positioned text runs, not reading order. This reconstructs
   reading order from each run's (x, y) transform before handing the result
   to the normalizer/classifier, instead of dumping raw extraction order
   (which scrambles dialogue, scene headings and character cues together).
   Ported from the original ScriptOS PDF importer's "surgical stitcher".
   ========================================================================= */

export interface PdfImportProgress {
  page: number;
  totalPages: number;
}

interface PositionedItem {
  str: string;
  transform: number[];
}

interface VisualLine {
  text: string;
  y: number | null;
  x: number | null;
}

const TRANSITION_REGEX = /^(FADE IN|FADE OUT|CUT TO|DISSOLVE TO|SMASH CUT|BACK TO|MATCH CUT)(:)?$/i;
const SCENE_HEADING_REGEX = /^\d*\s*(INT\.|EXT\.|I\/E|EST\.)/i;
const CHARACTER_REGEX = /^[A-Z][A-Z0-9\s()'.]{1,50}$/;

/** A character cue is centered roughly mid-page — narrow enough to exclude
 *  scene headings/action that happen to also be short and all-caps. */
function looksLikeCenteredCharacterCue(text: string, x: number | null): boolean {
  return CHARACTER_REGEX.test(text) && x !== null && x > 180 && x < 350;
}

/** Re-stitches one page's positioned text runs into screenplay-shaped lines:
 *  sorts top-to-bottom/left-to-right, groups runs into visual lines by Y
 *  proximity, then merges wrapped prose while keeping scene headings,
 *  transitions and character cues as their own standalone blocks. */
function reconstructPageText(items: PositionedItem[]): string {
  if (!items.length) return '';

  const sorted = [...items].sort((a, b) => {
    const yDiff = b.transform[5] - a.transform[5];
    if (Math.abs(yDiff) > 4) return yDiff; // row difference
    return a.transform[4] - b.transform[4]; // column order
  });

  const visualLines: VisualLine[] = [];
  let currentLine: VisualLine = { text: '', y: null, x: null };

  for (const item of sorted) {
    if (currentLine.y === null || Math.abs(item.transform[5] - currentLine.y) < 6) {
      currentLine.text += (currentLine.text ? ' ' : '') + item.str;
      if (currentLine.y === null) {
        currentLine.y = item.transform[5];
        currentLine.x = item.transform[4];
      }
    } else {
      if (currentLine.text.trim()) visualLines.push(currentLine);
      currentLine = { text: item.str, y: item.transform[5], x: item.transform[4] };
    }
  }
  if (currentLine.text.trim()) visualLines.push(currentLine);

  const mergedBlocks: string[] = [];
  let buffer = '';

  for (let i = 0; i < visualLines.length; i++) {
    const lineObj = visualLines[i];
    const curr = lineObj.text.trim();

    // Page numbers / "(CONTINUED)" footers — extraction noise, not content.
    if (/^\d+\.$/.test(curr) || /^\(CONTINUED\)$/i.test(curr)) continue;

    const nextLine = visualLines[i + 1];
    const nextText = nextLine?.text.trim() || '';

    const isHeader = SCENE_HEADING_REGEX.test(curr);
    const isTransition = TRANSITION_REGEX.test(curr);
    const isCharacter = looksLikeCenteredCharacterCue(curr, lineObj.x);
    const endsInHyphen = /-$/.test(curr);

    const nextIsHeader = SCENE_HEADING_REGEX.test(nextText);
    const nextIsTransition = TRANSITION_REGEX.test(nextText);
    const nextIsCharacter = looksLikeCenteredCharacterCue(nextText, nextLine?.x ?? null);

    if (isHeader || isTransition || isCharacter) {
      if (buffer) { mergedBlocks.push(buffer); buffer = ''; }
      mergedBlocks.push(curr);
      continue;
    }

    if (buffer) {
      const xDiff = nextLine ? Math.abs((nextLine.x ?? 0) - (lineObj.x ?? 0)) : 0;
      // Stop merging once the next line is a header/transition/cue, or the
      // column shifts enough to suggest a new visual block.
      if (nextIsHeader || nextIsTransition || nextIsCharacter || xDiff > 50) {
        if (endsInHyphen) buffer += curr.slice(0, -1);
        else buffer += (buffer.endsWith(' ') ? '' : ' ') + curr;
        mergedBlocks.push(buffer);
        buffer = '';
      } else if (endsInHyphen) {
        buffer = buffer.slice(0, -1) + curr;
      } else {
        buffer += ' ' + curr;
      }
    } else {
      const endsInPunctuation = /[.!?]$/.test(curr);
      if (endsInPunctuation && (nextIsHeader || nextIsTransition || nextIsCharacter)) {
        mergedBlocks.push(curr);
      } else {
        buffer = curr;
      }
    }
  }
  if (buffer) mergedBlocks.push(buffer);

  return mergedBlocks.join('\n\n');
}

/** Extracts and reconstructs reading-order text from a PDF, page by page.
 *  Client-only — dynamically imports pdf.js so it never touches the server
 *  bundle, and points the worker at the static copy in /public. */
export async function extractTextFromPdf(
  file: File,
  onProgress?: (p: PdfImportProgress) => void
): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    fullText += reconstructPageText(textContent.items as unknown as PositionedItem[]) + '\n\n';
    onProgress?.({ page: i, totalPages: pdf.numPages });
  }

  return fullText.trim();
}
