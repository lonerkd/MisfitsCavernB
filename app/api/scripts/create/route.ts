import { NextRequest, NextResponse } from 'next/server';
import { createScript } from '@/lib/scripts';

export async function POST(req: NextRequest) {
  try {
    const { userId, title, content, projectId } = await req.json();

    if (!userId || !title || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await createScript(userId, title, content, projectId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.script, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
