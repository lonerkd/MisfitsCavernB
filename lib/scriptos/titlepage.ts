// ============================================================================
// SCRIPTOS TITLE PAGE
// Standard screenplay title page fields.
// Persisted in Supabase (script_metadata.title_page) so every collaborator on a
// script sees the same title page. localStorage is kept only as an offline
// cache / optimistic fallback, mirroring lib/scriptos/revisions.ts.
// ============================================================================

import { setCacheItem, getCacheItem } from '@/lib/storage/cache-versioning';
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

const DEFAULT_TITLE_PAGE = getDefaultTitlePage();

// Synchronous cache read for instant first paint; the async loader below
// reconciles with the shared DB copy.
export async function getTitlePage(scriptId: string): Promise<TitlePage> {
  if (typeof window === 'undefined') return DEFAULT_TITLE_PAGE;
  try {
    const data = await getCacheItem(`${TITLE_KEY}_${scriptId}`, 'titlepage');
    if (data) {
      return { ...DEFAULT_TITLE_PAGE, ...data };
    }
    return DEFAULT_TITLE_PAGE;
  } catch {
    return DEFAULT_TITLE_PAGE;
  }
}

export async function loadTitlePage(scriptId: string): Promise<TitlePage> {
  const cached = await getTitlePage(scriptId);
  try {
    const { data } = await supabase
      .from('script_metadata')
      .select('title_page')
      .eq('script_id', scriptId)
      .maybeSingle();
    if (data?.title_page && Object.keys(data.title_page).length > 0) {
      const merged = { ...DEFAULT_TITLE_PAGE, ...(data.title_page as Partial<TitlePage>) };
      await setCacheItem(`${TITLE_KEY}_${scriptId}`, merged);
      return merged;
    }
  } catch { /* offline — fall back to cache */ }
  return cached;
}

export async function saveTitlePage(scriptId: string, updates: Partial<TitlePage>): Promise<{ success: boolean; error?: string }> {
  try {
    const current = await getTitlePage(scriptId);
    const merged = { ...current, ...updates };

    await setCacheItem(`${TITLE_KEY}_${scriptId}`, merged);
    
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('script_metadata').upsert(
      { script_id: scriptId, title_page: merged, updated_by: user?.id, updated_at: new Date().toISOString() },
      { onConflict: 'script_id' }
    );
    return { success: true };
  } catch { /* offline — cache already written, will reconcile on next save */
    return { success: true };
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
