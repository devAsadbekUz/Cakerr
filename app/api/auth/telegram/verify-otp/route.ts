import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { signCustomerToken, generateRefreshToken, hashRefreshToken } from '@/app/utils/customerToken';

/**
 * POST /api/auth/telegram/verify-otp
 * Verify OTP code and create a proper JWT session (access token + refresh token).
 */
export async function POST(request: NextRequest) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        const { phone, code } = await request.json();

        if (!phone || !code) {
            return NextResponse.json({ error: 'Phone and code required' }, { status: 400 });
        }

        // ── 1. Normalize phone ────────────────────────────────────────────────
        let normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');
        if (normalizedPhone.startsWith('+998')) {
            // already correct
        } else if (normalizedPhone.startsWith('998')) {
            normalizedPhone = '+' + normalizedPhone;
        } else if (normalizedPhone.startsWith('8')) {
            normalizedPhone = '+998' + normalizedPhone.slice(1);
        } else {
            normalizedPhone = '+998' + normalizedPhone;
        }

        // ── 2. Validate OTP code ──────────────────────────────────────────────
        const { data: allCodes, error: allError } = await supabase
            .from('telegram_otp_codes')
            .select('*')
            .eq('phone', normalizedPhone);

        if (!allCodes || allCodes.length === 0) {
            console.warn('[OTP Verify] No OTP codes found for phone', {
                phone: normalizedPhone,
                error: allError?.message || null,
            });
            return NextResponse.json({
                error: 'invalid_code',
                message: 'Kod noto\'g\'ri yoki eskirgan. Yangi kod oling.',
            }, { status: 400 });
        }

        const matchingCode = allCodes.find(c => c.code === code);

        if (!matchingCode) {
            return NextResponse.json({
                error: 'invalid_code',
                message: 'Kod noto\'g\'ri yoki eskirgan. Yangi kod oling.',
            }, { status: 400 });
        }

        if (matchingCode.verified) {
            return NextResponse.json({
                error: 'already_used',
                message: 'Bu kod allaqachon ishlatilgan.',
            }, { status: 400 });
        }

        if (new Date(matchingCode.expires_at) < new Date()) {
            return NextResponse.json({
                error: 'expired',
                message: 'Kod eskirgan. Yangi kod oling.',
            }, { status: 400 });
        }

        // ── 3. Mark OTP as used ───────────────────────────────────────────────
        await supabase
            .from('telegram_otp_codes')
            .update({ verified: true })
            .eq('id', matchingCode.id);

        // ── 4. Look up phone → Telegram link ──────────────────────────────────
        const { data: phoneLink } = await supabase
            .from('telegram_phone_links')
            .select('*')
            .eq('phone', normalizedPhone)
            .single();

        if (!phoneLink) {
            return NextResponse.json({
                error: 'no_phone_link',
                message: 'Telefon raqami Telegramga ulanmagan.',
            }, { status: 400 });
        }

        // ── 5. Find or create profile ─────────────────────────────────────────
        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('telegram_id', phoneLink.telegram_id)
            .single();

        let profile;

        if (existingProfile) {
            const { data, error } = await supabase
                .from('profiles')
                .update({ phone_number: normalizedPhone, updated_at: new Date().toISOString() })
                .eq('telegram_id', phoneLink.telegram_id)
                .select()
                .single();

            if (error) {
                console.error('[OTP Verify] Profile update failed:', error.message);
                return NextResponse.json({ error: 'profile_update_failed', message: 'Profil yangilanmadi.' }, { status: 500 });
            }
            profile = data;
        } else {
            const { data, error } = await supabase
                .from('profiles')
                .insert({
                    telegram_id: phoneLink.telegram_id,
                    phone_number: normalizedPhone,
                    full_name: phoneLink.first_name || 'Mijoz',
                    role: 'customer',
                })
                .select()
                .single();

            if (error) {
                console.error('[OTP Verify] Profile create failed:', error.message);
                return NextResponse.json({ error: 'profile_create_failed', message: 'Profil yaratilmadi.' }, { status: 500 });
            }
            profile = data;
        }

        // ── 6. Issue JWT access token + refresh token ─────────────────────────
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

        // ── 7. Clean up ───────────────────────────────────────────────────────
        // Remove used OTP codes
        await supabase
            .from('telegram_otp_codes')
            .delete()
            .eq('phone', normalizedPhone);

        // Remove any legacy telegram_sessions entries for this user
        await supabase
            .from('telegram_sessions')
            .delete()
            .eq('telegram_id', phoneLink.telegram_id);

        // ── 8. Return ─────────────────────────────────────────────────────────
        return NextResponse.json({
            success: true,
            token: accessToken,
            refreshToken: rawRefreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            user: {
                id: profile.id,
                full_name: profile.full_name,
                phone_number: profile.phone_number,
                telegram_id: profile.telegram_id,
                avatar_url: profile.avatar_url,
            },
        });

    } catch (error: any) {
        console.error('[OTP Verify] Server error:', error?.message || error);
        return NextResponse.json({ error: 'server_error', message: 'Server xatosi.' }, { status: 500 });
    }
}
