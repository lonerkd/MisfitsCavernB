import type { ScriptLine } from '@/types/screenplay';

export function exportAsFountain(content: string, title: string): void {
  // Fountain format is basically the raw text + metadata header
  const fountainContent = `Title: ${title}
Author: Misfits Cavern
Draft date: ${new Date().toLocaleDateString()}

${content}`;

  const blob = new Blob([fountainContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.fountain`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportAsPDF(lines: ScriptLine[], title: string): void {
  // Generate a PDF-style formatted version
  let pdfContent = `${title.toUpperCase()}\n\n`;
  pdfContent += lines.map(line => {
    const style = getLineStyle(line.type);
    return style.prefix + line.text + style.suffix;
  }).join('\n');

  const blob = new Blob([pdfContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^a-z0-9]/gi, '_')}_formatted.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getLineStyle(type: string): { prefix: string; suffix: string } {
  switch (type) {
    case 'slug':
      return { prefix: '', suffix: '' };
    case 'character':
      return { prefix: '', suffix: '' };
    case 'dialogue':
      return { prefix: '', suffix: '' };
    case 'parenthetical':
      return { prefix: '', suffix: '' };
    case 'transition':
      return { prefix: '', suffix: '' };
    case 'action':
    default:
      return { prefix: '', suffix: '' };
  }
}
