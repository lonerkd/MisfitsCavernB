import { NextRequest, NextResponse } from 'next/server';
import { getTrendingProjects } from '@/lib/discovery';

export async function GET(req: NextRequest) {
  try {
    const result = await getTrendingProjects();
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json(result.projects);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
