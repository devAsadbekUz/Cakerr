import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStatusConfig, getTelegramButtons, buildOrderMessage, resolveOrderLanguage } from '@/app/utils/orderConfig';
import { notifyCustomerStatusChange } from '@/app/services/telegramNotificationService';
import { resolveAppUrl } from '@/app/utils/appUrl';

function resolveTgLang(code?: string | null): 'uz' | 'ru' {
    if (code?.startsWith('ru')) return 'ru';
    return 'uz';
}

function safeName(name: string): string {
    // Strip Markdown special characters that could break Telegram message formatting
    return name.replace(/[*_`[\]()~>#+=|{}.!\\]/g, '');
}

const BOT_STRINGS = {
    uz: {
        welcomeBack: (name: string) =>
            `🍰 *Xush kelibsiz qaytib, ${name}!*\n\nSiz allaqachon ro'yxatdan o'tgansiz. Buyurtma berishni boshlang! 👇`,
        welcomeNew: (name: string) =>
            `🍰 *Xush kelibsiz, ${name}!*\n\nTORTEL'E — Toshkentdagi eng shirin tort va pishiriqlar do'koni. Onlayn buyurtma bering, biz yetkazib beramiz! 🎂\n\n📱 *Telefon raqamingiz nima uchun kerak?*\nBuyurtmangizni kuzatish va yetkazib berish uchun. Boshqa maqsadda ishlatilmaydi.\n\nDavom etish uchun quyidagi tugmani bosing 👇`,
        registrationSuccess: (name: string) =>
            `✅ *Ajoyib, ${name}!*\n\nSiz muvaffaqiyatli ro'yxatdan o'tdingiz. Endi tortlar, pishiriqlar va maxsus buyurtmalar sizni kutmoqda! 🎂\n\nQuyidagi tugmani bosib xarid qilishni boshlang 👇`,
        catchAllRegistered: `👇 Buyurtma berish uchun quyidagi tugmani bosing:`,
        catchAllUnregistered: `📱 Davom etish uchun telefon raqamingizni ulashing.\n\n/start buyrug'ini yuboring va tugmani bosing.`,
        error: `❌ Xatolik yuz berdi. Iltimos keyinroq qayta urinib ko'ring.`,
    },
    ru: {
        welcomeBack: (name: string) =>
            `🍰 *С возвращением, ${name}!*\n\nВы уже зарегистрированы. Начните делать заказ! 👇`,
        welcomeNew: (name: string) =>
            `🍰 *Добро пожаловать, ${name}!*\n\nTORTEL'E — лучший магазин тортов и выпечки в Ташкенте. Заказывайте онлайн, мы доставим! 🎂\n\n📱 *Зачем нужен номер телефона?*\nДля отслеживания заказа и доставки. Больше ни для чего.\n\nНажмите кнопку ниже, чтобы продолжить 👇`,
        registrationSuccess: (name: string) =>
            `✅ *Отлично, ${name}!*\n\nВы успешно зарегистрировались. Торты, выпечка и спецзаказы уже ждут вас! 🎂\n\nНажмите кнопку ниже, чтобы начать покупки 👇`,
        catchAllRegistered: `👇 Нажмите кнопку ниже, чтобы сделать заказ:`,
        catchAllUnregistered: `📱 Для продолжения поделитесь номером телефона.\n\nОтправьте /start и нажмите кнопку.`,
        error: `❌ Произошла ошибка. Пожалуйста, попробуйте позже.`,
    },
} as const;

export async function POST(request: NextRequest) {
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
    const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
    const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
    const appUrl = resolveAppUrl(request.nextUrl.origin);
    if (!appUrl) console.error('[Telegram Webhook] appUrl is null — web app buttons will not be sent. Set NEXT_PUBLIC_APP_URL in env.');

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
            const firstName = safeName(message.from?.first_name || '');
            const username = message.from?.username || '';

            // Detect user language from Telegram app setting
            const tgLang = resolveTgLang(message.from?.language_code);

            const i18n = BOT_STRINGS[tgLang];
            const orderBtnText = tgLang === 'ru' ? '🍰 Сделать заказ' : '🍰 Buyurtma berish';
            const contactBtnText = tgLang === 'ru' ? '📱 Поделиться номером' : '📱 Telefon raqamni ulashish';

            const webAppMarkup = appUrl
                ? { inline_keyboard: [[{ text: orderBtnText, web_app: { url: appUrl } }]] }
                : undefined;

            // Handle /start command
            if (message.text?.startsWith('/start')) {
                console.log('[Telegram Webhook] /start command from:', firstName, 'userId:', userId, 'lang:', tgLang);

                // Check if user already has a profile with phone number
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id, phone_number')
                    .eq('telegram_id', userId)
                    .maybeSingle();

                // Update tg_lang on every /start so it stays in sync
                if (profile?.id) {
                    await supabase.from('profiles').update({ tg_lang: tgLang }).eq('id', profile.id);
                }

                if (profile?.phone_number) {
                    await fetch(`${TELEGRAM_API}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: chatId,
                            text: i18n.welcomeBack(firstName),
                            parse_mode: 'Markdown',
                            ...(webAppMarkup ? { reply_markup: webAppMarkup } : {})
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
                        text: i18n.welcomeNew(firstName),
                        parse_mode: 'Markdown',
                        reply_markup: {
                            keyboard: [[{ text: contactBtnText, request_contact: true }]],
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
                    // 1. Update/Create profile — store tg_lang
                    const { error: profileError } = await supabase
                        .from('profiles')
                        .upsert({
                            telegram_id: telegramId,
                            phone_number: normalizedPhone,
                            full_name: firstName,
                            username: username,
                            role: 'customer',
                            tg_lang: tgLang,
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
                    await fetch(`${TELEGRAM_API}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: chatId,
                            text: i18n.registrationSuccess(firstName),
                            parse_mode: 'Markdown',
                            ...(webAppMarkup ? { reply_markup: webAppMarkup } : {})
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
                            text: i18n.error
                        })
                    });
                }

                return NextResponse.json({ ok: true });
            }

            // Catch-all: user sent something we don't understand
            const { data: existingProfile } = await supabase
                .from('profiles')
                .select('phone_number, tg_lang')
                .eq('telegram_id', userId)
                .maybeSingle();

            // Use stored lang if available, otherwise use detected lang
            const catchAllLang = resolveTgLang(existingProfile?.tg_lang || tgLang);
            const catchAllI18n = BOT_STRINGS[catchAllLang];
            const catchAllOrderBtn = catchAllLang === 'ru' ? '🍰 Сделать заказ' : '🍰 Buyurtma berish';
            const catchAllContactBtn = catchAllLang === 'ru' ? '📱 Поделиться номером' : '📱 Telefon raqamni ulashish';

            if (existingProfile?.phone_number) {
                const catchAllMarkup = appUrl
                    ? { inline_keyboard: [[{ text: catchAllOrderBtn, web_app: { url: appUrl } }]] }
                    : undefined;

                await fetch(`${TELEGRAM_API}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: catchAllI18n.catchAllRegistered,
                        parse_mode: 'Markdown',
                        ...(catchAllMarkup ? { reply_markup: catchAllMarkup } : {})
                    })
                });
            } else {
                await fetch(`${TELEGRAM_API}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: catchAllI18n.catchAllUnregistered,
                        parse_mode: 'Markdown',
                        reply_markup: {
                            keyboard: [[{ text: catchAllContactBtn, request_contact: true }]],
                            resize_keyboard: true,
                            one_time_keyboard: true
                        }
                    })
                });
            }

            return NextResponse.json({ ok: true });
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
            
            // Identify the admin from Telegram
            const from = update.callback_query.from;
            const adminName = from.last_name 
                ? `${from.first_name} ${from.last_name.charAt(0)}. (TG)`
                : `${from.first_name} (TG)`;

            // Update order in database
            const { error: updateError } = await supabase
                .from('orders')
                .update({ 
                    status: newStatus, 
                    updated_at: new Date().toISOString(),
                    last_updated_by_name: adminName
                })
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
                    delivery_type,
                    branch_id,
                    total_price,
                    comment,
                    user_id,
                    profiles (full_name, phone_number, telegram_id, tg_lang),
                    branches (name_uz, name_ru, address_uz, address_ru, location_link),
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
            const needsHealing = !deliveryAddr.lang || (typeof deliveryAddr.lang === 'string' && deliveryAddr.lang.includes('"'));
            
            if (needsHealing) {
                console.log(`[Telegram Webhook] Healing order ${orderId} with lang ${orderLang}`);
                let healedAddress = typeof deliveryAddr === 'string' ? { street: deliveryAddr } : { ...deliveryAddr };
                healedAddress.lang = orderLang;

                await supabase.from('orders').update({
                    delivery_address: healedAddress,
                    last_updated_by_name: adminName
                }).eq('id', orderId);
            }

            const statusConfig = getStatusConfig(newStatus);
            const updatedText = buildOrderMessage(order, orderLang as 'uz' | 'ru');
            const inline_keyboard = getTelegramButtons(newStatus, orderId, orderLang as 'uz' | 'ru', order);

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
            // Refactored to centralized service to fix language bugs and completion handling
            await notifyCustomerStatusChange(orderId, newStatus, order);

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
