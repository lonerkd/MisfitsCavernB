import { NextRequest, NextResponse } from 'next/server';
import { getUserScripts } from '@/lib/scripts';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const pageStr = url.searchParams.get('page');
    const pageSizeStr = url.searchParams.get('pageSize');

    let page = 1;
    let pageSize = 50;

    if (pageStr) {
      const p = parseInt(pageStr, 10);
      if (p > 0) page = p;
    }

    if (pageSizeStr) {
      const ps = parseInt(pageSizeStr, 10);
      if (ps > 0 && ps <= 200) pageSize = ps;
    }

    const result = await getUserScripts(userId, page, pageSize);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
