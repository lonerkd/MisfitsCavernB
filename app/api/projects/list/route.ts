import { NextRequest, NextResponse } from 'next/server';
import { getUserProjects, getPublicProjects } from '@/lib/projects';

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    const isPublic = req.nextUrl.searchParams.get('public') === 'true';
    const genre = req.nextUrl.searchParams.get('genre');
    const sortBy = req.nextUrl.searchParams.get('sort') as any;

    if (isPublic) {
      const result = await getPublicProjects({ genre: genre || undefined, sortBy });
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
      return NextResponse.json(result.projects);
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getUserProjects(userId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.projects);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
