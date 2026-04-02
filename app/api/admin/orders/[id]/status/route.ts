import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { getStatusConfig, getTelegramButtons, buildOrderMessage, resolveOrderLanguage, parseLang } from '@/app/utils/orderConfig';
import { notifyCustomerStatusChange } from '@/app/services/telegramNotificationService';

// Service Role client
const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function isAdminVerified(): Promise<boolean> {
    const headersList = await headers();
    return headersList.get('x-admin-verified') === 'true';
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

                // Fetch Global Admin Preference for Telegram Group
                const { data: adminSettings } = await serviceClient
                    .from('app_settings')
                    .select('value')
                    .eq('key', 'admin_tg_lang')
                    .single();

                // Prioritize language stored in order.delivery_address if available
                const deliveryAddr = (order.delivery_address || {}) as any;

                const tgLang = resolveOrderLanguage({
                    orderSavedLang: deliveryAddr.lang,
                    adminPreferredLang: adminSettings?.value,
                    fallbackLang: lang
                });

                console.log(`[Admin Order Status API] Localization Audit:`, {
                    orderId: orderId,
                    orderSavedValue: deliveryAddr.lang,
                    adminPreferredValue: adminSettings?.value,
                    requestedLang: lang,
                    finalDecision: tgLang
                });
                
                // Healing logic: If language wasn't stored yet, or it's malformed, store it now for consistency
                const needsHealing = !deliveryAddr.lang || (typeof deliveryAddr.lang === 'string' && deliveryAddr.lang.includes('"'));
                
                if (needsHealing) {
                    console.log(`[Admin Order Status API] Healing order ${orderId} with lang ${tgLang}`);
                    let healedAddress = typeof deliveryAddr === 'string' ? { street: deliveryAddr } : { ...deliveryAddr };
                    healedAddress.lang = tgLang;

                    await serviceClient.from('orders').update({
                        delivery_address: healedAddress
                    }).eq('id', orderId);
                }
                
                const statusConfig = getStatusConfig(newStatus);

                const tasks = [];

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

            await syncPromise; 
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
