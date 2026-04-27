import { prisma } from './prisma';

export async function createComment(
  projectId: string,
  userId: string,
  content: string
) {
  try {
    const comment = await prisma.projectComment.create({
      data: {
        project_id: projectId,
        user_id: userId,
        content,
      },
    });

    return { success: true, comment };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getProjectComments(projectId: string) {
  try {
    const comments = await prisma.projectComment.findMany({
      where: { project_id: projectId },
      orderBy: { created_at: 'desc' },
    });

    return { success: true, comments };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateComment(
  commentId: string,
  userId: string,
  content: string
) {
  try {
    const comment = await prisma.projectComment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.user_id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const updated = await prisma.projectComment.update({
      where: { id: commentId },
      data: { content, is_edited: true },
    });

    return { success: true, comment: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteComment(commentId: string, userId: string) {
  try {
    const comment = await prisma.projectComment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.user_id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    await prisma.projectComment.delete({
      where: { id: commentId },
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
