import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyTelegramInitData } from '@/app/utils/telegram-auth';
import { signCustomerToken, generateRefreshToken, hashRefreshToken } from '@/app/utils/customerToken';

export async function POST(request: NextRequest) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        const body = await request.json();
        const { initData, phone, telegramId } = body;

        // ── 1. Verify Telegram signature ──────────────────────────────────────
        const tgUser = verifyTelegramInitData(initData);
        if (!tgUser) {
            return NextResponse.json({ error: 'Invalid Telegram signature' }, { status: 401 });
        }

        if (tgUser.telegram_id !== telegramId) {
            return NextResponse.json({ error: 'Telegram ID mismatch' }, { status: 403 });
        }

        console.log('[TG Auth] Updating phone for:', tgUser.telegram_id, 'Phone:', phone);

        // ── 2. Normalize phone ────────────────────────────────────────────────
        let normalizedPhone = phone.replace(/\s+/g, '');
        if (!normalizedPhone.startsWith('+')) {
            normalizedPhone = '+' + normalizedPhone;
        }

        // ── 3. Upsert profile ─────────────────────────────────────────────────
        const { data: profile, error } = await supabase
            .from('profiles')
            .upsert({
                telegram_id: tgUser.telegram_id,
                phone_number: normalizedPhone,
                full_name: tgUser.first_name + (tgUser.last_name ? ` ${tgUser.last_name}` : ''),
                username: tgUser.username,
                role: 'customer',
                updated_at: new Date().toISOString(),
            }, { onConflict: 'telegram_id' })
            .select()
            .single();

        if (error) {
            console.error('[TG Auth] Profile error:', error);
            throw error;
        }

        // ── 4. Clean up legacy sessions ───────────────────────────────────────
        await supabase
            .from('telegram_sessions')
            .delete()
            .eq('telegram_id', tgUser.telegram_id);

        // ── 5. Issue tokens ───────────────────────────────────────────────────
        const rawRefreshToken = generateRefreshToken();
        const [accessToken, refreshTokenHash] = await Promise.all([
            signCustomerToken(profile.id),
            hashRefreshToken(rawRefreshToken),
        ]);

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

        // ── 6. Return ─────────────────────────────────────────────────────────
        return NextResponse.json({
            success: true,
            token: accessToken,
            refreshToken: rawRefreshToken,
            user: {
                id: profile.id,
                full_name: profile.full_name,
                phone_number: profile.phone_number,
                telegram_id: profile.telegram_id,
                has_phone: true,
            },
        });

    } catch (error: any) {
        console.error('[TG Auth] Error:', error);
        return NextResponse.json({ error: error.message || 'Authentication failed' }, { status: 500 });
    }
}
