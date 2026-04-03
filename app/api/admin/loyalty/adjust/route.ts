import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, amount, description } = body;

        if (!userId || amount === undefined || !description) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Call the RPC defined in migration 70
        const { error } = await supabaseAdmin.rpc('admin_adjust_coins', {
            p_user_id: userId,
            p_amount: parseInt(amount),
            p_description: description
        });

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[Admin Loyalty Adjust API] error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
