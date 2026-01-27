import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyTelegramRequest } from '@/app/utils/telegram-auth';

/**
 * GET /api/user/me
 * Retrieves (and auto-creates) the user profile based on Telegram initData.
 * This is the main entry point for Telegram auth. No tokens needed.
 */
export async function GET(request: NextRequest) {
    // 1. Verify Telegram signature
    const tgUser = verifyTelegramRequest(request);

    if (!tgUser) {
        return NextResponse.json({
            error: 'Invalid or missing Telegram authentication data',
            authenticated: false
        }, { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role to create profiles
    );

    try {
        // 2. Look up profile by telegram_id
        let { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('telegram_id', tgUser.telegram_id)
            .maybeSingle();

        if (error) {
            console.error('[User API] Database error:', error.message);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        // 3. Auto-create profile if doesn't exist
        if (!profile) {
            console.log('[User API] New user detected, creating profile:', tgUser.telegram_id);

            const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ');

            const { data: newProfile, error: createError } = await supabase
                .from('profiles')
                .insert({
                    telegram_id: tgUser.telegram_id,
                    full_name: fullName || 'Telegram User',
                    username: tgUser.username,
                    role: 'customer' // Default role
                })
                .select()
                .single();

            if (createError) {
                console.error('[User API] Error creating profile:', createError.message);
                return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
            }

            profile = newProfile;
        } else {
            // Update username if it changed or was empty
            if (tgUser.username && profile.username !== tgUser.username) {
                await supabase
                    .from('profiles')
                    .update({ username: tgUser.username })
                    .eq('telegram_id', tgUser.telegram_id);
            }
        }

        // 4. Return profile data with an "authenticated" flag
        return NextResponse.json({
            authenticated: true,
            user: {
                id: profile.id,
                full_name: profile.full_name,
                phone_number: profile.phone_number,
                telegram_id: profile.telegram_id,
                username: profile.username,
                role: profile.role,
                has_phone: !!profile.phone_number
            }
        });

    } catch (err: any) {
        console.error('[User API] Internal error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
