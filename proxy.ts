import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { flagEnv, routeGate } from '@/lib/flags';

// A flagged route that is off here doesn't exist: the app's 404, never a redirect.
function flagOff(request: NextRequest, path: string) {
  if (path.startsWith('/api/')) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.rewrite(new URL('/__flag-off', request.url), { status: 404 });
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // ── FEATURE FLAGS (lib/flags.ts, ADR 0007) ──────────────────────────
  const gate = routeGate(path, flagEnv());
  if (gate === 'not-found') return flagOff(request, path);
  const flagNeedsAdmin = gate === 'admin-check';

  // ── PUBLIC ROUTES (no auth required) ──────────────────────────────
  const publicPaths = [
    '/',
    '/auth',
    '/api/discord',
    '/api/public',
    '/_next',
    '/favicon.ico',
    '/opengraph-image',
  ];
  if (!flagNeedsAdmin && (publicPaths.some((p) => path === p || path.startsWith(p + '/')) || path.startsWith('/opengraph-image'))) {
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
    '/split',
    '/welcome',
    '/today',
    '/call',
  ];
  const isAdminPath = path.startsWith('/admin');
  const isProtectedPath = protectedPaths.some((p) => path === p || path.startsWith(p + '/'));

  if (!isAdminPath && !isProtectedPath && !flagNeedsAdmin) {
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
    if (flagNeedsAdmin && !isAdminPath && !isProtectedPath) return flagOff(request, path);
    const redirectUrl = new URL('/auth', request.url);
    redirectUrl.searchParams.set('redirect', path);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAdminPath || flagNeedsAdmin) {
    // is_admin is private; get_my_account returns it to its owner only.
    const { data: account } = await supabase.rpc('get_my_account');
    const admin = !!account?.[0]?.is_admin;
    if (flagNeedsAdmin && !admin) return flagOff(request, path);
    if (isAdminPath && !admin) {
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
