import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

/**
 * Verify Telegram init_data signature
 */
function verifyTelegramData(initData: string): boolean {
    try {
        const params = new URLSearchParams(initData);
        const hash = params.get('hash');
        if (!hash) return false;

        params.delete('hash');

        const dataCheckString = [...params.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}=${v}`)
            .join('\n');

        const secretKey = crypto
            .createHmac('sha256', 'WebAppData')
            .update(BOT_TOKEN)
            .digest();

        const calculatedHash = crypto
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');

        return calculatedHash === hash;
    } catch (err) {
        console.error('[Auto-Login] Signature verification error:', err);
        return false;
    }
}

/**
 * POST /api/auth/telegram/auto-login
 * Auto-authenticate user if they have an existing session from bot contact share
 */
export async function POST(request: NextRequest) {
    console.log('[Auto-Login] Request received');

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        const { initData, telegramId } = await request.json();

        if (!telegramId) {
            return NextResponse.json({ error: 'telegram_id required' }, { status: 400 });
        }

        console.log('[Auto-Login] Telegram ID:', telegramId);

        // Verify Telegram signature in production
        if (process.env.NODE_ENV === 'production' && initData) {
            if (!verifyTelegramData(initData)) {
                console.error('[Auto-Login] Invalid signature');
                return NextResponse.json({ error: 'Invalid Telegram signature' }, { status: 401 });
            }

            // Check auth_date is recent (within 1 hour)
            const params = new URLSearchParams(initData);
            const authDate = parseInt(params.get('auth_date') || '0');
            const ageSeconds = Date.now() / 1000 - authDate;

            if (ageSeconds > 3600) {
                console.error('[Auto-Login] Auth data expired, age:', ageSeconds);
                return NextResponse.json({ error: 'Auth data expired' }, { status: 401 });
            }
        }

        // Look up existing session by telegram_id
        const { data: session, error: sessionError } = await supabase
            .from('telegram_sessions')
            .select('token, profile_id, expires_at')
            .eq('telegram_id', telegramId)
            .single();

        if (sessionError || !session) {
            console.log('[Auto-Login] No session found for telegram_id:', telegramId);
            return NextResponse.json({
                authenticated: false,
                reason: 'no_session'
            });
        }

        // Check if expired
        if (new Date(session.expires_at) < new Date()) {
            console.log('[Auto-Login] Session expired');
            return NextResponse.json({
                authenticated: false,
                reason: 'session_expired'
            });
        }

        // Get profile details
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.profile_id)
            .single();

        if (profileError || !profile) {
            console.log('[Auto-Login] Profile not found');
            return NextResponse.json({
                authenticated: false,
                reason: 'profile_not_found'
            });
        }

        console.log('[Auto-Login] Success for:', profile.full_name);

        return NextResponse.json({
            authenticated: true,
            token: session.token,
            user: {
                id: profile.id,
                full_name: profile.full_name,
                phone_number: profile.phone_number,
                telegram_id: profile.telegram_id,
                avatar_url: profile.avatar_url
            },
            expiresAt: session.expires_at
        });

    } catch (error: any) {
        console.error('[Auto-Login] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
