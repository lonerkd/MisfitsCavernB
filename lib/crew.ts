import { prisma } from './prisma';

export async function assignCrew(
  projectId: string,
  userId: string,
  role: string,
  hourlyRate?: number
) {
  try {
    const existing = await prisma.projectCrew.findFirst({
      where: { project_id: projectId, user_id: userId },
    });

    if (existing) {
      return { success: false, error: 'User already assigned to this project' };
    }

    const crew = await prisma.projectCrew.create({
      data: {
        project_id: projectId,
        user_id: userId,
        role,
        hourly_rate: hourlyRate,
      },
      include: { user: true },
    });

    return { success: true, crew };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getProjectCrew(projectId: string) {
  try {
    const crew = await prisma.projectCrew.findMany({
      where: { project_id: projectId },
      include: { user: true },
      orderBy: { assigned_at: 'asc' },
    });

    return { success: true, crew };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function removeCrew(projectId: string, crewId: string, userId: string) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.creator_id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    await prisma.projectCrew.delete({
      where: { id: crewId },
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateCrewRole(
  projectId: string,
  crewId: string,
  userId: string,
  role: string,
  hourlyRate?: number
) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.creator_id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const crew = await prisma.projectCrew.update({
      where: { id: crewId },
      data: { role, hourly_rate: hourlyRate },
      include: { user: true },
    });

    return { success: true, crew };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
