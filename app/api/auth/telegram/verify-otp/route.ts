import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

/**
 * POST /api/auth/telegram/verify-otp
 * Verify OTP code and create session
 */
export async function POST(request: NextRequest) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        const { phone, code } = await request.json();

        if (!phone || !code) {
            return NextResponse.json({ error: 'Phone and code required', debug: 'Missing input' }, { status: 400 });
        }

        // Normalize phone number to +998XXXXXXXXX format
        let normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');
        if (normalizedPhone.startsWith('+998')) {
            // Already correct
        } else if (normalizedPhone.startsWith('998')) {
            normalizedPhone = '+' + normalizedPhone;
        } else if (normalizedPhone.startsWith('8')) {
            normalizedPhone = '+998' + normalizedPhone.slice(1);
        } else {
            normalizedPhone = '+998' + normalizedPhone;
        }

        // 1. Find ALL OTP codes for this phone (for debugging)
        const { data: allCodes, error: allError } = await supabase
            .from('telegram_otp_codes')
            .select('*')
            .eq('phone', normalizedPhone);

        // If no codes exist at all for this phone
        if (!allCodes || allCodes.length === 0) {
            return NextResponse.json({
                error: 'no_codes',
                message: `Kod topilmadi. Phone: ${normalizedPhone}`,
                debug: `No OTP codes found for phone ${normalizedPhone}. Error: ${allError?.message || 'none'}`
            }, { status: 400 });
        }

        // Find matching code
        const matchingCode = allCodes.find(c => c.code === code);

        if (!matchingCode) {
            return NextResponse.json({
                error: 'wrong_code',
                message: `Noto'g'ri kod. Kiritilgan: ${code}`,
                debug: `Code ${code} not found. Available codes: ${allCodes.map(c => c.code).join(', ')}`
            }, { status: 400 });
        }

        // Check if already verified
        if (matchingCode.verified) {
            return NextResponse.json({
                error: 'already_used',
                message: 'Bu kod allaqachon ishlatilgan',
                debug: 'Code already verified'
            }, { status: 400 });
        }

        // Check if expired
        if (new Date(matchingCode.expires_at) < new Date()) {
            return NextResponse.json({
                error: 'expired',
                message: 'Kod eskirgan. Yangi kod oling.',
                debug: `Expired at ${matchingCode.expires_at}, now is ${new Date().toISOString()}`
            }, { status: 400 });
        }

        // 2. Mark OTP as verified
        await supabase
            .from('telegram_otp_codes')
            .update({ verified: true })
            .eq('id', matchingCode.id);

        // 3. Get phone link for Telegram info
        const { data: phoneLink, error: phoneLinkError } = await supabase
            .from('telegram_phone_links')
            .select('*')
            .eq('phone', normalizedPhone)
            .single();

        if (!phoneLink) {
            return NextResponse.json({
                error: 'no_phone_link',
                message: 'Telefon raqami Telegramga ulanmagan',
                debug: `Phone link not found: ${phoneLinkError?.message}`
            }, { status: 400 });
        }

        // 4. Create or update profile
        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('telegram_id', phoneLink.telegram_id)
            .single();

        let profile;

        if (existingProfile) {
            const { data, error } = await supabase
                .from('profiles')
                .update({
                    phone_number: normalizedPhone,
                    updated_at: new Date().toISOString()
                })
                .eq('telegram_id', phoneLink.telegram_id)
                .select()
                .single();

            if (error) {
                return NextResponse.json({
                    error: 'profile_update_failed',
                    message: 'Profil yangilanmadi',
                    debug: error.message
                }, { status: 500 });
            }
            profile = data;
        } else {
            const newId = crypto.randomUUID();
            const { data, error } = await supabase
                .from('profiles')
                .insert({
                    id: newId,
                    telegram_id: phoneLink.telegram_id,
                    phone_number: normalizedPhone,
                    full_name: phoneLink.first_name || 'Mijoz',
                    role: 'customer'
                })
                .select()
                .single();

            if (error) {
                return NextResponse.json({
                    error: 'profile_create_failed',
                    message: 'Profil yaratilmadi',
                    debug: error.message
                }, { status: 500 });
            }
            profile = data;
        }

        // 5. Create session token
        const token = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        // Delete old sessions
        await supabase
            .from('telegram_sessions')
            .delete()
            .eq('telegram_id', phoneLink.telegram_id);

        // Create new session
        const { error: sessionError } = await supabase.from('telegram_sessions').insert({
            profile_id: profile.id,
            token,
            telegram_id: phoneLink.telegram_id,
            expires_at: expiresAt.toISOString()
        });

        if (sessionError) {
            return NextResponse.json({
                error: 'session_failed',
                message: 'Sessiya yaratilmadi',
                debug: sessionError.message
            }, { status: 500 });
        }

        // 6. Clean up OTP codes
        await supabase
            .from('telegram_otp_codes')
            .delete()
            .eq('phone', normalizedPhone);

        return NextResponse.json({
            success: true,
            token,
            user: {
                id: profile.id,
                full_name: profile.full_name,
                phone_number: profile.phone_number,
                telegram_id: profile.telegram_id,
                avatar_url: profile.avatar_url
            },
            expiresAt: expiresAt.toISOString()
        });

    } catch (error: any) {
        return NextResponse.json({
            error: 'server_error',
            message: 'Server xatosi',
            debug: error.message
        }, { status: 500 });
    }
}
