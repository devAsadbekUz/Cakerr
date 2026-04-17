import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStatusConfig, getTelegramButtons, buildOrderMessage } from '@/app/utils/orderConfig';

function isPhotoOrder(order: any): boolean {
    if (!order.order_items || order.order_items.length === 0) return false;
    return order.order_items.some((item: any) => {
        const cfg = item.configuration || {};
        const photoUrl = cfg.uploaded_photo_url || cfg.photo_ref || cfg.photoRef;
        return photoUrl && typeof photoUrl === 'string' && photoUrl.startsWith('http');
    });
}

export async function POST(request: NextRequest) {
    console.log('[Telegram Update] Received request');
    try {
        const { orderId, newStatus, lang = 'uz' } = await request.json();
        console.log('[Telegram Update] Order ID:', orderId, 'New Status:', newStatus, 'Lang:', lang);

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
                profiles (full_name, phone_number, telegram_id),
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
        
        // Use shared utility to build message text
        const messageText = buildOrderMessage(order, lang as 'uz' | 'ru');

        // Get next action buttons from central config
        const inline_keyboard = getTelegramButtons(newStatus, orderId, lang as 'uz' | 'ru');

        // Edit Telegram message
        const hasPhoto = isPhotoOrder(order);
        const endpoint = hasPhoto ? 'editMessageCaption' : 'editMessageText';
        const payload: any = {
            chat_id: order.telegram_chat_id,
            message_id: order.telegram_message_id,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard }
        };

        if (hasPhoto) {
            payload.caption = messageText;
        } else {
            payload.text = messageText;
        }

        const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
        console.log(`[Telegram Update] Sending ${endpoint} to Telegram...`);
        const response = await fetch(`${TELEGRAM_API}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        console.log('[Telegram Update] Telegram API result:', result);

        if (!result.ok) {
            console.error('[Telegram Update] Telegram edit error:', result);
        }

        // Notify the client directly if they have a telegram_id linked
        const profile = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles;
        if (profile?.telegram_id) {
            const clientLabels = {
                uz: {
                    title: "🍰 *Buyurtma holati yangilandi*",
                    text: `Hurmatli mijoz, sizning #${order.id.slice(0, 8)} raqamli buyurtmangiz holati o'zgardi:`
                },
                ru: {
                    title: "🍰 *Статус заказа обновлен*",
                    text: `Уважаемый клиент, статус вашего заказа #${order.id.slice(0, 8)} изменился:`
                }
            }[lang as 'uz' | 'ru'];

            const clientMessage = `${clientLabels.title}\n\n${clientLabels.text}\n\n*${statusConfig.labels[lang as 'uz' | 'ru']}*\n_${statusConfig.descs[lang as 'uz' | 'ru']}_`;
            
            console.log('[Telegram Update] Sending notification to client:', profile.telegram_id);
            const notifyResponse = await fetch(`${TELEGRAM_API}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: profile.telegram_id,
                    text: clientMessage,
                    parse_mode: 'Markdown'
                })
            });
            const notifyResult = await notifyResponse.json();
            if (!notifyResult.ok) {
                console.error('[Telegram Update] Failed to notify client:', notifyResult.description);
            }
        }

        return NextResponse.json({ ok: true, telegram_updated: result.ok });

    } catch (error) {
        console.error('[Telegram Update] Catch error:', error);
        return NextResponse.json({ ok: true, error: 'Failed to update telegram' });
    }
}
