import { describe, it, expect, vi } from 'vitest';

const saved: string[] = [];
const texts: string[] = [];
vi.mock('jspdf', () => ({
  jsPDF: class {
    setFont() {} setFontSize() {} addPage() {}
    splitTextToSize(t: string) { return [t]; }
    text(t: string) { texts.push(t); }
    save(n: string) { saved.push(n); }
  },
}));

import { exportDocumentPdf } from './export-document-pdf';

describe('exportDocumentPdf', () => {
  it('writes a podcast as headings and speaker labels, not screenplay elements', async () => {
    await exportDocumentPdf({ id: '1', title: 'My Show', content: 'SEGMENT 1: Intro\n\nHOST: Welcome back.\n', format: 'podcast' } as never);
    expect(saved).toEqual(['My_Show.pdf']);
    expect(texts[0]).toBe('My Show');
    expect(texts.join('|')).toContain('Welcome back.');
  });
});
