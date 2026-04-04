'use server';

import { revalidatePath } from 'next/cache';
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

export async function updateOrderStatusAction(orderId: string, newStatus: string, lang: string = 'uz') {
    if (!await isAdminVerified()) {
        throw new Error('Unauthorized');
    }

    if (!orderId || !newStatus) {
        throw new Error('Missing orderId or status');
    }

    try {
        // 1. Update Order Status and Fetch Details
        const { data: order, error: updateError } = await serviceClient
            .from('orders')
            .update({ 
                status: newStatus, 
                updated_at: new Date().toISOString() 
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
                total_price,
                comment,
                user_id,
                profiles (full_name, phone_number, telegram_id),
                order_items (*)
            `)
            .single();

        if (updateError) {
            console.error('[Admin Order Action] Update error:', updateError);
            return { error: updateError.message };
        }

        // 2. Sync to Telegram
        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        if (TELEGRAM_BOT_TOKEN && order) {
            try {
                const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
                const deliveryAddr = (order.delivery_address || {}) as any;
                
                const tgLang = resolveOrderLanguage({
                    orderSavedLang: deliveryAddr.lang,
                    adminPreferredLang: await getAdminTgLang(),
                    fallbackLang: lang
                });

                // Task A: Update Admin Group Message
                if (order.telegram_message_id && order.telegram_chat_id) {
                    const messageText = buildOrderMessage(order, tgLang);
                    const inline_keyboard = getTelegramButtons(newStatus, orderId, tgLang);
                    
                    await fetch(`${TELEGRAM_API}/editMessageText`, {
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
                console.error('[Admin Order Action] Sync Error:', syncErr);
            }
        }

        // 3. Revalidate path to update the UI
        revalidatePath('/admin/orders');
        revalidatePath('/admin'); // Dashboard also shows orders
        
        return { success: true, order };
    } catch (error: any) {
        console.error('[Admin Order Action] Final Catch error:', error);
        return { error: error.message || 'Internal server error' };
    }
}
