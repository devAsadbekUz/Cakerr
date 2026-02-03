import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Only one admin - hardcode for performance
const OWNER_EMAIL = 'moida.buvayda@gmail.com'.toLowerCase();

export async function middleware(request: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return NextResponse.next();
    }

    // Allow login page without auth
    if (request.nextUrl.pathname === '/admin/login') {
        return NextResponse.next();
    }

    let response = NextResponse.next({
        request: { headers: request.headers },
    });

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                response = NextResponse.next({ request: { headers: request.headers } });
                cookiesToSet.forEach(({ name, value, options }) =>
                    response.cookies.set(name, value, options)
                );
            },
        },
    });

    // Single auth call - verify once
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        if (request.nextUrl.pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    // Simple owner check - no database query!
    const userEmail = (user.email || '').toLowerCase().trim();
    const metadataEmail = (user.user_metadata?.email || '').toLowerCase().trim();
    const isOwner = userEmail === OWNER_EMAIL || metadataEmail === OWNER_EMAIL;

    if (!isOwner) {
        if (request.nextUrl.pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        return NextResponse.redirect(
            new URL(`/admin/login?error=unauthorized&active_email=${userEmail || metadataEmail}`, request.url)
        );
    }

    // Pass admin verification to downstream API routes via header
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-admin-verified', 'true');
    requestHeaders.set('x-admin-user-id', user.id);

    return NextResponse.next({
        request: { headers: requestHeaders },
    });
}

// FIX 2: Only match admin paths - no middleware for client pages!
export const config = {
    matcher: [
        '/admin/:path*',
        '/api/admin/:path*',
    ],
};
