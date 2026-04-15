import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyTelegramRequest } from '@/app/utils/telegram-auth';
import { signCustomerToken, generateRefreshToken, hashRefreshToken } from '@/app/utils/customerToken';

const supabaseService = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/user/me
 * Verifies Telegram initData, finds or creates the user profile,
 * and issues a fresh access token + refresh token on every call.
 *
 * Called on every Telegram Mini App open — so the stored session in
 * localStorage is always kept up-to-date. The PWA uses the stored
 * refresh token to silently renew the access token without Telegram.
 */
export async function GET(request: NextRequest) {
    const tgUser = verifyTelegramRequest(request);

    if (!tgUser) {
        return NextResponse.json(
            { error: 'Invalid or missing Telegram authentication data', authenticated: false },
            { status: 401 }
        );
    }

    try {
        // ── 1. Find or create profile ─────────────────────────────────────────
        let { data: profile, error } = await supabaseService
            .from('profiles')
            .select('*')
            .eq('telegram_id', tgUser.telegram_id)
            .maybeSingle();

        if (error) {
            console.error('[User API] Database error:', error.message);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        if (!profile) {
            console.log('[User API] New user detected, creating profile:', tgUser.telegram_id);
            const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ');

            const { data: newProfile, error: createError } = await supabaseService
                .from('profiles')
                .insert({
                    telegram_id: tgUser.telegram_id,
                    full_name: fullName || 'Telegram User',
                    username: tgUser.username,
                    role: 'customer',
                })
                .select()
                .single();

            if (createError) {
                console.error('[User API] Error creating profile:', createError.message);
                return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
            }
            profile = newProfile;
        } else if (tgUser.username && profile.username !== tgUser.username) {
            await supabaseService
                .from('profiles')
                .update({ username: tgUser.username })
                .eq('telegram_id', tgUser.telegram_id);
        }

        // ── 2. Issue tokens ───────────────────────────────────────────────────
        const rawRefreshToken = generateRefreshToken();
        const [accessToken, refreshTokenHash] = await Promise.all([
            signCustomerToken(profile.id),
            hashRefreshToken(rawRefreshToken),
        ]);

        // Replace any existing refresh tokens for this profile (one active token per user).
        // This keeps the table clean and ensures the PWA always has the latest token
        // after the user opens the Mini App.
        await supabaseService
            .from('customer_refresh_tokens')
            .delete()
            .eq('profile_id', profile.id);

        await supabaseService
            .from('customer_refresh_tokens')
            .insert({
                profile_id: profile.id,
                token_hash: refreshTokenHash,
                expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            });

        // ── 3. Return ─────────────────────────────────────────────────────────
        return NextResponse.json({
            authenticated: true,
            token: accessToken,
            refreshToken: rawRefreshToken,
            user: {
                id: profile.id,
                full_name: profile.full_name,
                phone_number: profile.phone_number,
                telegram_id: profile.telegram_id,
                username: profile.username,
                role: profile.role,
                coins: profile.coins || 0,
                has_phone: !!profile.phone_number,
            },
        });

    } catch (err: any) {
        console.error('[User API] Internal error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
