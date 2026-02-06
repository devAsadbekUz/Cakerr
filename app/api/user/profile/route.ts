import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getVerifiedUserId } from '@/app/utils/telegram-auth';

/**
 * POST /api/user/profile
 * Updates the user's profile metadata and record.
 */
export async function POST(request: NextRequest) {
    const userId = await getVerifiedUserId(request);

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        const body = await request.json();
        const { full_name } = body;

        console.log(`[Profile API] Request body:`, JSON.stringify(body));

        if (!full_name) {
            return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
        }

        console.log(`[Profile API] Updating profile for: ${userId}, New Name: ${full_name}`);

        // 1. Update the profiles table
        const { data: profile, error: dbError } = await supabase
            .from('profiles')
            .update({
                full_name,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();

        if (dbError) {
            console.error('[Profile API] Database update error:', dbError);
            throw dbError;
        }

        console.log('[Profile API] Database update success:', profile.id);

        // 2. Try to update Auth Metadata if it's a Supabase user
        try {
            const { error: authErr } = await supabase.auth.admin.updateUserById(userId, {
                user_metadata: { full_name }
            });
            if (authErr) {
                console.log(`[Profile API] Auth metadata update error (expected for non-auth users):`, authErr.message);
            } else {
                console.log('[Profile API] Auth metadata update success');
            }
        } catch (err: any) {
            console.log(`[Profile API] Auth metadata skip/fail for ${userId}:`, err.message);
        }

        return NextResponse.json({ success: true, user: profile });
    } catch (error: any) {
        console.error('[Profile API] error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
