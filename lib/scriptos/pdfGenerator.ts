import { jsPDF } from 'jspdf';
import { parseScript } from './parser';
import type { ScriptLine } from '@/types/screenplay';

export async function generateScreenplayPDF(content: string, title: string = 'Script'): Promise<void> {

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: 'letter'
  });

  doc.setFont('courier', 'normal');
  doc.setFontSize(12);

  const { lines } = parseScript(content);

  const MARGINS = {
    top: 1.0,
    bottom: 1.0,
    scene: 1.5,
    action: 1.5,
    character: 3.7,
    parenthetical: 3.1,
    dialogue: 2.5,
    transition: 5.5,
    pageNumberLeft: 7.25,
    pageNumberTop: 0.5
  };

  const PAGE_HEIGHT = 11.0;
  const LINE_HEIGHT = 1 / 6;

  let currentY = MARGINS.top;
  let pageNumber = 1;

  const addPageBreak = () => {
    doc.addPage();
    pageNumber++;
    currentY = MARGINS.top;

    if (pageNumber > 1) {
      doc.text(`${pageNumber}.`, MARGINS.pageNumberLeft, MARGINS.pageNumberTop);
      currentY = MARGINS.top;
    }
  };

  const checkPageBreak = (neededLines: number = 1) => {
    if (currentY + (neededLines * LINE_HEIGHT) > (PAGE_HEIGHT - MARGINS.bottom)) {
      addPageBreak();
    }
  };

  const getWrapWidth = (type: string) => {
    switch (type) {
      case 'dialogue': return 3.5;
      case 'parenthetical': return 2.0;
      case 'action':
      case 'scene':
      case 'shot': return 6.0;
      default: return 6.0;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.type === 'empty') {
      currentY += LINE_HEIGHT;
      checkPageBreak();
      continue;
    }

    let left = MARGINS.action;
    let isUppercase = false;

    switch (line.type) {
      case 'scene':
        left = MARGINS.scene;
        isUppercase = true;

        checkPageBreak(3);
        break;
      case 'character':
        left = MARGINS.character;
        isUppercase = true;

        checkPageBreak(2);
        break;
      case 'parenthetical':
        left = MARGINS.parenthetical;
        checkPageBreak();
        break;
      case 'dialogue':
        left = MARGINS.dialogue;
        checkPageBreak();
        break;
      case 'transition':
        left = MARGINS.transition;
        isUppercase = true;
        checkPageBreak(2);
        break;
      case 'centered':
        left = 4.25;
        checkPageBreak();
        break;
    }

    let textToRender = line.text;
    if (isUppercase) {
      textToRender = textToRender.toUpperCase();
    }

    const wrapWidth = getWrapWidth(line.type);

    const wrappedText = doc.splitTextToSize(textToRender, wrapWidth);

    for (const wrappedLine of wrappedText) {
      checkPageBreak();

      if (line.type === 'centered') {
        doc.text(wrappedLine, left, currentY, { align: 'center' });
      } else {
        doc.text(wrappedLine, left, currentY);
      }

      currentY += LINE_HEIGHT;
    }
  }

  const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.pdf`;
  doc.save(filename);
}
