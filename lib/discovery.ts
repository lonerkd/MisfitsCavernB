import { supabaseAdmin } from '@/lib/supabase/server';

export async function getPublicPortfolios(filters?: {
  specialty?: string;
  location?: string;
  tier?: string;
}) {
  try {
    let query = supabaseAdmin
      .from('profiles')
      .select('id, username, avatar_url, bio, location, role, status')
      .limit(50);

    if (filters?.location) {
      query = query.eq('location', filters.location);
    }
    if (filters?.tier) {
      query = query.eq('role', filters.tier);
    }

    const { data: creators, error } = await query;

    if (error) return { success: false, error: error.message };
    return { success: true, creators };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getTrendingProjects() {
  try {
    const { data: projects, error } = await supabaseAdmin
      .from('projects')
      .select('*, profiles(*)')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) return { success: false, error: error.message };
    return { success: true, projects };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPopularProjects() {
  try {
    const { data: projects, error } = await supabaseAdmin
      .from('projects')
      .select('*, profiles(*)')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) return { success: false, error: error.message };
    return { success: true, projects };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function searchProjects(query: string) {
  try {
    const { data: projects, error } = await supabaseAdmin
      .from('projects')
      .select('*, profiles(*)')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(30);

    if (error) return { success: false, error: error.message };
    return { success: true, projects };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getFeaturedProjects() {
  try {
    // No 'featured' column in deployed schema — return newest projects as featured
    const { data: projects, error } = await supabaseAdmin
      .from('projects')
      .select('*, profiles(*)')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) return { success: false, error: error.message };
    return { success: true, projects };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
