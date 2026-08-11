import { NextRequest, NextResponse } from 'next/server';

const SECRET = process.env.BYPASS_AUTH_SECRET;
const COOKIE = 'dev_bypass';

// Only active when BYPASS_AUTH_SECRET is set in the environment.
// GET /api/dev/bypass?secret=<value>  → sets the bypass cookie
// GET /api/dev/bypass?clear=1         → clears the bypass cookie
export async function GET(req: NextRequest) {
  if (!SECRET) {
    return NextResponse.json({ error: 'Dev bypass not configured.' }, { status: 404 });
  }

  const { searchParams } = req.nextUrl;

  if (searchParams.get('clear')) {
    const res = NextResponse.json({ ok: true, cleared: true });
    res.cookies.delete(COOKIE);
    return res;
  }

  if (searchParams.get('secret') !== SECRET) {
    return NextResponse.json({ error: 'Invalid secret.' }, { status: 403 });
  }

  const redirect = searchParams.get('redirect') || '/projects';
  const res = NextResponse.redirect(new URL(redirect, req.url));
  res.cookies.set(COOKIE, SECRET, {
    httpOnly: true,
    sameSite: 'lax',
    // No maxAge → session cookie; clears on browser close.
    path: '/',
  });
  return res;
}
