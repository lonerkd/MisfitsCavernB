import { NextRequest, NextResponse } from 'next/server';
import { createProject } from '@/lib/projects';

export async function POST(req: NextRequest) {
  try {
    const { userId, title, description, genre, budget, deadline } = await req.json();

    if (!userId || !title) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
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
