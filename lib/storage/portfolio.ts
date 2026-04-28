const PORTFOLIO_KEY = 'misfits_cavern_portfolio';

export interface MediaItem {
  id: string;
  title: string;
  type: 'youtube' | 'gdrive' | 'image';
  url: string;
  thumbnailUrl?: string;
  duration?: number;
  chapters?: { timestamp: number; title: string }[];
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

export function getAllProjects(): PortfolioProject[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(PORTFOLIO_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading portfolio:', error);
    return [];
  }
}

export function getProject(id: string): PortfolioProject | null {
  const projects = getAllProjects();
  return projects.find(p => p.id === id) || null;
}

export function createProject(title: string): PortfolioProject {
  const newProject: PortfolioProject = {
    id: generateId(),
    title,
    description: '',
    category: 'Other',
    year: new Date().getFullYear(),
    role: 'Creator',
    accentColor: '#' + Math.floor(Math.random() * 16777215).toString(16),
    media: [],
    shareToken: generateShareToken(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const projects = getAllProjects();
  projects.push(newProject);
  localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(projects));

  return newProject;
}

export function updateProject(id: string, updates: Partial<PortfolioProject>): PortfolioProject {
  const projects = getAllProjects();
  const index = projects.findIndex(p => p.id === id);

  if (index === -1) throw new Error('Project not found');

  const updated = {
    ...projects[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  projects[index] = updated;
  localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(projects));

  return updated;
}

export function deleteProject(id: string): boolean {
  const projects = getAllProjects();
  const filtered = projects.filter(p => p.id !== id);

  if (filtered.length === projects.length) return false;

  localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(filtered));
  return true;
}

export function addMedia(projectId: string, media: Omit<MediaItem, 'id'>): MediaItem {
  const project = getProject(projectId);
  if (!project) throw new Error('Project not found');

  const mediaItem: MediaItem = {
    id: generateId(),
    ...media
  };

  project.media.push(mediaItem);
  updateProject(projectId, { media: project.media });

  return mediaItem;
}

export function updateMedia(projectId: string, mediaId: string, updates: Partial<MediaItem>): MediaItem {
  const project = getProject(projectId);
  if (!project) throw new Error('Project not found');

  const media = project.media.find(m => m.id === mediaId);
  if (!media) throw new Error('Media not found');

  const updated = { ...media, ...updates };
  project.media = project.media.map(m => (m.id === mediaId ? updated : m));
  updateProject(projectId, { media: project.media });

  return updated;
}

export function deleteMedia(projectId: string, mediaId: string): void {
  const project = getProject(projectId);
  if (!project) throw new Error('Project not found');

  project.media = project.media.filter(m => m.id !== mediaId);
  updateProject(projectId, { media: project.media });
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

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateShareToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
