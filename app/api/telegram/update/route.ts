import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Status labels matching the webhook route
const STATUS_LABELS: Record<string, string> = {
    'new': '🆕 Yangi',
    'confirmed': '✅ Tasdiqlangan',
    'preparing': '🍳 Pishirilmoqda',
    'ready': '📦 Tayyor',
    'delivering': '🚗 Yo\'lda',
    'completed': '✅ Yetkazildi',
    'cancelled': '❌ Bekor qilindi'
};

// Status flow for next action buttons
const STATUS_FLOW: Record<string, { buttons?: Array<{ text: string; action: string }> }> = {
    'confirmed': {
        buttons: [{ text: '🍳 Pishirishni boshlash', action: 'preparing' }]
    },
    'preparing': {
        buttons: [{ text: '📦 Tayyor', action: 'ready' }]
    },
    'ready': {
        buttons: [{ text: '🚗 Yetkazishni boshlash', action: 'delivering' }]
    },
    'delivering': {
        buttons: [{ text: '✅ Yetkazildi', action: 'completed' }]
    },
    'completed': {
        buttons: []
    },
    'cancelled': {
        buttons: []
    }
};

export async function POST(request: NextRequest) {
    try {
        const { orderId, newStatus } = await request.json();

        if (!orderId || !newStatus) {
            return NextResponse.json({ error: 'Missing orderId or newStatus' }, { status: 400 });
        }

        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        if (!TELEGRAM_BOT_TOKEN) {
            return NextResponse.json({ ok: true, skipped: true, reason: 'No bot token' });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Get order with telegram info and original message content
        const { data: order, error } = await supabase
            .from('orders')
            .select('telegram_message_id, telegram_chat_id, delivery_address, delivery_time, total_price')
            .eq('id', orderId)
            .single();

        if (error || !order?.telegram_message_id || !order?.telegram_chat_id) {
            console.log('No telegram message to update:', { orderId, error: error?.message });
            return NextResponse.json({ ok: true, skipped: true, reason: 'No telegram info' });
        }

        // Build updated message text
        const statusLabel = STATUS_LABELS[newStatus] || newStatus;
        const shortId = orderId.slice(0, 8);

        let messageText = `🎂 *BUYURTMA* [${statusLabel}]\n\n`;
        messageText += `📋 *ID:* #${shortId}\n`;

        if (order.delivery_time) {
            const date = new Date(order.delivery_time);
            messageText += `📅 *Vaqt:* ${date.toLocaleDateString('uz-UZ')} ${date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}\n`;
        }

        if (order.total_price) {
            messageText += `💰 *Jami:* ${Number(order.total_price).toLocaleString()} so'm\n`;
        }

        // Get next action buttons
        const nextFlow = STATUS_FLOW[newStatus];
        const newButtons = nextFlow?.buttons?.length
            ? [[...nextFlow.buttons.map(b => ({ text: b.text, callback_data: `${b.action}_${orderId}` }))]]
            : [];

        // Edit Telegram message
        const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
        const response = await fetch(`${TELEGRAM_API}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: order.telegram_chat_id,
                message_id: order.telegram_message_id,
                text: messageText,
                parse_mode: 'Markdown',
                reply_markup: newButtons.length ? { inline_keyboard: newButtons } : { inline_keyboard: [] }
            })
        });

        const result = await response.json();

        if (!result.ok) {
            console.error('Telegram edit error:', result);
            // Don't fail the whole request, just log
        }

        return NextResponse.json({ ok: true, telegram_updated: result.ok });

    } catch (error) {
        console.error('Telegram update error:', error);
        return NextResponse.json({ ok: true, error: 'Failed to update telegram' });
    }
}
