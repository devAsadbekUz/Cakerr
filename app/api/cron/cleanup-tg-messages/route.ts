import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/app/utils/supabase/service';

export async function GET(request: NextRequest) {
    // Verify Vercel cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!TELEGRAM_BOT_TOKEN) {
        return NextResponse.json({ error: 'No bot token' }, { status: 500 });
    }

    const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

    // Find all orders whose completion message is due for deletion
    const { data: orders, error } = await serviceClient
        .from('orders')
        .select('id, client_tg_message_id, profiles(telegram_id)')
        .not('client_tg_message_id', 'is', null)
        .not('client_tg_delete_at', 'is', null)
        .lte('client_tg_delete_at', new Date().toISOString());

    if (error) {
        console.error('[TG Cleanup Cron] Query error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!orders?.length) {
        return NextResponse.json({ deleted: 0 });
    }

    let deleted = 0;
    for (const order of orders) {
        const profile = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles;
        if (!profile?.telegram_id || !order.client_tg_message_id) continue;

        try {
            await fetch(`${TELEGRAM_API}/deleteMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: profile.telegram_id,
                    message_id: order.client_tg_message_id
                })
            });

            await serviceClient
                .from('orders')
                .update({ client_tg_message_id: null, client_tg_delete_at: null })
                .eq('id', order.id);

            deleted++;
        } catch (err) {
            console.error(`[TG Cleanup Cron] Failed for order ${order.id}:`, err);
        }
    }

    console.log(`[TG Cleanup Cron] Deleted ${deleted}/${orders.length} expired messages`);
    return NextResponse.json({ deleted, total: orders.length });
}
