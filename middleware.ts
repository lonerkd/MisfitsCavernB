import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh the session cookie on every request
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    return supabaseResponse;
  }

  // ── ADMIN ROUTES (require auth + admin role) ─────────────────────
  if (path.startsWith('/admin')) {
    if (!user) {
      const redirectUrl = new URL('/auth', request.url);
      redirectUrl.searchParams.set('redirect', path);
      return NextResponse.redirect(redirectUrl);
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    return supabaseResponse;
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
    if (!user) {
      const redirectUrl = new URL('/auth', request.url);
      redirectUrl.searchParams.set('redirect', path);
      return NextResponse.redirect(redirectUrl);
    }
    return supabaseResponse;
  }

  // ── DEFAULT: allow through (p/, s/, showcase, etc.) ──────────────
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static assets (svg, png, jpg, jpeg, gif, webp, css, js)
     * - spotify playlist embed assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|woff2?|ttf|eot)$).*)',
  ],
};