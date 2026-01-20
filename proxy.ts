import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    // Fail-safe: If keys are missing, don't crash the whole app.
    // Just log a warning and let the request proceed (though auth checks will be skipped)
    if (!supabaseUrl || !supabaseKey) {
        console.error('[Middleware] CRITICAL: Supabase URL or Key is missing from environment variables!');
        return response;
    }

    const isPathAdmin = request.nextUrl.pathname.startsWith('/admin');
    const cookieName = isPathAdmin ? 'sb-admin-token' : 'sb-access-token';

    const supabase = createServerClient(
        supabaseUrl,
        supabaseKey,
        {
            cookieOptions: {
                name: cookieName,
                path: '/',
            },
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const ADMIN_EMAIL = 'moida.buvayda@gmail.com';
    const isAdmin = user?.email === ADMIN_EMAIL;
    const isPathLogin = request.nextUrl.pathname.includes('/login');

    // PROTECT /admin routes: Only the specific admin email can enter
    if (isPathAdmin && !isPathLogin) {
        if (!user || !isAdmin) {
            console.log(`[Middleware] Unauthorized attempt to /admin: ${user?.email || 'Guest'}`);
            // If they are logged in with a wrong email, they go back to store
            // If they are not logged in at all, they go to admin login
            return NextResponse.redirect(new URL(user ? '/profil' : '/admin/login', request.url));
        }
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
