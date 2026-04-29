// ============================================================================
// SCRIPTOS TITLE PAGE
// Standard screenplay title page fields
// ============================================================================

export interface TitlePage {
  title: string;
  credit: string;      // "Written by", "Screenplay by", etc.
  author: string;
  source: string;       // "Based on..." 
  draftDate: string;
  contact: string;
  copyright: string;
  notes: string;
}

const TITLE_KEY = 'scriptos_title_page';

export function getDefaultTitlePage(): TitlePage {
  return {
    title: 'Untitled Screenplay',
    credit: 'Written by',
    author: '',
    source: '',
    draftDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    contact: '',
    copyright: '',
    notes: '',
  };
}

export function saveTitlePage(scriptId: string, titlePage: TitlePage): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${TITLE_KEY}_${scriptId}`, JSON.stringify(titlePage));
}

export function loadTitlePage(scriptId: string): TitlePage {
  if (typeof window === 'undefined') return getDefaultTitlePage();
  try {
    const stored = localStorage.getItem(`${TITLE_KEY}_${scriptId}`);
    return stored ? { ...getDefaultTitlePage(), ...JSON.parse(stored) } : getDefaultTitlePage();
  } catch { return getDefaultTitlePage(); }
}

// Generate Fountain title page block from TitlePage object
export function titlePageToFountain(tp: TitlePage): string {
  const lines: string[] = [];
  if (tp.title) lines.push(`Title: ${tp.title}`);
  if (tp.credit) lines.push(`Credit: ${tp.credit}`);
  if (tp.author) lines.push(`Author: ${tp.author}`);
  if (tp.source) lines.push(`Source: ${tp.source}`);
  if (tp.draftDate) lines.push(`Draft date: ${tp.draftDate}`);
  if (tp.contact) lines.push(`Contact: ${tp.contact}`);
  if (tp.copyright) lines.push(`Copyright: ${tp.copyright}`);
  if (tp.notes) lines.push(`Notes: ${tp.notes}`);
  return lines.join('\n');
}
