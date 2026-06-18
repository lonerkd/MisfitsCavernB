import { supabase } from './client';
import { logActivity } from './activity';

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

export async function getPortfolioProjectBySource(userId: string, sourceProjectId: string) {
  const { data, error } = await supabase
    .from('portfolio_projects')
    .select('*, portfolio_media(*)')
    .eq('user_id', userId)
    .eq('source_project_id', sourceProjectId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// The interconnection: a completed Studio project publishes a real portfolio
// entry pulling its real title/description/references — not a separate
// re-entered listing — and remembers source_project_id so this only fires once.
export async function publishProjectToPortfolio(
  userId: string,
  sourceProject: { id: string; title: string; description?: string | null; project_type?: string | null },
  mediaItems: { title: string; url: string; media_type: 'youtube' | 'gdrive' | 'image' }[]
) {
  const created = await createPortfolioProject({
    user_id: userId,
    title: sourceProject.title,
    description: sourceProject.description || null,
    category: sourceProject.project_type || null,
    year: new Date().getFullYear(),
    source_project_id: sourceProject.id,
  });

  const media = [];
  for (const m of mediaItems) {
    media.push(await addPortfolioMedia({ project_id: created.id, ...m }));
  }

  await logActivity(userId, 'published_to_portfolio', 'portfolio_project', created.id, { source_project_id: sourceProject.id, title: sourceProject.title });

  return { ...created, portfolio_media: media };
}

