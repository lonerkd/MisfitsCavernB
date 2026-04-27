import { NextRequest, NextResponse } from 'next/server';
import { getCrewDirectory } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const specialty = req.nextUrl.searchParams.get('specialty');
    const location = req.nextUrl.searchParams.get('location');
    const availability = req.nextUrl.searchParams.get('availability');

    const result = await getCrewDirectory({
      specialty: specialty || undefined,
      location: location || undefined,
      availability: availability || undefined,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.users, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
