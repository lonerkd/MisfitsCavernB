import { prisma } from './prisma';

export async function createAsset(
  projectId: string,
  userId: string,
  title: string,
  type: string,
  url: string,
  description?: string
) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.creator_id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const asset = await prisma.projectAsset.create({
      data: {
        project_id: projectId,
        title,
        type,
        url,
        description,
      },
    });

    return { success: true, asset };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getProjectAssets(projectId: string, type?: string) {
  try {
    const assets = await prisma.projectAsset.findMany({
      where: {
        project_id: projectId,
        ...(type && { type }),
      },
      orderBy: { created_at: 'desc' },
    });

    return { success: true, assets };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteAsset(
  assetId: string,
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

    await prisma.projectAsset.delete({
      where: { id: assetId },
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAssetsByType(projectId: string) {
  try {
    const assets = await prisma.projectAsset.findMany({
      where: { project_id: projectId },
    });

    const grouped = assets.reduce((acc, asset) => {
      if (!acc[asset.type]) {
        acc[asset.type] = [];
      }
      acc[asset.type].push(asset);
      return acc;
    }, {} as Record<string, typeof assets>);

    return { success: true, grouped };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
