import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getVerifiedUserId } from '@/app/utils/telegram-auth';
import { z } from 'zod';

const supabaseService = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const UpdateProfileSchema = z.object({
    full_name: z.string().min(1).optional(),
    phone_number: z.string().min(5).optional(),
}).refine(data => data.full_name || data.phone_number, {
    message: "At least one field (full_name or phone_number) is required"
});

/**
 * POST /api/user/profile
 * Updates the user's profile metadata and record.
 */
export async function POST(request: NextRequest) {
    const userId = await getVerifiedUserId(request);

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = supabaseService;

    try {
        const raw = await request.json();
        const parsed = UpdateProfileSchema.safeParse(raw);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid profile data', details: parsed.error.flatten() }, { status: 400 });
        }
        const { full_name, phone_number } = parsed.data;

        // 1. Update the profiles table
        const updates: any = {
            updated_at: new Date().toISOString()
        };
        if (full_name) updates.full_name = full_name;
        if (phone_number !== undefined) updates.phone_number = phone_number;

        const { data: profile, error: dbError } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (dbError) throw dbError;

        // 2. Try to update Auth Metadata if it's a Supabase user
        try {
            const authMetadata: any = {};
            if (full_name) authMetadata.full_name = full_name;

            if (Object.keys(authMetadata).length > 0) {
                await supabase.auth.admin.updateUserById(userId, {
                    user_metadata: authMetadata
                });
            }
        } catch (err) {
            // Auth update is non-critical for mini-app flow
        }

        return NextResponse.json({ success: true, user: profile });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
