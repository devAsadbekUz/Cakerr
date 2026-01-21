import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStatusConfig, getTelegramButtons, buildOrderMessage } from '@/app/utils/orderConfig';

export async function POST(request: NextRequest) {
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
    const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

    console.log('[Telegram Webhook] Incoming message');

    // Use service role for admin operations (Bypass RLS)
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    try {
        const update = await request.json();
        console.log('[Telegram Webhook] Update body keys:', Object.keys(update));

        // Handle callback queries (button clicks)
        if (update.callback_query) {
            const callbackData = update.callback_query.data;
            const messageId = update.callback_query.message.message_id;
            const chatId = update.callback_query.message.chat.id;

            console.log('[Telegram Webhook] Callback data:', callbackData, 'Chat ID:', chatId, 'Message ID:', messageId);

            // Parse action and order ID
            const [action, orderId] = callbackData.split('_');
            console.log('[Telegram Webhook] Action:', action, 'Order ID:', orderId);

            let newStatus = action; // Default to the action itself

            // Special cases for initial buttons
            if (action === 'confirm') newStatus = 'confirmed';
            else if (action === 'cancel') newStatus = 'cancelled';

            // Log incoming action
            await supabase.from('debug_logs').insert({
                message: `TG Action: ${action}`,
                payload: { orderId, callbackData }
            });

            // 1. Update order in database
            console.log('[Telegram Webhook] Updating order status to:', newStatus);
            const { error: updateError } = await supabase
                .from('orders')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', orderId);

            if (updateError) {
                console.error('[Telegram Webhook] Supabase update error:', updateError);
                await answerCallback(update.callback_query.id, 'Xatolik yuz berdi!', TELEGRAM_API);
                return NextResponse.json({ ok: true });
            }

            // 2. Fetch fresh order details
            console.log('[Telegram Webhook] Fetching fresh order details...');
            const { data: order, error: fetchError } = await supabase
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

            if (fetchError || !order) {
                console.error('[Telegram Webhook] Fetch order error:', fetchError);
                await answerCallback(update.callback_query.id, 'Ma\'lumotlarni yuklashda xatolik!', TELEGRAM_API);
                return NextResponse.json({ ok: true });
            }

            const statusConfig = getStatusConfig(newStatus);
            const statusLabel = statusConfig.tgLabel;

            // 3. Build the updated message using shared utility
            const updatedText = buildOrderMessage(order, statusLabel);
            const inline_keyboard = getTelegramButtons(newStatus, orderId);

            // 4. Update the message in Telegram
            console.log('[Telegram Webhook] Sending editMessageText...');
            const tgResponse = await fetch(`${TELEGRAM_API}/editMessageText`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    message_id: messageId,
                    text: updatedText,
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard }
                })
            });

            const tgResult = await tgResponse.json();
            console.log('[Telegram Webhook] TG Edit Result:', tgResult);

            // Answer callback to remove loading state
            await answerCallback(update.callback_query.id, `Holat yangilandi: ${statusLabel}`, TELEGRAM_API);
        } else {
            console.log('[Telegram Webhook] Not a callback query, ignoring.');
        }

        return NextResponse.json({ ok: true });

    } catch (error) {
        console.error('[Telegram Webhook] Catch error:', error);
        return NextResponse.json({ ok: true }); // Always return 200 for Telegram
    }
}

async function answerCallback(callbackQueryId: string, text: string, telegramApi: string) {
    try {
        await fetch(`${telegramApi}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                callback_query_id: callbackQueryId,
                text: text,
                show_alert: false
            })
        });
    } catch (err) {
        console.error('[Telegram Webhook] Error answering callback:', err);
    }
}

// Verify webhook is set up correctly
export async function GET() {
    return NextResponse.json({ status: 'Telegram webhook is active' });
}
