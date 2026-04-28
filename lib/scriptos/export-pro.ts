import type { ScriptLine } from '@/types/screenplay';

// Professional Fountain export
export function exportFountainPro(lines: ScriptLine[], title: string, author = '', date = new Date().toLocaleDateString()): string {
  let fountain = `Title: ${title}\n`;
  if (author) fountain += `Author: ${author}\n`;
  fountain += `Date: ${date}\n\n`;

  lines.forEach(line => {
    if (line.type === 'empty') {
      fountain += '\n';
    } else if (line.type === 'slug') {
      fountain += line.text.toUpperCase() + '\n';
    } else if (line.type === 'character') {
      fountain += line.text.toUpperCase() + '\n';
    } else if (line.type === 'parenthetical') {
      fountain += line.text + '\n';
    } else if (line.type === 'dialogue') {
      fountain += line.text + '\n';
    } else if (line.type === 'transition') {
      fountain += line.text.toUpperCase() + '\n';
    } else {
      fountain += line.text + '\n';
    }
  });

  return fountain;
}

// PDF-ready formatted text export
export function exportFormattedText(lines: ScriptLine[], title: string): string {
  let text = '';
  const pageWidth = 80; // Characters per line

  // Title page
  text += title.padStart(Math.floor((pageWidth - title.length) / 2)) + '\n\n';
  text += '\n'.repeat(10);

  // Content
  lines.forEach(line => {
    const { formatted, lines: wrappedLines } = formatLineForExport(line, pageWidth);
    text += formatted;
  });

  return text;
}

function formatLineForExport(line: ScriptLine, pageWidth: number): { formatted: string; lines: number } {
  let formatted = '';
  let lineCount = 1;

  switch (line.type) {
    case 'slug':
      formatted = line.text.toUpperCase() + '\n\n';
      break;
    case 'action':
      const wrapped = wrapText(line.text, pageWidth);
      formatted = wrapped + '\n\n';
      lineCount = wrapped.split('\n').length;
      break;
    case 'character':
      const padding = Math.floor((pageWidth - line.text.length) / 2) + 10;
      formatted = ' '.repeat(Math.max(0, padding)) + line.text.toUpperCase() + '\n';
      break;
    case 'parenthetical':
      const pPadding = 12;
      formatted = ' '.repeat(pPadding) + line.text + '\n';
      break;
    case 'dialogue':
      const dPadding = 10;
      const dWrapped = wrapText(line.text, pageWidth - dPadding * 2);
      formatted = dWrapped.split('\n').map(l => ' '.repeat(dPadding) + l).join('\n') + '\n';
      lineCount = dWrapped.split('\n').length;
      break;
    case 'transition':
      const tPadding = Math.floor((pageWidth - line.text.length) / 2) + 50;
      formatted = ' '.repeat(Math.max(0, tPadding)) + line.text.toUpperCase() + '\n\n';
      break;
    case 'empty':
      formatted = '\n';
      break;
    default:
      formatted = line.text + '\n';
  }

  return { formatted, lines: lineCount };
}

function wrapText(text: string, width: number): string {
  const words = text.split(' ');
  let lines: string[] = [];
  let currentLine = '';

  words.forEach(word => {
    if ((currentLine + ' ' + word).length <= width) {
      currentLine = currentLine ? currentLine + ' ' + word : word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });

  if (currentLine) lines.push(currentLine);
  return lines.join('\n');
}

// Export as downloadable file
export function downloadExport(content: string, filename: string, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Statistics for the screenplay
export function getScreenplayStats(lines: ScriptLine[], title: string) {
  const words = lines.reduce((acc, line) => {
    if (['dialogue', 'action'].includes(line.type)) {
      return acc + line.text.split(/\s+/).length;
    }
    return acc;
  }, 0);

  const scenes = lines.filter(l => l.type === 'slug').length;
  const characters = new Set(
    lines
      .filter(l => l.type === 'character')
      .map(l => l.meta?.characterName)
      .filter(Boolean)
  ).size;

  const pages = Math.ceil(lines.length / 55);
  const readTime = Math.ceil(words / 150); // 150 WPM average

  return {
    title,
    words,
    scenes,
    characters,
    pages,
    readTime, // in minutes
    created: new Date().toISOString()
  };
}
