import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { verifyStaffToken } from './app/utils/adminStaffToken';

const OWNER_EMAIL = process.env.ADMIN_EMAIL
    ? process.env.ADMIN_EMAIL.toLowerCase()
    : 'moida.buvayda@gmail.com'.toLowerCase();

// Maps a pathname to the permission slug required to access it.
// Returns 'owner_only' for paths that are always restricted to the owner.
// Returns null for paths with no restriction (e.g. login).
function requiredPermission(pathname: string): string | null {
    if (pathname === '/admin' || pathname === '/admin/') return 'dashboard';
    if (pathname.startsWith('/admin/roles') || pathname.startsWith('/api/admin/staff')) return 'owner_only';
    if (pathname.startsWith('/admin/orders') || pathname.startsWith('/api/admin/orders')) return 'orders';
    if (pathname.startsWith('/admin/pos') || pathname.startsWith('/api/admin/pos')) return 'pos';
    if (pathname.startsWith('/admin/products') || pathname.startsWith('/api/admin/products')) return 'products';
    if (pathname.startsWith('/admin/categories') || pathname.startsWith('/api/admin/categories')) return 'categories';
    if (pathname.startsWith('/admin/schedule') || pathname.startsWith('/api/admin/schedule')) return 'schedule';
    if (pathname.startsWith('/admin/loyalty') || pathname.startsWith('/api/admin/loyalty')) return 'loyalty';
    if (pathname.startsWith('/admin/messages') || pathname.startsWith('/api/admin/messages')) return 'messages';
    if (pathname.startsWith('/admin/custom') || pathname.startsWith('/api/admin/custom')) return 'custom';
    if (pathname.startsWith('/admin/settings') || pathname.startsWith('/api/admin/settings')) return 'settings';
    // /api/admin/data is a shared generic endpoint used by all admin pages — no per-permission guard here
    return null;
}

// First page the staff user is allowed to visit (used for redirects).
function firstAllowedPage(permissions: string[]): string {
    const order = ['dashboard', 'orders', 'pos', 'products', 'categories', 'schedule', 'custom', 'loyalty', 'messages', 'settings'];
    const paths: Record<string, string> = {
        dashboard: '/admin', orders: '/admin/orders', pos: '/admin/pos',
        categories: '/admin/categories', schedule: '/admin/schedule', custom: '/admin/custom',
        loyalty: '/admin/loyalty', messages: '/admin/messages', settings: '/admin/settings',
    };
    for (const slug of order) {
        if (permissions.includes(slug)) return paths[slug];
    }
    return '/admin/login';
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow login endpoints through without auth
    if (pathname === '/admin/login') return NextResponse.next();
    if (pathname === '/api/admin/auth/staff') return NextResponse.next();
    if (pathname === '/api/admin/auth/staff/logout') return NextResponse.next();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    // ── 1. Staff token check ──────────────────────────────────────────────────
    const staffToken = request.cookies.get('admin_staff_token')?.value;
    if (staffToken && supabaseUrl && supabaseKey) {
        const payload = await verifyStaffToken(staffToken);
        if (payload) {
            const perm = requiredPermission(pathname);

            // Roles page and staff CRUD API are always owner-only
            if (perm === 'owner_only') {
                if (pathname.startsWith('/api/')) {
                    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
                }
                return NextResponse.redirect(new URL(firstAllowedPage(payload.permissions), request.url));
            }

            // Check if staff has permission for this path
            if (perm && !payload.permissions.includes(perm)) {
                if (pathname.startsWith('/api/')) {
                    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
                }
                return NextResponse.redirect(new URL(firstAllowedPage(payload.permissions), request.url));
            }

            // Allowed — pass through with role headers
            const reqHeaders = new Headers(request.headers);
            reqHeaders.set('x-admin-verified', 'true');
            reqHeaders.set('x-admin-role', 'staff');
            reqHeaders.set('x-admin-user-id', payload.id);
            reqHeaders.set('x-admin-username', payload.username);
            reqHeaders.set('x-admin-permissions', payload.permissions.join(','));
            return NextResponse.next({ request: { headers: reqHeaders } });
        }
        // Token invalid/expired — fall through to Supabase owner check
    }

    // ── 2. Owner (Supabase) check ─────────────────────────────────────────────
    if (!supabaseUrl || !supabaseKey) return NextResponse.next();

    let response = NextResponse.next({ request: { headers: request.headers } });

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
            getAll() { return request.cookies.getAll(); },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                response = NextResponse.next({ request: { headers: request.headers } });
                cookiesToSet.forEach(({ name, value, options }) =>
                    response.cookies.set(name, value, options)
                );
            },
        },
    });

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    const userEmail = (user.email || '').toLowerCase().trim();
    const metaEmail = (user.user_metadata?.email || '').toLowerCase().trim();
    const isOwner = userEmail === OWNER_EMAIL || metaEmail === OWNER_EMAIL;

    if (!isOwner) {
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        return NextResponse.redirect(
            new URL(`/admin/login?error=unauthorized&active_email=${userEmail || metaEmail}`, request.url)
        );
    }

    // Owner — pass headers + set admin_role cookie for client-side UI
    const reqHeaders = new Headers(request.headers);
    reqHeaders.set('x-admin-verified', 'true');
    reqHeaders.set('x-admin-role', 'owner');
    reqHeaders.set('x-admin-user-id', user.id);
    reqHeaders.set('x-admin-username', 'Owner');

    const ownerResponse = NextResponse.next({ request: { headers: reqHeaders } });
    // Keep Supabase cookies
    response.cookies.getAll().forEach(c => ownerResponse.cookies.set(c.name, c.value));
    // Set non-HTTP-only role cookie for sidebar
    const isProd = process.env.NODE_ENV === 'production';
    // Set admin_verified cookie as a fallback for the Layout rendering if headers are inconsistent
    ownerResponse.cookies.set('x-admin-verified', 'true', {
        httpOnly: false, sameSite: 'lax', path: '/',
        maxAge: 7 * 24 * 60 * 60, secure: isProd,
    });
    ownerResponse.cookies.set('admin_role', 'owner', {
        httpOnly: false, sameSite: 'lax', path: '/',
        maxAge: 7 * 24 * 60 * 60, secure: isProd,
    });
    return ownerResponse;
}

export const config = {
    matcher: ['/admin/:path*', '/api/admin/:path*'],
};
