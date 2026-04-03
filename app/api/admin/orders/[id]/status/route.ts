import { NextRequest, NextResponse } from 'next/server';
import { getTelegramButtons, buildOrderMessage, resolveOrderLanguage } from '@/app/utils/orderConfig';
import { isAdminVerified } from '@/app/utils/admin-auth';
import { notifyCustomerStatusChange } from '@/app/services/telegramNotificationService';
import { serviceClient } from '@/app/utils/supabase/service';

// Cache admin_tg_lang for 5 minutes — it almost never changes
let cachedAdminLang: string | null = null;
let adminLangCachedAt = 0;
const ADMIN_LANG_TTL_MS = 5 * 60 * 1000;

async function getAdminTgLang(): Promise<string | null> {
    if (cachedAdminLang !== null && Date.now() - adminLangCachedAt < ADMIN_LANG_TTL_MS) {
        return cachedAdminLang;
    }
    const { data } = await serviceClient
        .from('app_settings')
        .select('value')
        .eq('key', 'admin_tg_lang')
        .single();
    cachedAdminLang = data?.value ?? null;
    adminLangCachedAt = Date.now();
    return cachedAdminLang;
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!await isAdminVerified()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: orderId } = await params;
    const { status: newStatus, lang = 'uz' } = await request.json();

    if (!orderId || !newStatus) {
        return NextResponse.json({ error: 'Missing orderId or status' }, { status: 400 });
    }

    try {
        // 1. Update Order Status and Fetch Details in one atomic step (to avoid double fetching)
        const { data: order, error: updateError } = await serviceClient
            .from('orders')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', orderId)
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
            .single();

        if (updateError) {
            console.error('[Admin Orders Status API] Update error:', updateError);
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        // 2. Trigger Telegram Sync (Backgrounded / Parallelized)
        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        if (TELEGRAM_BOT_TOKEN) {
            const syncPromise = (async () => {
                const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
                const profile = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles;

                // Prioritize language stored in order.delivery_address if available
                const deliveryAddr = (order.delivery_address || {}) as any;

                const tgLang = resolveOrderLanguage({
                    orderSavedLang: deliveryAddr.lang,
                    adminPreferredLang: await getAdminTgLang(),
                    fallbackLang: lang
                });

                const tasks = [];

                // Heal delivery_address.lang if missing or malformed — runs in parallel with Telegram tasks
                const needsHealing = !deliveryAddr.lang || (typeof deliveryAddr.lang === 'string' && deliveryAddr.lang.includes('"'));
                if (needsHealing) {
                    const healedAddress = typeof deliveryAddr === 'string' ? { street: deliveryAddr, lang: tgLang } : { ...deliveryAddr, lang: tgLang };
                    tasks.push(serviceClient.from('orders').update({ delivery_address: healedAddress }).eq('id', orderId));
                }

                // Task A: Update Admin Group Message (Edit existing)
                if (order.telegram_message_id && order.telegram_chat_id) {
                    const messageText = buildOrderMessage(order, tgLang);
                    const inline_keyboard = getTelegramButtons(newStatus, orderId, tgLang);
                    
                    tasks.push(fetch(`${TELEGRAM_API}/editMessageText`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: order.telegram_chat_id,
                            message_id: order.telegram_message_id,
                            text: messageText,
                            parse_mode: 'Markdown',
                            reply_markup: { inline_keyboard }
                        })
                    }).then(r => r.json()));
                }

                // Task B: Status Update for Client (Refactored to centralized service)
                tasks.push(notifyCustomerStatusChange(orderId, newStatus, order));

                await Promise.all(tasks).catch(err => console.error('[Admin Orders Status API] Parallel Sync error:', err));
            })();

            syncPromise.catch(err => console.error('[Admin Orders Status API] Background sync error:', err));
        }

        return NextResponse.json({ success: true, order });
    } catch (error: any) {
        console.error('[Admin Orders Status API] Final Catch error:', error);
        return NextResponse.json({ 
            error: error.message || 'Internal server error',
            details: error.stack
        }, { status: 500 });
    }
}
