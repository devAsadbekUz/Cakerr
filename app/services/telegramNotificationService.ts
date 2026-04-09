import { getStatusConfig, tgEscape, buildOrderMessage, getTelegramButtons, resolveOrderLanguage } from '@/app/utils/orderConfig';
import { serviceClient } from '@/app/utils/supabase/service';

function resolveTgLang(code?: string | null): 'uz' | 'ru' {
    if (code?.startsWith('ru')) return 'ru';
    return 'uz';
}

/**
 * Handles the logic of sending a status update to a customer's specific Telegram chat.
 * Implements the "Delete and Replace" pattern to avoid spamming the customer.
 * Auto-cleans terminal statuses (cancelled, completed).
 * 
 * @param orderId The UUID of the order
 * @param newStatus The new status string to apply
 * @param order The detailed order fetch, MUST include `profiles` resolving to get `telegram_id` and `tg_lang`, as well as `client_tg_message_id`.
 */
export async function notifyCustomerStatusChange(orderId: string, newStatus: string, order: any): Promise<void> {
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!TELEGRAM_BOT_TOKEN) {
        console.warn('[notifyCustomerStatusChange] No TELEGRAM_BOT_TOKEN found.');
        return;
    }
    const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

    // Get the primary profile attached to the order
    const profile = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles;

    // If there's no profile or the customer hasn't linked Telegram, there's nobody to notify.
    if (!profile || !profile.telegram_id) {
        return;
    }

    // Determine the customer's preferred language. This fixes the legacy bug where the 
    // web api was trying to send the message in the Admin's language.
    const clientLang = resolveTgLang(profile.tg_lang);

    // 1. Delete previous message if it exists to prevent chat clutter
    if (order.client_tg_message_id) {
        try {
            const delRes = await fetch(`${TELEGRAM_API}/deleteMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: profile.telegram_id,
                    message_id: order.client_tg_message_id
                })
            });
            if (!delRes.ok) {
                const errText = await delRes.text();
                console.error('[notifyCustomerStatusChange] Delete message failed:', delRes.status, errText);
            }
        } catch (err) {
            console.error('[notifyCustomerStatusChange] Delete client msg error:', err);
        }
    }

    // 2. Determine Action Based on Status
    if (newStatus === 'cancelled') {
        // If cancelled, clear message tracking completely. No new message is sent.
        await serviceClient
            .from('orders')
            .update({ client_tg_message_id: null, client_tg_delete_at: null })
            .eq('id', orderId);
        return;
    }

    // For all other statuses, construct and send the newly localized status bubble
    const statusConfig = getStatusConfig(newStatus);
    const shortId = orderId.slice(0, 8);
    const clientLabels = {
        uz: {
            title: "🍰 *Buyurtma holati yangilandi*",
            text: `Hurmatli mijoz, sizning #${shortId} raqamli buyurtmangiz holati o'zgardi:`
        },
        ru: {
            title: "🍰 *Статус заказа обновлен*",
            text: `Уважаемый клиент, статус вашего заказа #${shortId} изменился:`
        }
    }[clientLang];

    const statusLabel = statusConfig.labels[clientLang];
    const statusDesc = statusConfig.descs[clientLang];

    let clientMessage = `${clientLabels.title}\n\n${clientLabels.text}\n\n*${tgEscape(statusLabel)}*\n_${tgEscape(statusDesc)}_`;

    // Payment info for confirmed orders
    if (newStatus === 'confirmed') {
        const depositAmount = Number(order.deposit_amount ?? 0);
        const totalPrice = Number(order.total_price ?? 0);
        if (depositAmount > 0) {
            const remaining = Math.max(0, totalPrice - depositAmount);
            const paymentInfo = clientLang === 'uz'
                ? `\n\n💵 *Avans:* ${depositAmount.toLocaleString()} so'm qabul qilindi\n💰 *Qoldiq:* ${remaining.toLocaleString()} so'm`
                : `\n\n💵 *Аванс:* ${depositAmount.toLocaleString()} сум получен\n💰 *Остаток:* ${remaining.toLocaleString()} сум`;
            clientMessage += paymentInfo;
        } else {
            const noDepositInfo = clientLang === 'uz'
                ? `\n\n⚠️ _Avans to'lovi haqida menejer siz bilan bog'lanadi._`
                : `\n\n⚠️ _Менеджер свяжется с вами по вопросу предоплаты._`;
            clientMessage += noDepositInfo;
        }
    }

    // Payment info for completed orders
    if (newStatus === 'completed') {
        const depositAmount = Number(order.deposit_amount ?? 0);
        const finalPayment = Number(order.final_payment_amount ?? 0);
        const totalPrice = Number(order.total_price ?? 0);
        if (finalPayment > 0 || depositAmount > 0) {
            const paidTotal = depositAmount + finalPayment;
            const paymentSummary = clientLang === 'uz'
                ? `\n\n✅ *Jami to'landi:* ${paidTotal.toLocaleString()} so'm / ${totalPrice.toLocaleString()} so'm`
                : `\n\n✅ *Итого оплачено:* ${paidTotal.toLocaleString()} сум / ${totalPrice.toLocaleString()} сум`;
            clientMessage += paymentSummary;
        }
    }

    // Special additive info for Pickup orders once they are Ready
    if (newStatus === 'ready' && order.delivery_type === 'pickup' && order.branches) {
        const branch = order.branches;
        const bName = clientLang === 'uz' ? branch.name_uz : branch.name_ru;
        const bAddr = clientLang === 'uz' ? branch.address_uz : branch.address_ru;
        const bLink = branch.location_link;

        const pickupInfo = clientLang === 'uz'
            ? `\n\n🏢 *Olib ketish manzili:* ${tgEscape(bName)}\n📍 ${tgEscape(bAddr)}`
            : `\n\n🏢 *Адрес самовывоза:* ${tgEscape(bName)}\n📍 ${tgEscape(bAddr)}`;
        
        clientMessage += pickupInfo;
        if (bLink) {
            const mapLabel = clientLang === 'uz' ? "📍 Xaritada ko'rish" : "📍 Посмотреть на карте";
            clientMessage += `\n\n[${mapLabel}](${bLink})`;
        }
    }

    try {
        const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: profile.telegram_id,
                text: clientMessage,
                parse_mode: 'Markdown'
            })
        });
        if (!res.ok) {
            const errText = await res.text();
            console.error('[notifyCustomerStatusChange] Telegram HTTP error:', res.status, errText);
            return;
        }
        const result = await res.json();

        if (result.ok) {
            console.log(`[notifyCustomerStatusChange] Successfully notified customer ${profile.telegram_id}`);
            // Track the message ID we just sent so we can delete it next time
            // If the status is completed, schedule an automatic self-destruct via the cron job in 24 hours.
            const isCompleted = newStatus === 'completed';
            const deleteAt = isCompleted
                ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                : null;

            await serviceClient
                .from('orders')
                .update({
                    client_tg_message_id: result.result.message_id,
                    client_tg_delete_at: deleteAt
                })
                .eq('id', orderId);
        } else {
            console.error('[notifyCustomerStatusChange] Failed to send message to customer:', result);
        }
    } catch (err) {
        console.error('[notifyCustomerStatusChange] Send message error:', err);
    }
}

/**
 * Notifies the admin Telegram group about a new order.
 * Common logic used by both Web Checkout and POS manual creation.
 * 
 * @param orderId The UUID of the order to notify about
 */
export async function notifyAdminNewOrder(orderId: string): Promise<boolean> {
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
    
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.warn('[notifyAdminNewOrder] Missing Telegram credentials in ENV.');
        return false;
    }

    const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

    try {
        // 1. Fetch complete order details including items and profile
        const { data: order, error: fetchError } = await serviceClient
            .from('orders')
            .select(`
                *,
                profiles (full_name, phone_number, telegram_id),
                branches (name_uz, name_ru, address_uz, address_ru, location_link),
                order_items (*)
            `)
            .eq('id', orderId)
            .single();

        if (fetchError || !order) {
            console.error('[notifyAdminNewOrder] Fetch error:', fetchError);
            return false;
        }

        // 2. Resolve administrative preferred language
        const { data: adminSettings } = await serviceClient
            .from('app_settings')
            .select('value')
            .eq('key', 'admin_tg_lang')
            .single();

        const deliveryAddr = (order.delivery_address || {}) as any;
        const finalLang = resolveOrderLanguage({
            adminPreferredLang: adminSettings?.value,
            orderSavedLang: deliveryAddr.lang,
            fallbackLang: 'uz'
        });

        // 3. Construct message and buttons
        const text = buildOrderMessage(order, finalLang);
        const inline_keyboard = getTelegramButtons('new', orderId, finalLang, order);

        // 4. Send to Telegram
        const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text,
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard }
            })
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error('[notifyAdminNewOrder] Telegram HTTP error:', res.status, errText);
            return false;
        }
        const result = await res.json();
        if (result.ok) {
            // 5. Success! Store the message_id for future edits
            // AND persist the resolved language context so future status updates stay in the same lang
            const updatedAddr = typeof deliveryAddr === 'string' 
                ? { street: deliveryAddr, lang: finalLang } 
                : { ...deliveryAddr, lang: finalLang };

            await serviceClient.from('orders').update({
                telegram_message_id: result.result.message_id,
                telegram_chat_id: TELEGRAM_CHAT_ID,
                delivery_address: updatedAddr
            }).eq('id', orderId);
            return true;
        } else {
            console.error('[notifyAdminNewOrder] Telegram API error:', result);
            return false;
        }
    } catch (err) {
        console.error('[notifyAdminNewOrder] Fatal error:', err);
        return false;
    }
}

/**
 * Notifies the customer whenever a partial payment is added by the admin.
 * Uses the same "Delete and Replace" pattern to keep the chat clean.
 */
export async function notifyCustomerPaymentReceived(orderId: string, increment: number, order: any): Promise<void> {
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!TELEGRAM_BOT_TOKEN) return;

    const profile = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles;
    if (!profile || !profile.telegram_id) return;

    const clientLang = resolveTgLang(profile.tg_lang);
    const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

    // 1. Fetch ALL payment logs for this order to build the ledger list
    const { data: logs } = await serviceClient
        .from('order_payment_logs')
        .select('amount, event_type')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

    // 2. Format the ledger string
    const currency = clientLang === 'uz' ? "so'm" : "сум";
    const ledgerLines = (logs || []).map(log => {
        const amt = Number(log.amount);
        const sign = amt >= 0 ? '+' : '';
        return `▫️ ${sign}${amt.toLocaleString()} ${currency}`;
    }).join('\n');

    // 3. Delete previous message
    if (order.client_tg_message_id) {
        try {
            await fetch(`${TELEGRAM_API}/deleteMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: profile.telegram_id,
                    message_id: order.client_tg_message_id
                })
            });
        } catch (e) { console.error('[notifyPayment] Delete failed', e); }
    }

    // 4. Build message
    const totalPaid = (Number(order.deposit_amount ?? 0)) + (Number(order.final_payment_amount ?? 0));
    const totalPrice = Number(order.total_price ?? 0);

    const title = clientLang === 'uz' ? `💰 *To'lov qabul qilindi!*` : `💰 *Платёж принят!*`;
    const ledgerTitle = clientLang === 'uz' ? `*To'lovlar tarixi:*` : `*История платежей:*`;
    const totalLabel = clientLang === 'uz' ? `✅ *Jami to'landi:*` : `✅ *Всего оплачено:*`;

    const text = `${title}\n\n${ledgerTitle}\n${ledgerLines}\n\n${totalLabel} ${totalPaid.toLocaleString()} / ${totalPrice.toLocaleString()} ${currency}`;

    // 5. Send new message
    try {
        const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: profile.telegram_id,
                text,
                parse_mode: 'Markdown'
            })
        });

        if (res.ok) {
            const result = await res.json();
            // Update order with NEW message ID
            await serviceClient
                .from('orders')
                .update({ client_tg_message_id: result.result.message_id })
                .eq('id', orderId);
        }
    } catch (err) {
        console.error('[notifyPayment] Send error', err);
    }
}
