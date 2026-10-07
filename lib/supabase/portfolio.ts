import { supabase } from './client';

function isValidYouTubeUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const host = urlObj.hostname;
    return host === 'youtube.com' || host === 'www.youtube.com' || host === 'youtu.be' || host === 'www.youtu.be';
  } catch {
    return false;
  }
}

function isValidImageUrl(url: string): boolean {
  try {
    new URL(url);
    return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
  } catch {
    return false;
  }
}

export async function getPortfolioProjects(userId?: string) {
  let query = supabase.from('portfolio_projects').select('*, portfolio_media(*)').order('created_at', { ascending: false });
  if (userId) {
    query = query.eq('user_id', userId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createPortfolioProject(project: any) {
  const { data, error } = await supabase.from('portfolio_projects').insert(project).select().single();
  if (error) throw error;
  return data;
}

export async function addPortfolioMedia(media: any) {
  if (!media.url) {
    throw new Error('URL is required');
  }

  if (media.media_type === 'youtube') {
    if (!isValidYouTubeUrl(media.url)) {
      throw new Error('Invalid YouTube URL. Please provide a valid youtube.com or youtu.be URL.');
    }
  } else if (media.media_type === 'image') {
    if (!isValidImageUrl(media.url)) {
      throw new Error('Invalid image URL. Please provide a direct URL to an image (jpg, png, gif, webp, or svg).');
    }
  }

  const { data, error } = await supabase.from('portfolio_media').insert(media).select().single();
  if (error) throw error;
  return data;
}

export async function deletePortfolioProject(id: string) {
  const { error } = await supabase.from('portfolio_projects').delete().eq('id', id);
  if (error) throw error;
}

export async function deletePortfolioMedia(id: string) {
  const { error } = await supabase.from('portfolio_media').delete().eq('id', id);
  if (error) throw error;
}

// ── Pitch-board blocks ──────────────────────────────────────────────────────

export type PortfolioBlockType = 'cover' | 'concept' | 'scene' | 'budget' | 'crew' | 'script' | 'text' | 'media';

export interface PortfolioBlock {
  id: string;
  portfolio_project_id: string;
  position: number;
  block_type: PortfolioBlockType;
  title: string | null;
  body: string | null;
  image_url: string | null;
  meta: any | null;
  source_ref_id: string | null;
  created_at: string;
}

export async function getPortfolioBlocks(portfolioProjectId: string): Promise<PortfolioBlock[]> {
  const { data, error } = await supabase
    .from('portfolio_blocks')
    .select('*')
    .eq('portfolio_project_id', portfolioProjectId)
    .order('position', { ascending: true });
  if (error) throw error;
  return (data as PortfolioBlock[]) || [];
}

export async function addPortfolioBlock(block: Partial<PortfolioBlock> & { portfolio_project_id: string; block_type: PortfolioBlockType }): Promise<PortfolioBlock> {
  const { data, error } = await supabase.from('portfolio_blocks').insert(block).select().single();
  if (error) throw error;
  return data as PortfolioBlock;
}

export async function updatePortfolioBlock(id: string, patch: Partial<PortfolioBlock>): Promise<PortfolioBlock> {
  const { data, error } = await supabase.from('portfolio_blocks').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data as PortfolioBlock;
}

export async function deletePortfolioBlock(id: string) {
  const { error } = await supabase.from('portfolio_blocks').delete().eq('id', id);
  if (error) throw error;
}

export async function reorderPortfolioBlocks(orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map((id, i) =>
      supabase.from('portfolio_blocks').update({ position: i }).eq('id', id)
    )
  );
}

/**
 * This person's pitch board for a project, if they made one. Throws when the
 * lookup fails, so a failed lookup is never mistaken for "none yet" (which
 * would create a second board).
 */
export async function findPitchBoard(projectId: string, userId: string): Promise<{ id: string; share_token: string | null } | null> {
  const { data, error } = await supabase.from('portfolio_projects').select('id, share_token')
    .eq('source_project_id', projectId).eq('user_id', userId).limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

export interface PitchMaterial {
  images: { id: string; title: string | null; storage_path: string | null; external_url: string | null; shared: boolean | null }[];
  scenes: { id: string; scene_number: number; title: string; location: string | null; time_of_day: string | null }[];
  budget: { category: string; amount: number }[];
  /** The latest script's text, if there is one. */
  scriptContent: string | null;
}

/** What a pitch board can be built from: the project's images, scenes, budget and script. */
export async function getPitchMaterial(projectId: string): Promise<PitchMaterial> {
  const [c, s, b, scr] = await Promise.all([
    supabase.from('media').select('id, title, storage_path, external_url, shared').eq('project_id', projectId).eq('kind', 'image').order('created_at'),
    supabase.from('scenes').select('id, scene_number, title, location, time_of_day').eq('project_id', projectId).is('removed_at', null).order('scene_number'),
    supabase.from('budget_items').select('category, amount').eq('project_id', projectId).order('created_at'),
    supabase.from('scripts').select('content').eq('project_id', projectId).order('updated_at', { ascending: false }).limit(1),
  ]);
  for (const r of [c, s, b, scr]) if (r.error) throw r.error;
  return {
    images: c.data ?? [],
    scenes: (s.data ?? []) as PitchMaterial['scenes'],
    budget: (b.data ?? []).map((x) => ({ category: x.category, amount: Number(x.amount || 0) })),
    scriptContent: scr.data?.[0]?.content ?? null,
  };
}
