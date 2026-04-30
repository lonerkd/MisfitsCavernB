import { supabase } from '@/lib/supabase/client';

export interface MediaItem {
  id: string;
  title: string;
  type: 'youtube' | 'gdrive' | 'image';
  url: string;
  thumbnailUrl?: string;
  duration?: number;
}

export interface PortfolioProject {
  id: string;
  title: string;
  description: string;
  category: string;
  year: number;
  role: string;
  accentColor: string;
  media: MediaItem[];
  shareToken: string;
  createdAt: string;
  updatedAt: string;
}

// Get all portfolio projects (from the 'projects' table)
export async function getAllProjects(): Promise<PortfolioProject[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('projects')
    .select('*, project_assets(*)')
    .eq('creator_id', user.id);

  if (error) {
    console.error('Error loading portfolio:', error);
    return [];
  }

  return (data || []).map(p => ({
    id: p.id,
    title: p.title,
    description: p.description || '',
    category: p.genre || 'Other',
    year: new Date(p.created_at).getFullYear(),
    role: 'Creator',
    accentColor: p.accent_color || '#ff3c00',
    media: (p.project_assets || []).map((a: any) => ({
      id: a.id,
      title: a.title,
      type: a.type as any,
      url: a.url
    })),
    shareToken: p.id,
    createdAt: p.created_at,
    updatedAt: p.updated_at
  }));
}

// Get project by ID
export async function getProject(id: string): Promise<PortfolioProject | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*, project_assets(*)')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    title: data.title,
    description: data.description || '',
    category: data.genre || 'Other',
    year: new Date(data.created_at).getFullYear(),
    role: 'Creator',
    accentColor: data.accent_color || '#ff3c00',
    media: (data.project_assets || []).map((a: any) => ({
      id: a.id,
      title: a.title,
      type: a.type as any,
      url: a.url
    })),
    shareToken: data.id,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

// Create new project
export async function createProject(title: string): Promise<PortfolioProject | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('projects')
    .insert([{
      title,
      creator_id: user.id,
      status: 'concept',
      visibility: 'public'
    }])
    .select()
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    title: data.title,
    description: data.description || '',
    category: data.genre || 'Other',
    year: new Date(data.created_at).getFullYear(),
    role: 'Creator',
    accentColor: data.accent_color || '#ff3c00',
    media: [],
    shareToken: data.id,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

// Update project
export async function updateProject(id: string, updates: Partial<PortfolioProject>): Promise<boolean> {
  const { error } = await supabase
    .from('projects')
    .update({
      title: updates.title,
      description: updates.description,
      genre: updates.category,
      accent_color: updates.accentColor
    })
    .eq('id', id);

  return !error;
}

// Delete project
export async function deleteProject(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id);

  return !error;
}

// Media handling
export async function addMedia(projectId: string, media: Omit<MediaItem, 'id'>): Promise<MediaItem | null> {
  const { data, error } = await supabase
    .from('project_assets')
    .insert([{
      project_id: projectId,
      title: media.title,
      type: media.type,
      url: media.url
    }])
    .select()
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    title: data.title,
    type: data.type as any,
    url: data.url
  };
}

export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}
