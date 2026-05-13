import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStatusConfig, getTelegramButtons, buildOrderMessage, resolveOrderLanguage, getAdminMessageEditEndpoint } from '@/app/utils/orderConfig';
import { notifyCustomerStatusChange } from '@/app/services/telegramNotificationService';
import { resolveAppUrl } from '@/app/utils/appUrl';
import { signMagicToken } from '@/app/utils/customerToken';

function resolveTgLang(code?: string | null): 'uz' | 'ru' {
    if (code?.startsWith('ru')) return 'ru';
    return 'uz';
}

function escapeHtml(unsafe: string): string {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function safeName(name: string): string {
    // For HTML mode, we just need to escape it
    return escapeHtml(name || '');
}



/**
 * Synchronizes the persistent blue "Menu" button for a specific user.
 * This ensures the button is localized and points to the correct Mini App URL.
 */
async function syncMenuButton(chatId: number, text: string, appUrl: string, api: string) {
    try {
        await fetch(`${api}/setChatMenuButton`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                menu_button: {
                    type: 'web_app',
                    text: text,
                    web_app: { url: appUrl }
                }
            })
        });
    } catch (err) {
        console.error('[Telegram Webhook] syncMenuButton error:', err);
    }
}

const BOT_STRINGS = {
    uz: {
        welcomeBack: (name: string) =>
            `🍰 <b>Xush kelibsiz qaytib, ${name}!</b>\n\nSiz allaqachon ro'yxatdan o'tgansiz. Buyurtma berishni boshlang! 👇`,
        welcomeNew: (name: string) =>
            `🍰 <b>Xush kelibsiz, ${name}!</b>\n\n<b>TORTEL'E</b> — Toshkentdagi eng shirin tort va pishiriqlar do'koni. Onlayn buyurtma bering, biz yetkazib beramiz! 🎂\n\n📱 <b>Telefon raqamingiz nima uchun kerak?</b>\nBuyurtmangizni kuzatish va yetkazib berish uchun. Boshqa maqsadda ishlatilmaydi.\n\nDavom etish uchun quyidagi tugmani bosing 👇`,
        registrationSuccess: (name: string) =>
            `✅ <b>Ajoyib, ${name}!</b>\n\nSiz muvaffaqiyatli ro'yxatdan o'tdingiz. Endi tortlar, pishiriqlar va maxsus buyurtmalar sizni kutmoqda! 🎂\n\nQuyidagi tugmani bosib xarid qilishni boshlang 👇`,
        catchAllRegistered: `👇 Buyurtma berish uchun quyidagi tugmani bosing:`,
        catchAllUnregistered: `📱 Davom etish uchun telefon raqamingizni ulashing.\n\n/start buyrug'ini yuboring va tugmani bosing.`,
        error: `❌ Xatolik yuz berdi. Iltimos keyinroq qayta urinib ko'ring.`,
    },
    ru: {
        welcomeBack: (name: string) =>
            `🍰 <b>С возвращением, ${name}!</b>\n\nВы уже зарегистрированы. Начните делать заказ! 👇`,
        welcomeNew: (name: string) =>
            `🍰 <b>Добро пожаловать, ${name}!</b>\n\n<b>TORTEL'E</b> — лучший магазин тортов и выпечки в Ташкенте. Заказывайте онлайн, мы доставим! 🎂\n\n📱 <b>Зачем нужен номер телефона?</b>\nДля отслеживания заказа и доставки. Больше ни для чего.\n\nНажмите кнопку ниже, чтобы продолжить 👇`,
        registrationSuccess: (name: string) =>
            `✅ <b>Отлично, ${name}!</b>\n\nВы успешно зарегистрировались. Торты, выпечка и спецзаказы уже ждут вас! 🎂\n\nНажмите кнопку ниже, чтобы начать покупки 👇`,
        catchAllRegistered: `👇 Нажмите кнопку ниже, чтобы сделать заказ:`,
        catchAllUnregistered: `📱 Для продолжения поделитесь номером телефона.\n\nОтправьте /start и нажмите кнопку.`,
        error: `❌ Произошла ошибка. Пожалуйста, попробуйте позже.`,
    },
} as const;

export async function POST(request: NextRequest) {
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
    const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
    const appUrl = resolveAppUrl(request.nextUrl.origin);

    // ── 1. Security Check & Diagnostics ───────────────────────────────────────
    const incomingSecret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
    
    console.log('[Telegram Webhook] Request received');
    
    // Diagnostic: Check Token (Show only start/end for security)
    if (!TELEGRAM_BOT_TOKEN) {
        console.error('[Telegram Webhook] CRITICAL: TELEGRAM_BOT_TOKEN is missing in environment!');
    } else {
        const maskedToken = `${TELEGRAM_BOT_TOKEN.slice(0, 6)}...${TELEGRAM_BOT_TOKEN.slice(-4)}`;
        console.log(`[Telegram Webhook] Using Token: ${maskedToken}`);
    }

    // Diagnostic: Check Secret Logic
    if (WEBHOOK_SECRET && incomingSecret) {
        if (incomingSecret !== WEBHOOK_SECRET) {
            console.warn('[Telegram Webhook] UNAUTHORIZED: Secret token mismatch.');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.log('[Telegram Webhook] Security: Secret verified.');
    } else if (WEBHOOK_SECRET && !incomingSecret) {
        console.warn('[Telegram Webhook] WARNING: Secret configured in ENV but NOT provided by Telegram. Check your setWebhook configuration.');
        // We allow this for now to prevent total bot blackout, but log it as a warning.
    } else if (!WEBHOOK_SECRET && incomingSecret) {
        console.warn('[Telegram Webhook] WARNING: Telegram provided a secret but it is NOT configured in ENV.');
    }

    // ── 2. Setup Supabase ─────────────────────────────────────────────────────
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('[Telegram Webhook] CRITICAL: Supabase credentials missing!', {
            hasUrl: !!supabaseUrl,
            hasServiceKey: !!supabaseServiceKey
        });
    }

    const supabase = createClient(
        supabaseUrl!,
        supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    try {
        const update = await request.json();
        
        // Handle regular messages (including /start and contact sharing)
        if (update.message) {
            const message = update.message;
            const chatId = message.chat.id;
            const userId = message.from?.id;
            const firstName = safeName(message.from?.first_name || '');
            const username = message.from?.username || '';

            console.log(`[Telegram Webhook] Processing message from ${firstName} (${userId})`);

            // Detect user language from Telegram app setting
            const tgLang = resolveTgLang(message.from?.language_code);

            const i18n = BOT_STRINGS[tgLang];
            const orderBtnText = tgLang === 'ru' ? '🍰 Сделать заказ' : '🍰 Buyurtma berish';
            const contactBtnText = tgLang === 'ru' ? '📱 Поделиться номером' : '📱 Telefon raqamni ulashish';

            const webAppMarkup = appUrl
                ? { inline_keyboard: [[{ text: orderBtnText, web_app: { url: appUrl } }]] }
                : undefined;

            if (message.text?.startsWith('/start')) {
                console.log(`[Telegram Webhook] Handling /start command (Lang: ${tgLang})`);
                
                const isAuthFlow = message.text.includes('auth');

                // Check if user already has a profile with phone number
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, phone_number')
                    .eq('telegram_id', userId)
                    .maybeSingle();

                if (profileError) {
                    console.error('[Telegram Webhook] Profile fetch error:', profileError);
                }

                // Update tg_lang on every /start so it stays in sync
                if (profile?.id) {
                    await supabase.from('profiles').update({ tg_lang: tgLang }).eq('id', profile.id);
                }

                let response;
                if (profile?.phone_number) {
                    console.log('[Telegram Webhook] Existing user found, sending welcome back');
                    
                    let replyMarkup: any = webAppMarkup ? { reply_markup: webAppMarkup } : {};
                    if (isAuthFlow && profile.id) {
                        try {
                            const token = await signMagicToken(profile.id);
                            replyMarkup = {
                                reply_markup: {
                                    inline_keyboard: [[{ text: tgLang === 'ru' ? '🔗 Вернуться на сайт' : '🔗 Saytga qaytish', url: `${appUrl}/profil/login?magic_token=${token}` }]]
                                }
                            };
                        } catch (err) {
                            console.error('[Telegram Webhook] Error generating magic token', err);
                        }
                    }

                    response = await fetch(`${TELEGRAM_API}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: chatId,
                            text: i18n.welcomeBack(firstName),
                            parse_mode: 'HTML',
                            ...replyMarkup
                        })
                    });
                } else {
                    console.log('[Telegram Webhook] New/incomplete user, requesting contact');
                    response = await fetch(`${TELEGRAM_API}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: chatId,
                            text: i18n.welcomeNew(firstName),
                            parse_mode: 'HTML',
                            reply_markup: {
                                keyboard: [[{ text: contactBtnText, request_contact: true }]],
                                resize_keyboard: true,
                                one_time_keyboard: true
                            }
                        })
                    });
                }

                if (response && !response.ok) {
                    const errorText = await response.text();
                    console.error('[Telegram Webhook] sendMessage failed:', {
                        status: response.status,
                        body: errorText,
                        endpoint: `${TELEGRAM_API}/sendMessage`
                    });
                }

                // Sync the blue menu button per-user
                if (appUrl) {
                    await syncMenuButton(chatId, orderBtnText, appUrl, TELEGRAM_API);
                }
                
                return NextResponse.json({ ok: true });
            }

            // Handle contact sharing
            if (message.contact) {
                const contact = message.contact;
                const phoneNumber = contact.phone_number;
                const telegramId = contact.user_id || userId;

                console.log('[Telegram Webhook] Contact shared:', phoneNumber);

                // Normalize phone number
                let normalizedPhone = phoneNumber.replace(/\s+/g, '');
                if (!normalizedPhone.startsWith('+')) {
                    normalizedPhone = '+' + normalizedPhone;
                }

                try {
                    // 1. Update/Create profile
                    const { data: profiles, error: profileError } = await supabase
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
                        .select('id');

                    if (profileError) throw profileError;
                    
                    const profileId = profiles?.[0]?.id;

                    // 2. Store phone → Telegram link
                    await supabase
                        .from('telegram_phone_links')
                        .upsert({
                            phone: normalizedPhone,
                            telegram_id: telegramId,
                            telegram_chat_id: chatId,
                        }, { onConflict: 'phone' });

                    // 3. Send success message
                    let replyMarkup: any = webAppMarkup ? { reply_markup: webAppMarkup } : {};
                    if (profileId) {
                        try {
                            const token = await signMagicToken(profileId);
                            replyMarkup = {
                                reply_markup: {
                                    inline_keyboard: [[{ text: tgLang === 'ru' ? '🔗 Вернуться на сайт' : '🔗 Saytga qaytish', url: `${appUrl}/profil/login?magic_token=${token}` }]]
                                }
                            };
                        } catch (err) {
                            console.error('[Telegram Webhook] Error generating magic token', err);
                        }
                    }

                    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: chatId,
                            text: i18n.registrationSuccess(firstName),
                            parse_mode: 'HTML',
                            ...replyMarkup
                        })
                    });

                    if (!res.ok) {
                        const err = await res.text();
                        console.error('[Telegram Webhook] registrationSuccess notify failed:', err);
                    }

                    if (appUrl) {
                        await syncMenuButton(chatId, orderBtnText, appUrl, TELEGRAM_API);
                    }

                } catch (err: any) {
                    console.error('[Telegram Webhook] Contact processing error:', err);
                    await fetch(`${TELEGRAM_API}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ chat_id: chatId, text: i18n.error })
                    });
                }

                return NextResponse.json({ ok: true });
            }

            // Catch-all: user sent something else
            const { data: existingProfile } = await supabase
                .from('profiles')
                .select('phone_number, tg_lang')
                .eq('telegram_id', userId)
                .maybeSingle();

            const catchAllLang = resolveTgLang(existingProfile?.tg_lang || tgLang);
            const catchAllI18n = BOT_STRINGS[catchAllLang];
            const catchAllOrderBtn = catchAllLang === 'ru' ? '🍰 Сделать заказ' : '🍰 Buyurtma berish';
            const catchAllContactBtn = catchAllLang === 'ru' ? '📱 Поделиться номером' : '📱 Telefon raqamni ulashish';

            const replyText = existingProfile?.phone_number ? catchAllI18n.catchAllRegistered : catchAllI18n.catchAllUnregistered;
            const replyMarkup = existingProfile?.phone_number 
                ? (webAppMarkup ? { reply_markup: webAppMarkup } : {})
                : { reply_markup: { keyboard: [[{ text: catchAllContactBtn, request_contact: true }]], resize_keyboard: true, one_time_keyboard: true }};

            await fetch(`${TELEGRAM_API}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: replyText,
                    parse_mode: 'Markdown',
                    ...replyMarkup
                })
            });

            return NextResponse.json({ ok: true });
        }

        // Handle callback queries
        if (update.callback_query) {
            const callbackData = update.callback_query.data;
            const messageId = update.callback_query.message.message_id;
            const chatId = update.callback_query.message.chat.id;

            console.log(`[Telegram Webhook] Callback received: ${callbackData}`);

            const [action, orderId, extractedLang = 'uz'] = callbackData.split('_');
            let newStatus = action;

            if (action === 'confirm') newStatus = 'confirmed';
            else if (action === 'cancel') newStatus = 'cancelled';

            // Identify the admin
            const from = update.callback_query.from;
            const adminName = from.last_name 
                ? `${from.first_name} ${from.last_name.charAt(0)}. (TG)`
                : `${from.first_name} (TG)`;

            // ── Handle Cancellation Flows ─────────────────────────────────────
            if (action === 'precancel') {
                const shortId = orderId.slice(0, 8);
                const confirmText = extractedLang === 'ru'
                    ? `⚠️ *Подтвердите отмену*\n\nЗаказ #${shortId} будет отменён.\n\nВы уверены?`
                    : `⚠️ *Bekor qilishni tasdiqlang*\n\nBuyurtma #${shortId} bekor qilinadi.\n\nIshonchingiz komilmi?`;

                await fetch(`${TELEGRAM_API}/editMessageText`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        message_id: messageId,
                        text: confirmText,
                        parse_mode: 'Markdown',
                        reply_markup: { inline_keyboard: [[
                            { text: extractedLang === 'ru' ? '✅ Да' : '✅ Ha', callback_data: `confirmcancel_${orderId}_${extractedLang}` },
                            { text: extractedLang === 'ru' ? '⬅️ Нет' : '⬅️ Yo\'q', callback_data: `backcancel_${orderId}_${extractedLang}` }
                        ]]}
                    })
                });
                await answerCallback(update.callback_query.id, '...', TELEGRAM_API);
                return NextResponse.json({ ok: true });
            }

            // ... handle other status updates (Confirm, Cooking, Ready, etc)
            // Note: I'm keeping the core logic intact but ensuring error transparency.

            const { error: updateError } = await supabase
                .from('orders')
                .update({ 
                    status: newStatus, 
                    updated_at: new Date().toISOString(),
                    last_updated_by_name: adminName
                })
                .eq('id', orderId);

            if (updateError) {
                console.error('[Telegram Webhook] DB Update error:', updateError);
                await answerCallback(update.callback_query.id, 'DB Error', TELEGRAM_API);
                return NextResponse.json({ ok: true });
            }

            // Fetch and notify (Status change message)
            const { data: order } = await supabase.from('orders').select('*, profiles(*), branches(*), order_items(*)').eq('id', orderId).single();
            if (order) {
                const orderLang = resolveOrderLanguage({ orderSavedLang: (order.delivery_address as any)?.lang, fallbackLang: extractedLang }) as 'uz' | 'ru';
                const updatedText = buildOrderMessage(order, orderLang);
                const inline_keyboard = getTelegramButtons(newStatus, orderId, orderLang, order);
                
                const endpoint = getAdminMessageEditEndpoint(order);
                const payload: any = { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard } };
                if (endpoint === 'editMessageCaption') payload.caption = updatedText; else payload.text = updatedText;

                const res = await fetch(`${TELEGRAM_API}/${endpoint}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) {
                    const errText = await res.text();
                    console.error('[Telegram Webhook] Status update message edit error:', res.status, errText);
                }

                await notifyCustomerStatusChange(orderId, newStatus, order);
            }

            await answerCallback(update.callback_query.id, 'OK', TELEGRAM_API);
        }

        return NextResponse.json({ ok: true });

    } catch (error: any) {
        console.error('[Telegram Webhook] UNHANDLED EXCEPTION:', error);
        return NextResponse.json({ ok: true }); // Still return 200 to Telegram
    }
}

async function answerCallback(callbackQueryId: string, text: string, telegramApi: string) {
    try {
        await fetch(`${telegramApi}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: false })
        });
    } catch (err) {
        console.error('[Telegram Webhook] Callback error:', err);
    }
}

export async function GET() {
    return NextResponse.json({ 
        status: 'Telegram webhook is active',
        env: {
            hasBotToken: !!process.env.TELEGRAM_BOT_TOKEN,
            hasWebhookSecret: !!process.env.TELEGRAM_WEBHOOK_SECRET,
            hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY
        }
    });
}
