import { prisma } from './prisma';

export async function getPublicPortfolios(filters?: {
  specialty?: string;
  location?: string;
  tier?: string;
}) {
  try {
    const creators = await prisma.user.findMany({
      where: {
        ...(filters?.specialty && { specialty: { contains: filters.specialty } }),
        ...(filters?.location && { location: filters.location }),
        ...(filters?.tier && { tier: filters.tier }),
      },
      include: {
        projects: {
          where: { visibility: 'public' },
          take: 3,
        },
        _count: {
          select: { followers_count: true, projects: true },
        },
      },
      take: 50,
      orderBy: { followers_count: 'desc' },
    });

    return { success: true, creators };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getTrendingProjects() {
  try {
    const projects = await prisma.project.findMany({
      where: { visibility: 'public' },
      include: { creator: true },
      orderBy: { views: 'desc' },
      take: 20,
    });

    return { success: true, projects };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPopularProjects() {
  try {
    const projects = await prisma.project.findMany({
      where: { visibility: 'public' },
      include: { creator: true },
      orderBy: { likes: 'desc' },
      take: 20,
    });

    return { success: true, projects };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function searchProjects(query: string) {
  try {
    const projects = await prisma.project.findMany({
      where: {
        visibility: 'public',
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { genre: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: { creator: true },
      take: 30,
    });

    return { success: true, projects };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getFeaturedProjects() {
  try {
    const projects = await prisma.project.findMany({
      where: { featured: true, visibility: 'public' },
      include: { creator: true },
      orderBy: { created_at: 'desc' },
    });

    return { success: true, projects };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
