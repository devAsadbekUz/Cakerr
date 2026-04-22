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
 * Helper to determine if an order contains a reference photo, 
 * which dictates which Telegram API endpoint to use for updates.
 */
function isPhotoOrder(order: any): boolean {
    if (!order.order_items || order.order_items.length === 0) return false;
    return order.order_items.some((item: any) => {
        const cfg = item.configuration || {};
        const photoUrl = cfg.uploaded_photo_url || cfg.photo_ref || cfg.photoRef;
        return photoUrl && typeof photoUrl === 'string' && photoUrl.startsWith('http');
    });
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
        
        // 4. Resolve all photos from custom items
        const allPhotoUrls: string[] = [];
        if (order.order_items && order.order_items.length > 0) {
            for (const item of order.order_items) {
                const cfg = item.configuration || {};
                
                // Collect from new array structure
                if (Array.isArray(cfg.photo_refs)) {
                    cfg.photo_refs.forEach((url: any) => {
                        if (typeof url === 'string' && url.startsWith('http')) {
                            allPhotoUrls.push(url);
                        }
                    });
                } else {
                    // Fallback to individual keys
                    const photoUrl = cfg.uploaded_photo_url || cfg.photo_ref || cfg.photoRef;
                    if (photoUrl && typeof photoUrl === 'string' && photoUrl.startsWith('http')) {
                        allPhotoUrls.push(photoUrl);
                    }
                }

                // Also collect drawing if exists and starts with http
                if (cfg.drawing && typeof cfg.drawing === 'string' && cfg.drawing.startsWith('http')) {
                    allPhotoUrls.push(cfg.drawing);
                }
            }
        }

        // Deduplicate URLs just in case
        const uniquePhotoUrls = Array.from(new Set(allPhotoUrls));

        // 5. Send to Telegram
        // Logic: 
        // - No photos: sendMessage with text + buttons
        // - 1 photo: sendPhoto with text caption + buttons
        // - Multiple photos: sendMediaGroup with photos, then sendMessage with details + buttons
        
        const hasPhotos = uniquePhotoUrls.length > 0;
        const multiplePhotos = uniquePhotoUrls.length > 1;

        if (multiplePhotos) {
            // First send the media group
            const mediaGroup = uniquePhotoUrls.slice(0, 10).map((url) => ({
                type: 'photo',
                media: url
            }));

            await fetch(`${TELEGRAM_API}/sendMediaGroup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    media: mediaGroup
                })
            });

            // Then send the text with buttons
            const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: text,
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard }
                })
            });
            const result = await res.json();
            if (result.ok) {
                await serviceClient.from('orders').update({
                    telegram_message_id: result.result.message_id,
                    telegram_chat_id: TELEGRAM_CHAT_ID
                }).eq('id', orderId);
            }
            return result.ok;
        } else {
            const primaryPhotoUrl = uniquePhotoUrls[0] || null;
            const endpoint = primaryPhotoUrl ? 'sendPhoto' : 'sendMessage';
            const payload: any = {
                chat_id: TELEGRAM_CHAT_ID,
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard }
            };

            if (primaryPhotoUrl) {
                payload.photo = primaryPhotoUrl;
                payload.caption = text;
            } else {
                payload.text = text;
            }

            const res = await fetch(`${TELEGRAM_API}/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errText = await res.text();
                console.error('[notifyAdminNewOrder] Telegram HTTP error:', res.status, errText);
                return false;
            }
            const result = await res.json();
            if (result.ok) {
                const updatedAddr = typeof deliveryAddr === 'string' 
                    ? { street: deliveryAddr, lang: finalLang } 
                    : { ...deliveryAddr, lang: finalLang };

                await serviceClient.from('orders').update({
                    telegram_message_id: result.result.message_id,
                    telegram_chat_id: TELEGRAM_CHAT_ID,
                    delivery_address: updatedAddr
                }).eq('id', orderId);
                return true;
            }
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

    // 2. ALWAYS SYNC: Update the Admin Group message
    // We do this first so that the shop staff sees the update even if the customer part fails.
    try {
        await updateAdminOrderMessage(orderId);
    } catch (adminErr) {
        console.error('[notifyPayment] Admin Sync Error:', adminErr);
    }

    // 3. Customer Notification (Private Chat)
    const profile = Array.isArray(orderWithLogs.profiles) ? orderWithLogs.profiles[0] : orderWithLogs.profiles;
    if (!profile || !profile.telegram_id) {
        // POS orders often don't have a linked customer telegram_id. 
        // We skip private notification but admin sync (Step 2) is already done.
        return;
    }
    
    const clientLang = resolveTgLang(profile.tg_lang);

    // 4. Delete previous message if it exists
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

    // 5. Build and Send unified message
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

        const hasPhoto = isPhotoOrder(order);
        const endpoint = hasPhoto ? 'editMessageCaption' : 'editMessageText';
        const payload: any = {
            chat_id: order.telegram_chat_id,
            message_id: order.telegram_message_id,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard }
        };

        if (hasPhoto) {
            payload.caption = text;
        } else {
            payload.text = text;
        }

        await fetch(`${TELEGRAM_API}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (err) {
        console.error('[updateAdminOrderMessage] Error:', err);
    }
}
