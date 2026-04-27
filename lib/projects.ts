import { prisma } from './prisma';

export async function createProject(
  creatorId: string,
  title: string,
  description?: string,
  genre?: string,
  budget?: number,
  deadline?: Date
) {
  try {
    const project = await prisma.project.create({
      data: {
        creator_id: creatorId,
        title,
        description,
        genre,
        budget,
        deadline,
        status: 'concept',
        visibility: 'private',
      },
    });
    return { success: true, project };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getProject(projectId: string, userId?: string) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        creator: true,
        scripts: true,
        assets: true,
        crew: { include: { user: true } },
        timeline: { orderBy: { start_date: 'asc' } },
        budget_items: true,
        comments: true,
      },
    });

    if (!project) {
      return { success: false, error: 'Project not found' };
    }

    // Check visibility
    if (project.visibility === 'private' && project.creator_id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    return { success: true, project };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getUserProjects(userId: string) {
  try {
    const projects = await prisma.project.findMany({
      where: { creator_id: userId },
      include: {
        creator: true,
        _count: {
          select: { scripts: true, assets: true, crew: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
    return { success: true, projects };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateProject(
  projectId: string,
  userId: string,
  data: {
    title?: string;
    description?: string;
    status?: string;
    genre?: string;
    budget?: number;
    deadline?: Date;
    visibility?: string;
    cover_image?: string;
    trailer_video?: string;
  }
) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.creator_id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data,
      include: { creator: true, crew: true },
    });

    return { success: true, project: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteProject(projectId: string, userId: string) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.creator_id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    await prisma.project.delete({
      where: { id: projectId },
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPublicProjects(filters?: {
  genre?: string;
  status?: string;
  sortBy?: 'newest' | 'popular' | 'trending';
}) {
  try {
    let orderBy: any = { created_at: 'desc' };
    if (filters?.sortBy === 'popular') {
      orderBy = { likes: 'desc' };
    } else if (filters?.sortBy === 'trending') {
      orderBy = { views: 'desc' };
    }

    const projects = await prisma.project.findMany({
      where: {
        visibility: 'public',
        ...(filters?.genre && { genre: filters.genre }),
        ...(filters?.status && { status: filters.status }),
      },
      include: {
        creator: true,
        _count: {
          select: { scripts: true, assets: true, crew: true },
        },
      },
      orderBy,
      take: 50,
    });

    return { success: true, projects };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
