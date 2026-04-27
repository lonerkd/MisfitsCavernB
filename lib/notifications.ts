import { prisma } from './prisma';

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  content: string,
  relatedId?: string
) {
  try {
    // Store notification as message for now (Phase 4 enhancement)
    const notification = await prisma.message.create({
      data: {
        user_id: userId,
        content: JSON.stringify({
          type,
          title,
          content,
          relatedId,
          timestamp: new Date(),
        }),
      },
    });

    return { success: true, notification };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getUserNotifications(userId: string) {
  try {
    const messages = await prisma.message.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    const notifications = messages.map((msg) => {
      try {
        return JSON.parse(msg.content);
      } catch {
        return { type: 'message', content: msg.content };
      }
    });

    return { success: true, notifications };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function notifyCrewAssignment(
  userId: string,
  projectTitle: string,
  role: string
) {
  return createNotification(
    userId,
    'crew_assignment',
    `You've been assigned to ${projectTitle}`,
    `You've been assigned as ${role}`,
    projectTitle
  );
}

export async function notifyProjectComment(
  userId: string,
  projectTitle: string,
  commenterName: string
) {
  return createNotification(
    userId,
    'project_comment',
    `New comment on ${projectTitle}`,
    `${commenterName} commented on your project`,
    projectTitle
  );
}
