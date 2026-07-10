import { jsPDF } from 'jspdf';
import { parseScript } from './parser';
import type { ScriptLine } from '@/types/screenplay';

export async function generateScreenplayPDF(content: string, title: string = 'Script'): Promise<void> {
  // Use inches for standard screenplay measurements
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: 'letter' // 8.5 x 11
  });

  doc.setFont('courier', 'normal');
  doc.setFontSize(12);

  const { lines } = parseScript(content);

  // Industry Standard Measurements (in inches from left edge)
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
  const LINE_HEIGHT = 1 / 6; // 6 lines per inch for standard 12pt Courier
  
  let currentY = MARGINS.top;
  let pageNumber = 1;

  const addPageBreak = () => {
    doc.addPage();
    pageNumber++;
    currentY = MARGINS.top;
    // Standard screenplay puts page number at top right starting on page 2, followed by a period.
    if (pageNumber > 1) {
      doc.text(`${pageNumber}.`, MARGINS.pageNumberLeft, MARGINS.pageNumberTop);
      currentY = MARGINS.top; // The page number sits above the top margin
    }
  };

  const checkPageBreak = (neededLines: number = 1) => {
    if (currentY + (neededLines * LINE_HEIGHT) > (PAGE_HEIGHT - MARGINS.bottom)) {
      addPageBreak();
    }
  };

  // Convert text to chunks that fit within the allowed width for that element type
  // Courier 12pt is exactly 10 characters per inch.
  const getWrapWidth = (type: string) => {
    switch (type) {
      case 'dialogue': return 3.5; // ~35 chars max width
      case 'parenthetical': return 2.0; // ~20 chars max width
      case 'action':
      case 'scene':
      case 'shot': return 6.0; // ~60 chars max width
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
        // Scene headings usually have double space before them (handled by parser's empty lines)
        // But we should ensure they don't get orphaned at the bottom of a page
        checkPageBreak(3); 
        break;
      case 'character':
        left = MARGINS.character;
        isUppercase = true;
        // Don't orphan character names
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
        left = 4.25; // middle of 8.5
        checkPageBreak();
        break;
    }

    let textToRender = line.text;
    if (isUppercase) {
      textToRender = textToRender.toUpperCase();
    }
    
    // Some lines shouldn't be wrapped by jspdf if they are standard, but we'll use splitTextToSize just in case
    const wrapWidth = getWrapWidth(line.type);
    
    // jspdf splitTextToSize takes width in the doc's units (inches)
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

  // Save the PDF
  const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.pdf`;
  doc.save(filename);
}
