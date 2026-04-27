import { NextRequest, NextResponse } from 'next/server';
import { getPublicPortfolios } from '@/lib/discovery';

export async function GET(req: NextRequest) {
  try {
    const specialty = req.nextUrl.searchParams.get('specialty');
    const location = req.nextUrl.searchParams.get('location');
    const tier = req.nextUrl.searchParams.get('tier');

    const result = await getPublicPortfolios({
      specialty: specialty || undefined,
      location: location || undefined,
      tier: tier || undefined,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json(result.creators);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
