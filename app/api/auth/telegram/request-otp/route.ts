import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TELEGRAM_CONFIG } from '@/app/utils/telegramConfig';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

/**
 * POST /api/auth/telegram/request-otp
 * Send OTP code via Telegram bot
 */
export async function POST(request: NextRequest) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        const { phone } = await request.json();

        if (!phone) {
            return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
        }

        // Normalize phone number to +998XXXXXXXXX format
        let normalizedPhone = phone.replace(/[\s\-\(\)]/g, ''); // Remove spaces, dashes, parens
        if (normalizedPhone.startsWith('+998')) {
            // Already correct format
        } else if (normalizedPhone.startsWith('998')) {
            normalizedPhone = '+' + normalizedPhone;
        } else if (normalizedPhone.startsWith('8')) {
            normalizedPhone = '+998' + normalizedPhone.slice(1);
        } else {
            normalizedPhone = '+998' + normalizedPhone;
        }
        console.log('[OTP Request] Normalized phone:', normalizedPhone);

        // 1. Check if phone is linked to a Telegram account
        const { data: phoneLink, error: linkError } = await supabase
            .from('telegram_phone_links')
            .select('telegram_chat_id, first_name')
            .eq('phone', normalizedPhone)
            .single();

        if (linkError || !phoneLink) {
            console.log('[OTP Request] Phone not linked to Telegram');
            return NextResponse.json({
                error: 'not_linked',
                message: `Bu telefon raqami Telegram botga ulanmagan. Avval @${TELEGRAM_CONFIG.botUsername} ni oching va telefon raqamingizni ulashing.`
            }, { status: 400 });
        }

        // 2. Generate 6-digit OTP code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // 3. Delete any existing OTP codes for this phone
        await supabase
            .from('telegram_otp_codes')
            .delete()
            .eq('phone', normalizedPhone);

        // 4. Store new OTP code
        const { error: insertError } = await supabase
            .from('telegram_otp_codes')
            .insert({
                phone: normalizedPhone,
                code,
                expires_at: expiresAt.toISOString()
            });

        if (insertError) {
            console.error('[OTP Request] Insert error:', insertError);
            throw insertError;
        }

        // 5. Send OTP via Telegram bot
        const message = `🔐 *Cakerr tasdiqlash kodi*\n\nSizning kodingiz: \`${code}\`\n\n_Kod 5 daqiqadan keyin eskiradi._`;

        const tgResponse = await fetch(`${TELEGRAM_API}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: phoneLink.telegram_chat_id,
                text: message,
                parse_mode: 'Markdown'
            })
        });

        const tgResult = await tgResponse.json();

        if (!tgResult.ok) {
            console.error('[OTP Request] Telegram send failed:', tgResult);
            return NextResponse.json({
                error: 'telegram_error',
                message: 'Telegram xabar yuborishda xatolik. Qaytadan urinib ko\'ring.'
            }, { status: 500 });
        }

        console.log('[OTP Request] OTP sent to:', phoneLink.first_name);

        return NextResponse.json({
            success: true,
            message: 'Kod Telegram orqali yuborildi',
            expiresIn: 300 // 5 minutes in seconds
        });

    } catch (error: any) {
        console.error('[OTP Request] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
