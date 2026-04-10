'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { getTelegramButtons, buildOrderMessage, resolveOrderLanguage } from '@/app/utils/orderConfig';
import { isAdminVerified } from '@/app/utils/admin-auth';
import { notifyCustomerStatusChange, updateAdminOrderMessage } from '@/app/services/telegramNotificationService';
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

export async function updateOrderStatusAction(
    orderId: string,
    newStatus: string,
    lang: string = 'uz',
    cancellationReason?: string,
    depositAmount?: number,
    finalPaymentAmount?: number,
) {
    if (!await isAdminVerified()) {
        throw new Error('Unauthorized');
    }

    if (!orderId || !newStatus) {
        throw new Error('Missing orderId or status');
    }

    try {
        const headersList = await headers();
        const adminName = headersList.get('x-admin-username') || 'System';

        // Fetch current order for payment validation
        const { data: currentOrder } = await serviceClient
            .from('orders')
            .select('total_price, deposit_amount, status')
            .eq('id', orderId)
            .single();

        // Validate final payment must match remaining balance exactly
        if (newStatus === 'completed' && finalPaymentAmount !== undefined && currentOrder) {
            const remaining = currentOrder.total_price - (currentOrder.deposit_amount ?? 0);
            if (finalPaymentAmount !== remaining) {
                return { error: `Final payment must equal remaining balance: ${remaining}` };
            }
        }

        const updatePayload: Record<string, any> = {
            status: newStatus,
            updated_at: new Date().toISOString(),
            last_updated_by_name: adminName
        };

        if (newStatus === 'cancelled' && cancellationReason) {
            updatePayload.cancellation_reason = cancellationReason;
        }

        // Auto-set refund_needed when cancelling with a deposit
        if (newStatus === 'cancelled' && currentOrder && (currentOrder.deposit_amount ?? 0) > 0) {
            updatePayload.refund_needed = true;
        }

        if (newStatus === 'confirmed' && depositAmount !== undefined) {
            updatePayload.deposit_amount = depositAmount;
        }

        if (newStatus === 'completed' && finalPaymentAmount !== undefined) {
            updatePayload.final_payment_amount = finalPaymentAmount;
        }

        const { data: order, error: updateError } = await serviceClient
            .from('orders')
            .update(updatePayload)
            .eq('id', orderId)
            .select(`
                id,
                status,
                total_price,
                deposit_amount,
                final_payment_amount,
                payment_method,
                coins_spent,
                promo_discount,
                created_by_name,
                telegram_message_id,
                telegram_chat_id,
                client_tg_message_id,
                delivery_address,
                delivery_time,
                delivery_slot,
                delivery_type,
                branch_id,
                comment,
                user_id,
                profiles (full_name, phone_number, telegram_id, tg_lang),
                branches (name_uz, name_ru, address_uz, address_ru, location_link),
                order_items (*),
                order_payment_logs (*)
            `)
            .single();

        if (order) {
            (order as any).payment_logs = (order.order_payment_logs || []).sort(
                (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
        }

        if (updateError) {
            console.error('[Admin Order Action] Update error:', updateError);
            return { error: updateError.message };
        }

        // Write payment log entries
        if (newStatus === 'confirmed' && depositAmount !== undefined) {
            await serviceClient.from('order_payment_logs').insert({
                order_id: orderId,
                event_type: 'deposit_recorded',
                amount: depositAmount,
                recorded_by_name: adminName
            });
        }

        if (newStatus === 'completed' && finalPaymentAmount !== undefined) {
            await serviceClient.from('order_payment_logs').insert({
                order_id: orderId,
                event_type: 'final_payment_recorded',
                amount: finalPaymentAmount,
                recorded_by_name: adminName
            });
        }

        // Sync to Telegram
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

                if (order.telegram_message_id && order.telegram_chat_id) {
                    await updateAdminOrderMessage(orderId);
                }

                await notifyCustomerStatusChange(orderId, newStatus, order);

                const needsHealing = !deliveryAddr.lang || (typeof deliveryAddr.lang === 'string' && deliveryAddr.lang.includes('"'));
                if (needsHealing) {
                    const healedAddress = typeof deliveryAddr === 'string'
                        ? { street: deliveryAddr, lang: tgLang }
                        : { ...deliveryAddr, lang: tgLang };
                    await serviceClient.from('orders').update({ delivery_address: healedAddress }).eq('id', orderId);
                }
            } catch (syncErr) {
                console.error('[Admin Order Action] Sync Error:', syncErr);
            }
        }

        revalidatePath('/admin/orders');
        revalidatePath('/admin');

        return { success: true, order };
    } catch (error: any) {
        console.error('[Admin Order Action] Final Catch error:', error);
        return { error: error.message || 'Internal server error' };
    }
}
