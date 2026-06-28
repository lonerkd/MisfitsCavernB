import { NextRequest, NextResponse } from 'next/server';
import { createProject } from '@/lib/projects';
import { getAuthenticatedUser, verifyUserOwnership } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
  try {
    const authenticatedUser = await getAuthenticatedUser(req);
    if (!authenticatedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, title, description, genre, budget, deadline } = await req.json();

    if (!userId || !title) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!verifyUserOwnership(userId, authenticatedUser.id)) {
      return NextResponse.json({ error: 'Forbidden: cannot create projects for other users' }, { status: 403 });
    }

    const result = await createProject(
      userId,
      title,
      description,
      genre,
      budget,
      deadline ? new Date(deadline) : undefined
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.project, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
