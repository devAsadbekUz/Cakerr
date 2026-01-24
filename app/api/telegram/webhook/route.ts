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

        // Handle regular messages (including /start and contact sharing)
        if (update.message) {
            const message = update.message;
            const chatId = message.chat.id;
            const userId = message.from?.id;
            const firstName = message.from?.first_name || '';
            const username = message.from?.username || '';

            // Handle /start command
            if (message.text?.startsWith('/start')) {
                console.log('[Telegram Webhook] /start command from:', firstName);

                await fetch(`${TELEGRAM_API}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: `🍰 *Xush kelibsiz, ${firstName}!*\n\nCakerr botiga xush kelibsiz! Buyurtma berish uchun telefon raqamingizni ulashing.\n\nQuyidagi tugmani bosing 👇`,
                        parse_mode: 'Markdown',
                        reply_markup: {
                            keyboard: [[{
                                text: '📱 Telefon raqamni ulashish',
                                request_contact: true
                            }]],
                            resize_keyboard: true,
                            one_time_keyboard: true
                        }
                    })
                });
                return NextResponse.json({ ok: true });
            }

            // Handle contact sharing
            if (message.contact) {
                const contact = message.contact;
                const phoneNumber = contact.phone_number;
                const contactUserId = contact.user_id;

                console.log('[Telegram Webhook] Contact shared:', phoneNumber, 'UserId:', contactUserId);

                // Normalize phone number to +998 format
                let normalizedPhone = phoneNumber.replace(/\s+/g, '');
                if (!normalizedPhone.startsWith('+')) {
                    normalizedPhone = '+' + normalizedPhone;
                }

                try {
                    // Check if phone already exists
                    const { data: existing } = await supabase
                        .from('telegram_phone_links')
                        .select('id')
                        .eq('phone', normalizedPhone)
                        .single();

                    let saveError = null;

                    if (existing) {
                        // Update existing record
                        const { error } = await supabase
                            .from('telegram_phone_links')
                            .update({
                                telegram_id: contactUserId || userId,
                                telegram_chat_id: chatId,
                                telegram_username: username,
                                first_name: firstName
                            })
                            .eq('phone', normalizedPhone);
                        saveError = error;
                    } else {
                        // Insert new record
                        const { error } = await supabase
                            .from('telegram_phone_links')
                            .insert({
                                phone: normalizedPhone,
                                telegram_id: contactUserId || userId,
                                telegram_chat_id: chatId,
                                telegram_username: username,
                                first_name: firstName
                            });
                        saveError = error;
                    }

                    if (saveError) {
                        console.error('[Telegram Webhook] Phone link save error:', saveError);
                        throw saveError;
                    }

                    // Send success message
                    await fetch(`${TELEGRAM_API}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: chatId,
                            text: `✅ *Rahmat, ${firstName}!*\n\nTelefon raqamingiz muvaffaqiyatli ulandi: \`${normalizedPhone}\`\n\n🎂 Endi cakerr.vercel.app saytida shu raqam orqali kirishingiz mumkin!`,
                            parse_mode: 'Markdown',
                            reply_markup: {
                                inline_keyboard: [[{
                                    text: '🍰 Buyurtma berish',
                                    web_app: { url: 'https://cakerr.vercel.app' }
                                }]]
                            }
                        })
                    });

                    console.log('[Telegram Webhook] Phone linked successfully:', normalizedPhone);

                } catch (err: any) {
                    console.error('[Telegram Webhook] Contact handling error:', err);
                    await fetch(`${TELEGRAM_API}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: chatId,
                            text: `❌ Xatolik: ${err.message || 'Unknown'}`,
                            reply_markup: { remove_keyboard: true }
                        })
                    });
                }

                return NextResponse.json({ ok: true });
            }
        }

        // Handle callback queries (button clicks for orders)
        if (update.callback_query) {
            const callbackData = update.callback_query.data;
            const messageId = update.callback_query.message.message_id;
            const chatId = update.callback_query.message.chat.id;

            console.log('[Telegram Webhook] Callback data:', callbackData);

            const [action, orderId] = callbackData.split('_');
            let newStatus = action;

            if (action === 'confirm') newStatus = 'confirmed';
            else if (action === 'cancel') newStatus = 'cancelled';

            // Update order in database
            const { error: updateError } = await supabase
                .from('orders')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', orderId);

            if (updateError) {
                console.error('[Telegram Webhook] Update error:', updateError);
                await answerCallback(update.callback_query.id, 'Xatolik!', TELEGRAM_API);
                return NextResponse.json({ ok: true });
            }

            // Fetch fresh order details
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
                await answerCallback(update.callback_query.id, 'Xatolik!', TELEGRAM_API);
                return NextResponse.json({ ok: true });
            }

            const statusConfig = getStatusConfig(newStatus);
            const statusLabel = statusConfig.tgLabel;
            const updatedText = buildOrderMessage(order, statusLabel);
            const inline_keyboard = getTelegramButtons(newStatus, orderId);

            await fetch(`${TELEGRAM_API}/editMessageText`, {
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

            await answerCallback(update.callback_query.id, `Yangilandi: ${statusLabel}`, TELEGRAM_API);
        }

        return NextResponse.json({ ok: true });

    } catch (error) {
        console.error('[Telegram Webhook] Error:', error);
        return NextResponse.json({ ok: true });
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
        console.error('[Telegram Webhook] Callback error:', err);
    }
}

export async function GET() {
    return NextResponse.json({ status: 'Telegram webhook is active' });
}
