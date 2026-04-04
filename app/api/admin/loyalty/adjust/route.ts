import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdminVerified } from '@/app/utils/admin-auth';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
);

export async function POST(req: NextRequest) {
    if (!await isAdminVerified()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const body = await req.json();
        const { userId, amount, description, notifyMessage } = body;

        if (!userId || amount === undefined || !description) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Update DB: Call the RPC defined in migration 70
        const { error } = await supabaseAdmin.rpc('admin_adjust_coins', {
            p_user_id: userId,
            p_amount: parseInt(amount),
            p_description: description
        });

        if (error) throw error;

        // 2. Optional: Send Telegram Notification if message provided
        if (notifyMessage && notifyMessage.trim()) {
            try {
                // Fetch user's telegram_id
                const { data: profile } = await supabaseAdmin
                    .from('profiles')
                    .select('telegram_id')
                    .eq('id', userId)
                    .single();

                if (profile?.telegram_id) {
                    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
                    const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

                    await fetch(`${TELEGRAM_API}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: profile.telegram_id,
                            text: notifyMessage,
                            parse_mode: 'Markdown'
                        })
                    });
                }
            } catch (tgError) {
                console.error('[Admin Loyalty Adjust API] Telegram notify error:', tgError);
                // We don't fail the whole request if only notification fails
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[Admin Loyalty Adjust API] error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
