import { NextRequest, NextResponse } from 'next/server';
import { searchProjects } from '@/lib/discovery';

export async function GET(req: NextRequest) {
  try {
    const query = req.nextUrl.searchParams.get('q');
    if (!query) {
      return NextResponse.json({ error: 'Query required' }, { status: 400 });
    }

    const result = await searchProjects(query);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json(result.projects);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
