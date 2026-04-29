import { supabase } from './client';

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
  const { data, error } = await supabase.from('portfolio_media').insert(media).select().single();
  if (error) throw error;
  return data;
}
