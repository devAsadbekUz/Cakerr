import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

/**
 * Verify Telegram init_data signature
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
function verifyTelegramData(initData: string): boolean {
    try {
        const params = new URLSearchParams(initData);
        const hash = params.get('hash');
        if (!hash) return false;

        // Remove hash from params for signature calculation
        params.delete('hash');

        // Sort parameters alphabetically and create data-check-string
        const dataCheckString = [...params.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}=${v}`)
            .join('\n');

        // Create secret key: HMAC-SHA256(bot_token, "WebAppData")
        const secretKey = crypto
            .createHmac('sha256', 'WebAppData')
            .update(BOT_TOKEN)
            .digest();

        // Calculate hash: HMAC-SHA256(data_check_string, secret_key)
        const calculatedHash = crypto
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');

        return calculatedHash === hash;
    } catch (err) {
        console.error('[TG Auth] Signature verification error:', err);
        return false;
    }
}

export async function POST(request: NextRequest) {
    console.log('[TG Auth] Login request received');

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        const body = await request.json();
        const { initData, phone, firstName, lastName, telegramId } = body;

        console.log('[TG Auth] Telegram ID:', telegramId, 'Phone:', phone?.substring(0, 5) + '***');

        // 1. Verify Telegram signature (skip in dev mode if needed)
        if (process.env.NODE_ENV === 'production') {
            if (!verifyTelegramData(initData)) {
                console.error('[TG Auth] Invalid signature');
                return NextResponse.json({ error: 'Invalid Telegram signature' }, { status: 401 });
            }

            // 2. Check auth_date is recent (within 1 hour)
            const params = new URLSearchParams(initData);
            const authDate = parseInt(params.get('auth_date') || '0');
            const ageSeconds = Date.now() / 1000 - authDate;

            if (ageSeconds > 3600) {
                console.error('[TG Auth] Auth data expired, age:', ageSeconds, 'seconds');
                return NextResponse.json({ error: 'Auth data expired' }, { status: 401 });
            }
        }

        // 3. Check if user exists by telegram_id
        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('telegram_id', telegramId)
            .single();

        let profile;
        const fullName = `${firstName} ${lastName || ''}`.trim();

        if (existingProfile) {
            // Update existing profile
            console.log('[TG Auth] Updating existing profile:', existingProfile.id);
            const { data, error } = await supabase
                .from('profiles')
                .update({
                    phone_number: phone,
                    full_name: existingProfile.full_name || fullName,
                    updated_at: new Date().toISOString()
                })
                .eq('telegram_id', telegramId)
                .select()
                .single();

            if (error) {
                console.error('[TG Auth] Update error:', error);
                throw error;
            }
            profile = data;
        } else {
            // Create new profile with generated UUID
            const newId = crypto.randomUUID();
            console.log('[TG Auth] Creating new profile:', newId);

            const { data, error } = await supabase
                .from('profiles')
                .insert({
                    id: newId,
                    telegram_id: telegramId,
                    phone_number: phone,
                    full_name: fullName,
                    role: 'customer'
                })
                .select()
                .single();

            if (error) {
                console.error('[TG Auth] Insert error:', error);
                throw error;
            }
            profile = data;
        }

        // 4. Create session token
        const token = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        // Delete old sessions for this user
        await supabase
            .from('telegram_sessions')
            .delete()
            .eq('telegram_id', telegramId);

        // Create new session
        const { error: sessionError } = await supabase
            .from('telegram_sessions')
            .insert({
                profile_id: profile.id,
                token,
                telegram_id: telegramId,
                expires_at: expiresAt.toISOString()
            });

        if (sessionError) {
            console.error('[TG Auth] Session creation error:', sessionError);
            throw sessionError;
        }

        console.log('[TG Auth] Login successful for:', profile.full_name);

        return NextResponse.json({
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
        console.error('[TG Auth] Error:', error);
        return NextResponse.json({ error: error.message || 'Authentication failed' }, { status: 500 });
    }
}
