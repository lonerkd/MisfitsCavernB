import { prisma } from './prisma';
import { parseScript } from './scriptos/parser';

export async function createScript(
  userId: string,
  title: string,
  content: string,
  projectId?: string
) {
  try {
    const parsed = parseScript(content);

    const script = await prisma.script.create({
      data: {
        user_id: userId,
        title,
        content,
        project_id: projectId,
        characters: JSON.stringify(parsed.characters || []),
        scenes: JSON.stringify(parsed.scenes || []),
        page_count: Math.ceil(content.length / 250),
        word_count: content.split(/\s+/).length,
      },
    });

    return { success: true, script };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateScript(
  scriptId: string,
  userId: string,
  data: {
    title?: string;
    content?: string;
    status?: string;
    visibility?: string;
  }
) {
  try {
    // Verify ownership
    const script = await prisma.script.findUnique({
      where: { id: scriptId },
    });

    if (!script || script.user_id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Re-parse if content changed
    let parsedData = {};
    if (data.content) {
      const parsed = parseScript(data.content);
      parsedData = {
        characters: JSON.stringify(parsed.characters || []),
        scenes: JSON.stringify(parsed.scenes || []),
        page_count: Math.ceil(data.content.length / 250),
        word_count: data.content.split(/\s+/).length,
      };
    }

    const updated = await prisma.script.update({
      where: { id: scriptId },
      data: {
        ...data,
        ...parsedData,
      },
    });

    return { success: true, script: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getScript(scriptId: string, userId?: string) {
  try {
    const script = await prisma.script.findUnique({
      where: { id: scriptId },
    });

    if (!script) {
      return { success: false, error: 'Script not found' };
    }

    // Check visibility
    if (script.visibility === 'private' && script.user_id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    return { success: true, script };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getUserScripts(userId: string) {
  try {
    const scripts = await prisma.script.findMany({
      where: { user_id: userId },
      orderBy: { updated_at: 'desc' },
    });

    return { success: true, scripts };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteScript(scriptId: string, userId: string) {
  try {
    const script = await prisma.script.findUnique({
      where: { id: scriptId },
    });

    if (!script || script.user_id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    await prisma.script.delete({
      where: { id: scriptId },
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
