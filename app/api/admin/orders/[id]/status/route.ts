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
        // 0. Extract human identity for the audit log
        const headersList = await request.headers;
        const adminName = headersList.get('x-admin-username') || 'System';

        // 1. Update Order Status and Fetch Details in one atomic step (to avoid double fetching)
        const { data: order, error: updateError } = await serviceClient
            .from('orders')
            .update({ 
                status: newStatus, 
                updated_at: new Date().toISOString(),
                last_updated_by_name: adminName
            })
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
                delivery_type,
                branch_id,
                total_price,
                comment,
                user_id,
                profiles (full_name, phone_number, telegram_id),
                branches (name_uz, name_ru, address_uz, address_ru, location_link),
                order_items (*)
            `)
            .single();

        if (updateError) {
            console.error('[Admin Orders Status API] Update error:', updateError);
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        // 2. Sync to Telegram (Awaited to prevent Vercel termination)
        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        if (TELEGRAM_BOT_TOKEN) {
            try {
                const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
                const profile = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles;

                const deliveryAddr = (order.delivery_address || {}) as any;
                const tgLang = resolveOrderLanguage({
                    orderSavedLang: deliveryAddr.lang,
                    adminPreferredLang: await getAdminTgLang(),
                    fallbackLang: lang
                });

                // Task A: Update Admin Group Message
                if (order.telegram_message_id && order.telegram_chat_id) {
                    const messageText = buildOrderMessage(order, tgLang);
                    const inline_keyboard = getTelegramButtons(newStatus, orderId, tgLang, order);
                    
                    console.log(`[AdminStatusSync] Updating Admin Group Msg: ${order.telegram_message_id} in chat ${order.telegram_chat_id}`);
                    
                    const tgRes = await fetch(`${TELEGRAM_API}/editMessageText`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: order.telegram_chat_id,
                            message_id: order.telegram_message_id,
                            text: messageText,
                            parse_mode: 'Markdown',
                            reply_markup: { inline_keyboard }
                        })
                    });
                    
                    const tgResult = await tgRes.json();
                    if (!tgResult.ok) {
                        console.error('[AdminStatusSync] Telegram Edit Error:', tgResult);
                    } else {
                        console.log('[AdminStatusSync] Telegram Edit Success');
                    }
                } else {
                    console.log('[AdminStatusSync] No Telegram IDs found in order, skipping group update.');
                }

                // Task B: Status Update for Client
                await notifyCustomerStatusChange(orderId, newStatus, order);
                
                // Task C: Heal delivery_address.lang if missing
                const needsHealing = !deliveryAddr.lang || (typeof deliveryAddr.lang === 'string' && deliveryAddr.lang.includes('"'));
                if (needsHealing) {
                    const healedAddress = typeof deliveryAddr === 'string' ? { street: deliveryAddr, lang: tgLang } : { ...deliveryAddr, lang: tgLang };
                    await serviceClient.from('orders').update({ delivery_address: healedAddress }).eq('id', orderId);
                }

            } catch (syncErr) {
                console.error('[AdminStatusSync] Sync Error:', syncErr);
            }
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
