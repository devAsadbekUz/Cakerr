import { getStatusConfig, tgEscape, buildOrderMessage, getTelegramButtons, resolveOrderLanguage, buildCustomerStatusMessage } from '@/app/utils/orderConfig';
import { serviceClient } from '@/app/utils/supabase/service';

function resolveTgLang(code?: string | null): 'uz' | 'ru' {
    if (code?.startsWith('ru')) return 'ru';
    return 'uz';
}

/**
 * Re-usable helper to fetch everything needed for a customer status bubble
 */
async function fetchCustomerOrderContext(orderId: string) {
    const { data: order } = await serviceClient
        .from('orders')
        .select(`
            *,
            profiles (full_name, phone_number, telegram_id, tg_lang),
            branches (name_uz, name_ru, address_uz, address_ru, location_link),
            order_payment_logs (*)
        `)
        .eq('id', orderId)
        .single();
    
    if (order) {
        (order as any).payment_logs = (order.order_payment_logs || []).sort(
            (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
    }
    return order;
}

/**
 * Handles the logic of sending a status update to a customer's specific Telegram chat.
 */
export async function notifyCustomerStatusChange(orderId: string, newStatus: string, order: any): Promise<void> {
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!TELEGRAM_BOT_TOKEN) return;
    const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

    // 1. Fetch unified context
    const orderWithLogs = await fetchCustomerOrderContext(orderId);
    if (!orderWithLogs) return;

    const profile = Array.isArray(orderWithLogs.profiles) ? orderWithLogs.profiles[0] : orderWithLogs.profiles;
    if (!profile || !profile.telegram_id) return;
    
    const clientLang = resolveTgLang(profile.tg_lang);

    // 2. Delete previous message if it exists
    if (orderWithLogs.client_tg_message_id) {
        try {
            await fetch(`${TELEGRAM_API}/deleteMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: profile.telegram_id,
                    message_id: orderWithLogs.client_tg_message_id
                })
            });
        } catch (err) { console.error('[notifyStatus] Delete failed', err); }
    }

    // 3. Determine Action Based on Status
    if (newStatus === 'cancelled') {
        await serviceClient
            .from('orders')
            .update({ client_tg_message_id: null, client_tg_delete_at: null })
            .eq('id', orderId);
        return;
    }

    // 4. Build unified message
    const clientMessage = buildCustomerStatusMessage(orderWithLogs, clientLang);

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
    const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

    // 1. Fetch unified context
    const orderWithLogs = await fetchCustomerOrderContext(orderId);
    if (!orderWithLogs) return;

    const profile = Array.isArray(orderWithLogs.profiles) ? orderWithLogs.profiles[0] : orderWithLogs.profiles;
    if (!profile || !profile.telegram_id) return;
    
    const clientLang = resolveTgLang(profile.tg_lang);

    // 2. Delete previous message if it exists
    if (orderWithLogs.client_tg_message_id) {
        try {
            await fetch(`${TELEGRAM_API}/deleteMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: profile.telegram_id,
                    message_id: orderWithLogs.client_tg_message_id
                })
            });
        } catch (err) { console.error('[notifyPayment] Delete failed', err); }
    }

    // 3. Build unified message
    const clientMessage = buildCustomerStatusMessage(orderWithLogs, clientLang);

    // 4. Send message

    // 5. Send new message
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

        if (res.ok) {
            const result = await res.json();
            
            // If the order is already completed, ensure this new payment message also self-destructs in 24h
            const deleteAt = order.status === 'completed'
                ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                : null;

            // Update order with NEW message ID and deletion timer
            await serviceClient
                .from('orders')
                .update({ 
                    client_tg_message_id: result.result.message_id,
                    client_tg_delete_at: deleteAt
                })
                .eq('id', orderId);
            
            // 6. SYNC: Update the Admin Group message as well
            await updateAdminOrderMessage(orderId);
        }
    } catch (err) {
        console.error('[notifyPayment] Send error', err);
    }
}

/**
 * Re-fetches an order with its complete ledger and updates the corresponding
 * message in the Admin Telegram Group.
 */
export async function updateAdminOrderMessage(orderId: string): Promise<void> {
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!TELEGRAM_BOT_TOKEN) return;
    const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

    try {
        // 1. Fetch complete order details including items, profile AND payment logs
        const { data: order, error: fetchError } = await serviceClient
            .from('orders')
            .select(`
                *,
                profiles (full_name, phone_number, telegram_id, tg_lang),
                branches (name_uz, name_ru, address_uz, address_ru, location_link),
                order_items (*),
                order_payment_logs (*)
            `)
            .eq('id', orderId)
            .single();

        if (fetchError || !order || !order.telegram_message_id || !order.telegram_chat_id) {
            return;
        }

        // 2. Attach sorted payment logs to order object for the builder
        order.payment_logs = (order.order_payment_logs || []).sort(
            (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        // 3. Resolve language (Admin group follows Admin's language setting primarily)
        const { data: settings } = await serviceClient.from('app_settings').select('value').eq('key', 'admin_tg_lang').single();
        const lang = resolveOrderLanguage({
            adminPreferredLang: settings?.value,
            orderSavedLang: order.delivery_address?.lang,
            fallbackLang: 'uz'
        });

        // 4. Build and send edit request
        const text = buildOrderMessage(order, lang);
        const inline_keyboard = getTelegramButtons(order.status, orderId, lang, order);

        await fetch(`${TELEGRAM_API}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: order.telegram_chat_id,
                message_id: order.telegram_message_id,
                text,
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard }
            })
        });
    } catch (err) {
        console.error('[updateAdminOrderMessage] Error:', err);
    }
}
