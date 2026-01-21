import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStatusConfig, getTelegramButtons, buildOrderMessage } from '@/app/utils/orderConfig';

export async function POST(request: NextRequest) {
    console.log('[Telegram Update] Received request');
    try {
        const { orderId, newStatus } = await request.json();
        console.log('[Telegram Update] Order ID:', orderId, 'New Status:', newStatus);

        if (!orderId || !newStatus) {
            console.error('[Telegram Update] Missing orderId or newStatus');
            return NextResponse.json({ error: 'Missing orderId or newStatus' }, { status: 400 });
        }

        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        if (!TELEGRAM_BOT_TOKEN) {
            console.error('[Telegram Update] TELEGRAM_BOT_TOKEN not found in env');
            return NextResponse.json({ ok: true, skipped: true, reason: 'No bot token' });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Get order with telegram info and details to rebuild message
        const { data: order, error } = await supabase
            .from('orders')
            .select(`
                id,
                telegram_message_id, 
                telegram_chat_id, 
                delivery_address, 
                delivery_time, 
                delivery_slot,
                total_price,
                comment,
                user_id,
                profiles (full_name, phone_number),
                order_items (*)
            `)
            .eq('id', orderId)
            .single();

        if (error) {
            console.error('[Telegram Update] Supabase fetch error:', error);
        }

        if (error || !order || !order.telegram_message_id || !order.telegram_chat_id) {
            console.log('[Telegram Update] No telegram info found for update:', {
                orderId,
                hasOrder: !!order,
                msgId: order?.telegram_message_id,
                chatId: order?.telegram_chat_id
            });
            return NextResponse.json({ ok: true, skipped: true, reason: 'No telegram info' });
        }

        const statusConfig = getStatusConfig(newStatus);
        const statusLabel = statusConfig.tgLabel;
        console.log('[Telegram Update] Status configured:', statusLabel);

        // Use shared utility to build message text
        const messageText = buildOrderMessage(order, statusLabel);

        // Get next action buttons from central config
        const inline_keyboard = getTelegramButtons(newStatus, orderId);

        // Edit Telegram message
        const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
        console.log('[Telegram Update] Sending editMessageText to Telegram...');
        const response = await fetch(`${TELEGRAM_API}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: order.telegram_chat_id,
                message_id: order.telegram_message_id,
                text: messageText,
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard }
            })
        });

        const result = await response.json();
        console.log('[Telegram Update] Telegram API result:', result);

        if (!result.ok) {
            console.error('[Telegram Update] Telegram edit error:', result);
        }

        return NextResponse.json({ ok: true, telegram_updated: result.ok });

    } catch (error) {
        console.error('[Telegram Update] Catch error:', error);
        return NextResponse.json({ ok: true, error: 'Failed to update telegram' });
    }
}
