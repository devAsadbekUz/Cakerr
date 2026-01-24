import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/auth/me
 * Validate session token and return user profile
 */
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
        return NextResponse.json({ user: null });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        // Validate session token
        const { data: session, error: sessionError } = await supabase
            .from('telegram_sessions')
            .select('profile_id, expires_at')
            .eq('token', token)
            .single();

        if (sessionError || !session) {
            return NextResponse.json({ user: null });
        }

        // Check if session is expired
        if (new Date(session.expires_at) < new Date()) {
            // Clean up expired session
            await supabase
                .from('telegram_sessions')
                .delete()
                .eq('token', token);

            return NextResponse.json({ user: null });
        }

        // Get profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, phone_number, telegram_id, avatar_url, role')
            .eq('id', session.profile_id)
            .single();

        if (profileError || !profile) {
            return NextResponse.json({ user: null });
        }

        return NextResponse.json({ user: profile });

    } catch (error) {
        console.error('[Auth Me] Error:', error);
        return NextResponse.json({ user: null });
    }
}

/**
 * DELETE /api/auth/me
 * Logout - delete session
 */
export async function DELETE(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
        return NextResponse.json({ success: true });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabase
        .from('telegram_sessions')
        .delete()
        .eq('token', token);

    return NextResponse.json({ success: true });
}
