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

  if (!isAdminPath && !isProtectedPath) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    // createServerClient throws on missing URL/key with no fallback (unlike
    // lib/supabase/client.ts's browser client) — every protected-path
    // request would crash the middleware instead of failing safe. Redirect
    // to /auth, matching the no-session outcome, rather than 500ing.
    console.error('Middleware: missing Supabase env vars, redirecting to /auth');
    const redirectUrl = new URL('/auth', request.url);
    redirectUrl.searchParams.set('redirect', path);
    return NextResponse.redirect(redirectUrl);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
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

    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|woff2?|ttf|eot)$).*)',
  ],
};
