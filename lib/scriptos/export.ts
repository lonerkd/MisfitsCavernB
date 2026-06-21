import { StoredScript } from './storage';
import { parseScript } from './parser';
import { jsPDF } from 'jspdf';

export function exportScriptAsText(script: StoredScript, format: 'txt' | 'fountain' = 'txt'): void {
  const blob = new Blob([script.content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${script.title.replace(/[^a-z0-9]/gi, '_')}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportScriptAsFdx(script: StoredScript): void {
  const result = parseScript(script.content);
  
  const mapTypeToFdx = (type: string): string => {
    switch (type) {
      case 'slug': return 'Scene Heading';
      case 'action': return 'Action';
      case 'character': return 'Character';
      case 'dialogue': return 'Dialogue';
      case 'parenthetical': return 'Parenthetical';
      case 'transition': return 'Transition';
      default: return 'Action';
    }
  };

  const paragraphs = result.lines
    .filter(line => line.type !== 'empty')
    .map(line => {
      // Very basic XML escape
      const escapedText = line.text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
      
      return `    <Paragraph Type="${mapTypeToFdx(line.type)}">
      <Text>${escapedText}</Text>
    </Paragraph>`;
    }).join('\n');

  const fdxXml = `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<FinalDraft DocumentType="Script" Template="No" Version="1">
  <Content>
${paragraphs}
  </Content>
</FinalDraft>`;

  const blob = new Blob([fdxXml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${script.title.replace(/[^a-z0-9]/gi, '_')}.fdx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Real, paginated, industry-formatted screenplay PDF — Courier 12pt on US
// Letter, 1" margins (1.5" left for binding), correct per-element indents.
// Generates an actual file download; no print dialog involved.
export function exportScriptAsPdf(script: StoredScript, titlePage?: { title?: string; credit?: string; author?: string; draftDate?: string }): void {
  const result = parseScript(script.content);

  const doc = new jsPDF({ unit: 'in', format: 'letter' });
  doc.setFont('courier', 'normal');
  doc.setFontSize(12);

  const PAGE_HEIGHT = 11;
  const TOP_MARGIN = 1;
  const BOTTOM_MARGIN = 1;
  const LEFT_MARGIN = 1.5; // standard screenplay binding margin
  const LINE_HEIGHT = 12 / 72 * 1.2; // 12pt line, single-spaced screenplay leading
  const CONTENT_BOTTOM = PAGE_HEIGHT - BOTTOM_MARGIN;
  const CHAR_WIDTH = 12 / 72 * 0.6; // approx Courier monospace advance width at 12pt

  // Per-element left offset (inches, relative to the page, not the 1.5" margin)
  // and the usable text width for wrapping, matching standard screenplay format.
  const ELEMENT_LEFT: Record<string, number> = {
    slug: LEFT_MARGIN,
    action: LEFT_MARGIN,
    character: LEFT_MARGIN + 2.2,
    dialogue: LEFT_MARGIN + 1.0,
    parenthetical: LEFT_MARGIN + 1.6,
    transition: 5.5,
    note: LEFT_MARGIN,
  };
  const ELEMENT_WIDTH: Record<string, number> = {
    slug: 6,
    action: 6,
    character: 3,
    dialogue: 3.5,
    parenthetical: 2.5,
    transition: 2,
    note: 6,
  };

  let y = TOP_MARGIN;
  let pageNum = 1;

  const newPage = () => {
    doc.addPage();
    pageNum += 1;
    doc.setFontSize(10);
    doc.text(`${pageNum}.`, 7.5, 0.6, { align: 'right' });
    doc.setFontSize(12);
    y = TOP_MARGIN;
  };

  const ensureSpace = (linesNeeded: number) => {
    if (y + linesNeeded * LINE_HEIGHT > CONTENT_BOTTOM) newPage();
  };

  // ---- Title page ----
  if (titlePage?.title || script.title) {
    doc.setFontSize(14);
    const title = (titlePage?.title || script.title || 'Untitled').toUpperCase();
    doc.text(title, 4.25, 4.5, { align: 'center' });
    doc.setFontSize(12);
    doc.text(titlePage?.credit || 'Written by', 4.25, 5, { align: 'center' });
    if (titlePage?.author) doc.text(titlePage.author, 4.25, 5.3, { align: 'center' });
    if (titlePage?.draftDate) doc.text(titlePage.draftDate, 4.25, 10, { align: 'center' });
    doc.addPage();
    doc.setFontSize(10);
    doc.text('1.', 7.5, 0.6, { align: 'right' });
    doc.setFontSize(12);
  } else {
    doc.setFontSize(10);
    doc.text('1.', 7.5, 0.6, { align: 'right' });
    doc.setFontSize(12);
  }

  let currentSpeaker: string | null = null;

  for (const line of result.lines) {
    const type = line.type === 'empty' ? 'empty' : line.type;
    if (type === 'empty') {
      y += LINE_HEIGHT;
      continue;
    }
    if (type === 'slug') currentSpeaker = null;
    if (type === 'character') currentSpeaker = line.text.trim().toUpperCase();

    const x = ELEMENT_LEFT[type] ?? LEFT_MARGIN;
    const width = ELEMENT_WIDTH[type] ?? 6;

    let text = line.text;
    if (type === 'slug' || type === 'character' || type === 'transition') text = text.toUpperCase();

    const wrapped: string[] = doc.splitTextToSize(text, width) as string[];

    // Extra leading before scene headings and character cues, matching screen convention.
    if (type === 'slug') { ensureSpace(2); y += LINE_HEIGHT; }
    if (type === 'character') { ensureSpace(wrapped.length + 1); y += LINE_HEIGHT; }

    // A dialogue/parenthetical block that won't fit before the page bottom
    // gets a "(MORE)" cue and the page break carries a "(CONT'D)" cue for
    // the same speaker — standard screenplay pagination, not a plain cut.
    if ((type === 'dialogue' || type === 'parenthetical') && y + wrapped.length * LINE_HEIGHT > CONTENT_BOTTOM && currentSpeaker) {
      doc.text('(MORE)', ELEMENT_LEFT.dialogue, y, { align: 'left' });
      newPage();
      doc.text(`${currentSpeaker} (CONT'D)`, ELEMENT_LEFT.character, y);
      y += LINE_HEIGHT * 1.5;
    } else {
      ensureSpace(wrapped.length);
    }
    for (const wl of wrapped) {
      doc.text(wl, x, y);
      y += LINE_HEIGHT;
    }

    if (type === 'slug' || type === 'dialogue' || type === 'transition') y += LINE_HEIGHT * 0.5;
  }

  doc.save(`${script.title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
}
