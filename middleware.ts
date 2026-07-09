import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // ── PUBLIC ROUTES (no auth required) ──────────────────────────────
  const publicPaths = [
    '/',
    '/auth',
    '/api/discord',
    '/api/public',
    '/_next',
    '/favicon.ico',
  ];
  if (publicPaths.some((p) => path === p || path.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  // Only redirect if there are ZERO Supabase auth cookies.
  // The SSR createServerClient + getSession() pattern fails in Vercel's
  // Edge Runtime because the cookie format differs from what the browser
  // client sets. If cookies exist, trust that the client-side auth
  // (useRequireAuth / supabase.auth.getUser) will handle validation.
  const hasAuthCookies = request.cookies.getAll().some(
    (c) => c.name.includes('sb-') && c.name.includes('auth-token'),
  );

  // ── ADMIN ROUTES ──────────────────────────────────────────────────
  if (path.startsWith('/admin')) {
    if (!hasAuthCookies) {
      const redirectUrl = new URL('/auth', request.url);
      redirectUrl.searchParams.set('redirect', path);
      return NextResponse.redirect(redirectUrl);
    }
    // Client-side ProtectedPage component will verify is_admin
    return NextResponse.next();
  }

  // ── PROTECTED ROUTES (require auth) ──────────────────────────────
  const protectedPaths = [
    '/editor',
    '/lounge',
    '/studio',
    '/projects',
    '/crew',
    '/jobs',
    '/portfolio',
    '/profile',
    '/settings',
    '/soundtrack',
  ];
  if (protectedPaths.some((p) => path === p || path.startsWith(p + '/'))) {
    if (!hasAuthCookies) {
      const redirectUrl = new URL('/auth', request.url);
      redirectUrl.searchParams.set('redirect', path);
      return NextResponse.redirect(redirectUrl);
    }
    return NextResponse.next();
  }

  // ── DEFAULT: allow through (p/, s/, showcase, etc.) ──────────────
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static assets (svg, png, jpg, jpeg, gif, webp, css, js)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|woff2?|ttf|eot)$).*)',
  ],
};