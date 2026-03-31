import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStatusConfig, getTelegramButtons, buildOrderMessage, resolveOrderLanguage, parseLang } from '@/app/utils/orderConfig';
import { resolveAppUrl } from '@/app/utils/appUrl';

export async function POST(request: NextRequest) {
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
    const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
    const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
    const appUrl = resolveAppUrl(request.nextUrl.origin);

    // Security check: Verify Telegram Webhook Secret Token if configured
    const incomingSecret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (WEBHOOK_SECRET && incomingSecret !== WEBHOOK_SECRET) {
        console.warn('[Telegram Webhook] Unauthorized request blocked (Secret mismatch)');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Telegram Webhook] Incoming message');
    // ... rest of the setup

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
                console.log('[Telegram Webhook] /start command from:', firstName, 'userId:', userId);

                // Check if user already has a profile with phone number
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id, phone_number')
                    .eq('telegram_id', userId)
                    .maybeSingle();

                if (profile?.phone_number) {
                    const replyMarkup = appUrl
                        ? {
                            inline_keyboard: [[{
                                text: '🍰 Buyurtma berish',
                                web_app: { url: appUrl }
                            }]]
                        }
                        : undefined;

                    // Welcome back message - skip contact sharing
                    await fetch(`${TELEGRAM_API}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: chatId,
                            text: `🍰 *Xush kelibsiz qaytib, ${firstName}! *\n\nSiz allaqachon ro'yxatdan o'tgansiz. Buyurtma berishni boshlang! 👇`,
                            parse_mode: 'Markdown',
                            ...(replyMarkup ? { reply_markup: replyMarkup } : {})
                        })
                    });
                    return NextResponse.json({ ok: true });
                }

                // New or incomplete user - ask for contact
                await fetch(`${TELEGRAM_API}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: `🍰 *Xush kelibsiz, ${firstName}! *\n\nTORTEL'E botiga xush kelibsiz! Buyurtma berish uchun telefon raqamingizni ulashing.\n\nQuyidagi tugmani bosing 👇`,
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
                const telegramId = contactUserId || userId;

                console.log('[Telegram Webhook] Contact shared:', phoneNumber, 'UserId:', telegramId);

                // Normalize phone number
                let normalizedPhone = phoneNumber.replace(/\s+/g, '');
                if (!normalizedPhone.startsWith('+')) {
                    normalizedPhone = '+' + normalizedPhone;
                }

                try {
                    // 1. Update/Create profile
                    const { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .upsert({
                            telegram_id: telegramId,
                            phone_number: normalizedPhone,
                            full_name: firstName,
                            username: username,
                            role: 'customer',
                            updated_at: new Date().toISOString()
                        }, { onConflict: 'telegram_id' })
                        .select()
                        .single();

                    if (profileError) {
                        console.error('[Telegram Webhook] Profile upsert error:', profileError);
                        throw profileError;
                    }

                    // 2. Clear any legacy sessions for this user (cleanup)
                    await supabase
                        .from('telegram_sessions')
                        .delete()
                        .eq('telegram_id', telegramId);

                    // 3. Send success message
                    const replyMarkup = appUrl
                        ? {
                            inline_keyboard: [[{
                                text: '🍰 Buyurtma berish',
                                web_app: { url: appUrl }
                            }]]
                        }
                        : undefined;

                    await fetch(`${TELEGRAM_API}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: chatId,
                            text: `✅ *Rahmat!*\n\nTelefon raqamingiz muvaffaqiyatli ulandi: \`${normalizedPhone}\`\n\n🎂 Endi store'da avtomatik kirishingiz mumkin!`,
                            parse_mode: 'Markdown',
                            ...(replyMarkup ? { reply_markup: replyMarkup } : {})
                        })
                    });

                    console.log('[Telegram Webhook] Profile completed for:', normalizedPhone);

                } catch (err: any) {
                    console.error('[Telegram Webhook] Contact error details:', {
                        error: err,
                        message: err.message,
                        code: err.code,
                        details: err.details,
                        hint: err.hint
                    });

                    await fetch(`${TELEGRAM_API}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: chatId,
                            text: `❌ Xatolik yuz berdi. Iltimos keyinroq qayta urinib ko'ring.\n\nError: ${err.message || 'Unknown error'}`
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

            console.log(`[Telegram Webhook] Callback data received: "${callbackData}"`);

            const [action, orderId, extractedLang = 'uz'] = callbackData.split('_');
            let newStatus = action;

            if (action === 'confirm') newStatus = 'confirmed';
            else if (action === 'cancel') newStatus = 'cancelled';

            console.log(`[Telegram Webhook] Action: ${action}, OrderId: ${orderId}, ExtractedLang: ${extractedLang}`);

            // Update order in database
            const { error: updateError } = await supabase
                .from('orders')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', orderId);

            if (updateError) {
                console.error('[Telegram Webhook] Update error:', updateError);
                await answerCallback(update.callback_query.id, 'Xatolik / Ошибка', TELEGRAM_API);
                return NextResponse.json({ ok: true });
            }

            // Fetch fresh order details
            const { data: order, error: fetchError } = await supabase
                .from('orders')
                .select(`
                    id,
                    status,
                    telegram_message_id, 
                    telegram_chat_id, 
                    client_tg_message_id,
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

            if (fetchError || !order) {
                console.error('[Telegram Webhook] Fetch error:', fetchError);
                await answerCallback(update.callback_query.id, 'Xatolik / Ошибка', TELEGRAM_API);
                return NextResponse.json({ ok: true });
            }

            // Prioritize language stored in order.delivery_address, then global setting, then callback data
            const deliveryAddr = (order.delivery_address || {}) as any;

            const { data: adminSettings } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', 'admin_tg_lang')
                .single();

            const orderLang = resolveOrderLanguage({
                orderSavedLang: deliveryAddr.lang,
                adminPreferredLang: adminSettings?.value,
                fallbackLang: extractedLang
            });

            console.log(`[Telegram Webhook] Localization Audit:`, {
                orderId: orderId,
                orderSavedLang: deliveryAddr.lang,
                adminPreferredValue: adminSettings?.value,
                extractedLang,
                finalDecision: orderLang
            });

            // Healing logic: If language wasn't stored yet, or it's malformed, store it now for consistency
            const existingOrderLang = parseLang(deliveryAddr.lang);
            const needsHealing = !deliveryAddr.lang || (typeof deliveryAddr.lang === 'string' && deliveryAddr.lang.includes('"'));
            
            if (needsHealing) {
                console.log(`[Telegram Webhook] Healing order ${orderId} with lang ${orderLang}`);
                let healedAddress = typeof deliveryAddr === 'string' ? { street: deliveryAddr } : { ...deliveryAddr };
                healedAddress.lang = orderLang;

                await supabase.from('orders').update({
                    delivery_address: healedAddress
                }).eq('id', orderId);
            }

            const statusConfig = getStatusConfig(newStatus);
            const updatedText = buildOrderMessage(order, orderLang as 'uz' | 'ru');
            const inline_keyboard = getTelegramButtons(newStatus, orderId, orderLang as 'uz' | 'ru');

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

            // Notify the client directly if they have a telegram_id linked
            const profile = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles;
            if (profile?.telegram_id) {
                // 1. Delete previous message if it exists
                if (order.client_tg_message_id) {
                    await fetch(`${TELEGRAM_API}/deleteMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: profile.telegram_id,
                            message_id: order.client_tg_message_id
                        })
                    }).catch(err => console.error('[Telegram Webhook] Delete client msg error:', err));
                }

                // 2. If not terminal (confirmed, preparing, ready, delivering), send new ping
                const isTerminal = ['completed', 'cancelled'].includes(newStatus);
                if (!isTerminal) {
                    const clientLabels = {
                        uz: {
                            title: "🍰 *Buyurtma holati yangilandi*",
                            text: `Hurmatli mijoz, sizning #${order.id.slice(0, 8)} raqamli buyurtmangiz holati o'zgardi:`
                        },
                        ru: {
                            title: "🍰 *Статус заказа обновлен*",
                            text: `Уважаемый клиент, статус вашего заказа #${order.id.slice(0, 8)} изменился:`
                        }
                    }[orderLang];

                    const clientMessage = `${clientLabels.title}\n\n${clientLabels.text}\n\n*${statusConfig.labels[orderLang]}*\n_${statusConfig.descs[orderLang]}_`;

                    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: profile.telegram_id,
                            text: clientMessage,
                            parse_mode: 'Markdown'
                        })
                    });
                    const result = await res.json();
                    if (result.ok) {
                        // Save new message ID for next cleanup
                        await supabase
                            .from('orders')
                            .update({ client_tg_message_id: result.result.message_id })
                            .eq('id', orderId);
                    }
                } else {
                    // Clear tracking on terminal
                    await supabase
                        .from('orders')
                        .update({ client_tg_message_id: null })
                        .eq('id', orderId);
                }
            }

            const toastText = {
                uz: `Yangilandi: ${statusConfig.tgLabels.uz}`,
                ru: `Обновлено: ${statusConfig.tgLabels.ru}`
            }[orderLang];

            await answerCallback(update.callback_query.id, toastText || 'OK', TELEGRAM_API);
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
