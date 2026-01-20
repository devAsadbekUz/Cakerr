import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Status flow mapping
const STATUS_FLOW: Record<string, { next: string; label: string; buttons?: Array<{ text: string; action: string }> }> = {
    'new': {
        next: 'confirmed',
        label: '✅ Tasdiqlangan',
        buttons: [{ text: '🍳 Pishirishni boshlash', action: 'preparing' }]
    },
    'confirmed': {
        next: 'preparing',
        label: '✅ Tasdiqlangan',
        buttons: [{ text: '🍳 Pishirishni boshlash', action: 'preparing' }]
    },
    'preparing': {
        next: 'ready',
        label: '🍳 Pishirilmoqda',
        buttons: [{ text: '📦 Tayyor', action: 'ready' }]
    },
    'ready': {
        next: 'delivering',
        label: '📦 Tayyor',
        buttons: [{ text: '🚗 Yetkazishni boshlash', action: 'delivering' }]
    },
    'delivering': {
        next: 'completed',
        label: '🚗 Yo\'lda',
        buttons: [{ text: '✅ Yetkazildi', action: 'completed' }]
    },
    'completed': {
        next: '',
        label: '✅ Yetkazildi',
        buttons: []
    }
};

export async function POST(request: NextRequest) {
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
    const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

    // Use service role for admin operations (Bypass RLS)
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    try {
        const update = await request.json();

        // Handle callback queries (button clicks)
        if (update.callback_query) {
            const callbackData = update.callback_query.data;
            const messageId = update.callback_query.message.message_id;
            const chatId = update.callback_query.message.chat.id;
            const originalText = update.callback_query.message.text;

            // Parse action and order ID
            const [action, orderId] = callbackData.split('_');

            let newStatus = '';
            let statusLabel = '';

            if (action === 'confirm') {
                newStatus = 'confirmed';
                statusLabel = '✅ Tasdiqlangan';
            } else if (action === 'cancel') {
                newStatus = 'cancelled';
                statusLabel = '❌ Bekor qilindi';
            } else if (STATUS_FLOW[action]) {
                newStatus = action;
                statusLabel = STATUS_FLOW[action].label;
            } else {
                // Direct status update
                newStatus = action;
                statusLabel = action.toUpperCase();
            }

            // Log incoming action
            await supabase.from('debug_logs').insert({
                message: `Action: ${action}`,
                payload: { orderId, callbackData }
            });

            // Update order in database
            const { error } = await supabase
                .from('orders')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', orderId);

            if (error) {
                console.error('Supabase update error:', error);
                await supabase.from('debug_logs').insert({ message: 'Update Error', payload: error });
                await answerCallback(update.callback_query.id, 'Xatolik yuz berdi!', TELEGRAM_API);
                return NextResponse.json({ ok: true });
            } else {
                await supabase.from('debug_logs').insert({ message: 'Update Success', payload: { newStatus } });
            }

            // Get next buttons based on new status
            const nextFlow = STATUS_FLOW[newStatus];
            const newButtons = nextFlow?.buttons?.length
                ? [[...nextFlow.buttons.map(b => ({ text: b.text, callback_data: `${b.action}_${orderId}` }))]]
                : [];

            // Update the message with new status
            const updatedText = originalText.replace(
                /🎂 \*YANGI BUYURTMA\*/,
                `🎂 *BUYURTMA* [${statusLabel}]`
            );

            await fetch(`${TELEGRAM_API}/editMessageText`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    message_id: messageId,
                    text: updatedText,
                    parse_mode: 'Markdown',
                    reply_markup: newButtons.length ? { inline_keyboard: newButtons } : undefined
                })
            });

            // Answer callback to remove loading state
            await answerCallback(update.callback_query.id, `Holat yangilandi: ${statusLabel}`, TELEGRAM_API);
        }

        return NextResponse.json({ ok: true });

    } catch (error) {
        console.error('Telegram webhook error:', error);
        return NextResponse.json({ ok: true }); // Always return 200 for Telegram
    }
}

async function answerCallback(callbackQueryId: string, text: string, telegramApi: string) {
    await fetch(`${telegramApi}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            callback_query_id: callbackQueryId,
            text: text,
            show_alert: false
        })
    });
}

// Verify webhook is set up correctly
export async function GET() {
    return NextResponse.json({ status: 'Telegram webhook is active' });
}
