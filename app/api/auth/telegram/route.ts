import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyTelegramInitData } from '@/app/utils/telegram-auth';

export async function POST(request: NextRequest) {
    // 1. Verify Telegram signature
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        const body = await request.json();
        const { initData, phone, telegramId } = body;

        const tgUser = verifyTelegramInitData(initData);
        if (!tgUser) {
            return NextResponse.json({ error: 'Invalid Telegram signature' }, { status: 401 });
        }

        // Ensure the telegramId in body matches the one in verified initData
        if (tgUser.telegram_id !== telegramId) {
            return NextResponse.json({ error: 'Telegram ID mismatch' }, { status: 403 });
        }

        console.log('[TG Auth] Updating phone for:', tgUser.telegram_id, 'Phone:', phone);

        // 2. Normalize phone
        let normalizedPhone = phone.replace(/\s+/g, '');
        if (!normalizedPhone.startsWith('+')) {
            normalizedPhone = '+' + normalizedPhone;
        }

        // 3. Update or Create profile
        const { data: profile, error } = await supabase
            .from('profiles')
            .upsert({
                telegram_id: tgUser.telegram_id,
                phone_number: normalizedPhone,
                full_name: tgUser.first_name + (tgUser.last_name ? ` ${tgUser.last_name}` : ''),
                username: tgUser.username,
                role: 'customer',
                updated_at: new Date().toISOString()
            }, { onConflict: 'telegram_id' })
            .select()
            .single();

        if (error) {
            console.error('[TG Auth] Profile error:', error);
            throw error;
        }

        // 4. Clear any legacy sessions (cleanup)
        await supabase
            .from('telegram_sessions')
            .delete()
            .eq('telegram_id', tgUser.telegram_id);

        return NextResponse.json({
            success: true,
            user: {
                id: profile.id,
                full_name: profile.full_name,
                phone_number: profile.phone_number,
                telegram_id: profile.telegram_id,
                has_phone: true
            }
        });

    } catch (error: any) {
        console.error('[TG Auth] Error:', error);
        return NextResponse.json({ error: error.message || 'Authentication failed' }, { status: 500 });
    }
}
