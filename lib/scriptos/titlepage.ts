// ============================================================================
// SCRIPTOS TITLE PAGE
// Standard screenplay title page fields
// Backed by Supabase (`scripts.title_page` jsonb column) — real, persisted,
// follows the script across devices, replacing the old localStorage blob.
// ============================================================================

import { supabase } from '@/lib/supabase/client';

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

export async function saveTitlePage(scriptId: string, titlePage: TitlePage): Promise<void> {
  if (!scriptId || scriptId === 'demo') return;
  const { error } = await supabase
    .from('scripts')
    .update({ title_page: titlePage })
    .eq('id', scriptId);
  if (error) console.error('Error saving title page:', error);
}

export async function loadTitlePage(scriptId: string): Promise<TitlePage> {
  if (!scriptId || scriptId === 'demo') return getDefaultTitlePage();
  try {
    const { data, error } = await supabase
      .from('scripts')
      .select('title_page')
      .eq('id', scriptId)
      .single();
    if (error || !data?.title_page) return getDefaultTitlePage();
    return { ...getDefaultTitlePage(), ...data.title_page };
  } catch {
    return getDefaultTitlePage();
  }
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
