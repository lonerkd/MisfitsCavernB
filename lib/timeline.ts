import { prisma } from './prisma';

export async function createTimelineItem(
  projectId: string,
  userId: string,
  phase: string,
  title: string,
  startDate: Date,
  endDate: Date,
  description?: string
) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.creator_id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const timeline = await prisma.timelineItem.create({
      data: {
        project_id: projectId,
        phase,
        title,
        description,
        start_date: startDate,
        end_date: endDate,
      },
    });

    return { success: true, timeline };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getProjectTimeline(projectId: string) {
  try {
    const timeline = await prisma.timelineItem.findMany({
      where: { project_id: projectId },
      orderBy: { start_date: 'asc' },
    });

    return { success: true, timeline };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateTimelineItem(
  timelineId: string,
  userId: string,
  projectId: string,
  data: {
    phase?: string;
    title?: string;
    description?: string;
    start_date?: Date;
    end_date?: Date;
    completion?: number;
  }
) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.creator_id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const timeline = await prisma.timelineItem.update({
      where: { id: timelineId },
      data,
    });

    return { success: true, timeline };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteTimelineItem(
  timelineId: string,
  userId: string,
  projectId: string
) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.creator_id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    await prisma.timelineItem.delete({
      where: { id: timelineId },
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
