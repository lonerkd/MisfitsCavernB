import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

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
  const isAdminPath = path.startsWith('/admin');
  const isProtectedPath = protectedPaths.some((p) => path === p || path.startsWith(p + '/'));

  // Everything else (p/, s/, showcase, etc.) is open — skip the auth work.
  if (!isAdminPath && !isProtectedPath) {
    return NextResponse.next();
  }

  // Validate the session for real (not just cookie presence). The browser
  // client is cookie-backed via @supabase/ssr, so createServerClient can read
  // and refresh it here; getUser() verifies the JWT against Supabase Auth,
  // so a forged or expired cookie fails.
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const redirectUrl = new URL('/auth', request.url);
    redirectUrl.searchParams.set('redirect', path);
    return NextResponse.redirect(redirectUrl);
  }

  // ── ADMIN ROUTES: verify is_admin server-side, not just in the UI ─
  if (isAdminPath) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();
    if (!profile?.is_admin) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return response;
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
