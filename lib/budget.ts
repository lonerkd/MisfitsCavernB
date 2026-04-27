import { prisma } from './prisma';

export async function createBudgetItem(
  projectId: string,
  userId: string,
  category: string,
  description: string,
  amount: number
) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.creator_id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const item = await prisma.budgetItem.create({
      data: {
        project_id: projectId,
        category,
        description,
        amount,
      },
    });

    return { success: true, item };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getProjectBudget(projectId: string) {
  try {
    const items = await prisma.budgetItem.findMany({
      where: { project_id: projectId },
      orderBy: { created_at: 'desc' },
    });

    const totalBudgeted = items.reduce((sum, item) => sum + item.amount, 0);
    const totalActual = items.reduce((sum, item) => sum + (item.actual_cost || 0), 0);

    return {
      success: true,
      items,
      summary: {
        totalBudgeted,
        totalActual,
        remaining: totalBudgeted - totalActual,
        percentUsed: totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateBudgetItem(
  itemId: string,
  userId: string,
  projectId: string,
  data: {
    category?: string;
    description?: string;
    amount?: number;
    actual_cost?: number;
  }
) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.creator_id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const item = await prisma.budgetItem.update({
      where: { id: itemId },
      data,
    });

    return { success: true, item };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteBudgetItem(
  itemId: string,
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

    await prisma.budgetItem.delete({
      where: { id: itemId },
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function calculateCrewCosts(projectId: string) {
  try {
    const crew = await prisma.projectCrew.findMany({
      where: { project_id: projectId },
    });

    const costs = crew
      .filter((c) => c.hourly_rate)
      .map((c) => ({
        role: c.role,
        hourlyRate: c.hourly_rate,
        estimatedMonthCost: (c.hourly_rate || 0) * 160, // 160 hours/month
      }));

    const totalMonthly = costs.reduce((sum, c) => sum + c.estimatedMonthCost, 0);

    return { success: true, costs, totalMonthly };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
