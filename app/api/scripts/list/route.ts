import { NextRequest, NextResponse } from 'next/server';
import { getUserScripts } from '@/lib/scripts';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getUserScripts(userId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.scripts);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
