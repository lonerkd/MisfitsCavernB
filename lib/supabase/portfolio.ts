import { supabase } from './client';
import { isCoverUrl, type OwnerProfile } from '@/lib/portfolio/header';
import { isVisibility, type PortfolioVisibility } from '@/lib/portfolio/visibility';
import { pageSettingOf, type PagePublish } from '@/lib/portfolio/page-setting';

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

/** Saves the pins and the order of a person's pieces (their own only: the database refuses others, and a fourth pin). */
export async function savePortfolioOrder(places: Array<{ id: string; pinned: boolean; position: number }>): Promise<void> {
  const results = await Promise.all(places.map((p) => supabase.from('portfolio_projects').update({ pinned: p.pinned, position: p.position }).eq('id', p.id).select('id')));
  const failed = results.find((r) => r.error || !r.data?.length);
  if (failed) throw failed.error ?? new Error('You cannot change this piece.');
}

/** The person a portfolio belongs to, from their profile: what the page's header says. */
export async function getPortfolioOwner(userId: string): Promise<OwnerProfile | null> {
  const { data, error } = await supabase.from('profiles').select('username, role, location, bio, avatar_url, status').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

/** Sets (or clears) a piece's cover image: an https link to an image. */
export async function setPortfolioCover(id: string, url: string | null): Promise<void> {
  if (url !== null && !isCoverUrl(url)) throw new Error('A cover is a link to an image that starts with https://');
  const { data, error } = await supabase.from('portfolio_projects').update({ cover_url: url === null ? null : url.trim() }).eq('id', id).select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('You cannot change this piece.');
}

/** Publishes or hides a piece: public, unlisted (its link only) or private. Only its owner can; the database refuses anyone else. */
export async function setPortfolioVisibility(id: string, visibility: PortfolioVisibility): Promise<void> {
  if (!isVisibility(visibility)) throw new Error('Choose private, link only or public.');
  const { data, error } = await supabase.from('portfolio_projects').update({ visibility }).eq('id', id).select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('You cannot change this piece.');
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
export async function findPitchBoard(projectId: string, userId: string): Promise<{ id: string; share_token: string | null; visibility: string } | null> {
  const { data, error } = await supabase.from('portfolio_projects').select('id, share_token, visibility')
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

/** A piece by its share link (public or link-only, never private), with its media, ordered blocks and author; null when the link leads nowhere. */
export interface SharedPortfolio {
  id: string;
  title: string;
  description: string | null;
  year: number | null;
  role: string | null;
  category: string | null;
  accent_color: string | null;
  cover_url: string | null;
  share_token: string;
  created_at: string;
  portfolio_media: { id: string; title: string; media_type: string; url: string; thumbnail_url?: string }[];
  portfolio_blocks: PortfolioBlock[];
  profiles: { username: string | null; role: string | null; avatar_url: string | null } | null;
}

export async function getPublicPortfolio(token: string): Promise<SharedPortfolio | null> {
  const { data, error } = await supabase.rpc('get_shared_portfolio', { p_token: token });
  if (error) throw error;
  return (data ?? null) as unknown as SharedPortfolio | null;
}

/** The signed-in person's own page setting (off, link only, public); anything unreadable is off. */
export async function getMyPortfolioPage(): Promise<PagePublish> {
  const { data } = await supabase.rpc('get_my_portfolio_page');
  return pageSettingOf(data);
}

/** Changes the page setting. Says so when the database refused (nothing changed). */
export async function setMyPortfolioPage(userId: string, value: PagePublish): Promise<void> {
  const { error } = await supabase.from('profiles').update({ portfolio_page: value }).eq('id', userId);
  if (error) throw new Error(error.message || 'Could not change your page');
}

/** Whether this person has a published page (link only or public): the page function answers for anyone, and nothing when it is off. */
export async function hasPortfolioPage(handle: string): Promise<boolean> {
  if (!handle.trim()) return false;
  const { data, error } = await supabase.rpc('get_portfolio_page', { p_handle: handle });
  return !error && !!data;
}

export type LaurelKind = 'selection' | 'award' | 'nomination' | 'screening';
export interface Laurel { id: string; portfolio_project_id: string; name: string; kind: LaurelKind; year: number | null }

/** A person's own laurels on one of their pieces (the table is private to its owner). */
export async function listLaurels(pieceId: string): Promise<Laurel[]> {
  const { data, error } = await supabase.from('portfolio_laurels').select('id, portfolio_project_id, name, kind, year').eq('portfolio_project_id', pieceId).order('created_at');
  if (error) throw error;
  return (data ?? []) as Laurel[];
}

/** Adds a self-reported laurel to one of the person's own pieces; the database refuses another's piece, a bad kind or year, and a thirteenth. */
export async function addLaurel(pieceId: string, laurel: { name: string; kind: LaurelKind; year: number | null }): Promise<Laurel> {
  const name = laurel.name.trim();
  if (!name) throw new Error('Say which festival or award.');
  const { data, error } = await supabase.from('portfolio_laurels').insert({ portfolio_project_id: pieceId, name, kind: laurel.kind, year: laurel.year }).select('id, portfolio_project_id, name, kind, year').single();
  if (error) throw error;
  return data as Laurel;
}

export async function removeLaurel(id: string): Promise<void> {
  const { data, error } = await supabase.from('portfolio_laurels').delete().eq('id', id).select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('You cannot remove this laurel.');
}
