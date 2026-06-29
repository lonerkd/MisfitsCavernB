import { NextRequest, NextResponse } from 'next/server';
import { createBudgetItem, getProjectBudget, calculateCrewCosts } from '@/lib/budget';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await getProjectBudget(params.id);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const crewCosts = await calculateCrewCosts(params.id);

    return NextResponse.json({
      ...result,
      crew_costs: crewCosts.success ? crewCosts.costs : [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = req.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { category, description, amount } = await req.json();

    const result = await createBudgetItem(params.id, userId, category, description, amount);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.item, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
