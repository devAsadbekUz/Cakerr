import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyMagicToken, signCustomerToken, generateRefreshToken, hashRefreshToken } from '@/app/utils/customerToken';

/**
 * POST /api/auth/telegram/magic-login
 * Verify a magic token (short-lived JWT) and issue a proper JWT session (access token + refresh token).
 */
export async function POST(request: NextRequest) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        const { token } = await request.json();

        if (!token) {
            return NextResponse.json({ error: 'Token required' }, { status: 400 });
        }

        // ── 1. Verify Magic Token ─────────────────────────────────────────────
        const profileId = await verifyMagicToken(token);

        if (!profileId) {
            return NextResponse.json({
                error: 'invalid_token',
                message: 'Sehrli havola eskirgan yoki yaroqsiz. Qaytadan urinib ko\'ring.',
            }, { status: 400 });
        }

        // ── 2. Get Profile ────────────────────────────────────────────────────
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', profileId)
            .single();

        if (profileError || !profile) {
            return NextResponse.json({
                error: 'profile_not_found',
                message: 'Profil topilmadi.',
            }, { status: 404 });
        }

        // ── 3. Issue JWT access token + refresh token ─────────────────────────
        const rawRefreshToken = generateRefreshToken();
        const [accessToken, refreshTokenHash] = await Promise.all([
            signCustomerToken(profile.id),
            hashRefreshToken(rawRefreshToken),
        ]);

        // Replace any existing refresh tokens for this user
        await supabase
            .from('customer_refresh_tokens')
            .delete()
            .eq('profile_id', profile.id);

        await supabase
            .from('customer_refresh_tokens')
            .insert({
                profile_id: profile.id,
                token_hash: refreshTokenHash,
                expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            });

        // ── 4. Return Session ─────────────────────────────────────────────────
        return NextResponse.json({
            success: true,
            session: {
                token: accessToken,
                refreshToken: rawRefreshToken,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                user: {
                    id: profile.id,
                    full_name: profile.full_name,
                    phone_number: profile.phone_number,
                    telegram_id: profile.telegram_id,
                    avatar_url: profile.avatar_url,
                }
            }
        });

    } catch (error: any) {
        console.error('[Magic Login] Server error:', error?.message || error);
        return NextResponse.json({ error: 'server_error', message: 'Server xatosi.' }, { status: 500 });
    }
}
