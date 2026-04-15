import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { signCustomerToken, hashRefreshToken } from '@/app/utils/customerToken';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/auth/refresh
 * Exchange a valid refresh token for a new 7-day access token.
 * Called silently by the PWA when the stored access token has expired.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { refreshToken } = body;

        if (!refreshToken || typeof refreshToken !== 'string') {
            return NextResponse.json({ error: 'Missing refresh token' }, { status: 400 });
        }

        const tokenHash = await hashRefreshToken(refreshToken);

        const { data, error } = await supabase
            .from('customer_refresh_tokens')
            .select('profile_id, expires_at, revoked_at')
            .eq('token_hash', tokenHash)
            .maybeSingle();

        if (error) {
            console.error('[Auth Refresh] DB error:', error.message);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }

        if (!data) {
            return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
        }

        if (data.revoked_at) {
            return NextResponse.json({ error: 'Refresh token has been revoked' }, { status: 401 });
        }

        if (new Date(data.expires_at) < new Date()) {
            return NextResponse.json({ error: 'Refresh token has expired' }, { status: 401 });
        }

        const accessToken = await signCustomerToken(data.profile_id);
        return NextResponse.json({ token: accessToken });

    } catch (err: any) {
        console.error('[Auth Refresh] Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * DELETE /api/auth/refresh
 * Revoke a refresh token (logout). Marks it in the DB so it can never
 * be used again, even if it hasn't expired yet.
 */
export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json();
        const { refreshToken } = body;

        if (!refreshToken || typeof refreshToken !== 'string') {
            return NextResponse.json({ error: 'Missing refresh token' }, { status: 400 });
        }

        const tokenHash = await hashRefreshToken(refreshToken);

        await supabase
            .from('customer_refresh_tokens')
            .update({ revoked_at: new Date().toISOString() })
            .eq('token_hash', tokenHash);

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error('[Auth Refresh] Revoke error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
