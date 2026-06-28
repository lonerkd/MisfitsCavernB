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
