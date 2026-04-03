import { getStatusConfig, tgEscape } from '@/app/utils/orderConfig';
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
    
    // If the customer hasn't linked Telegram to their account, there's nobody to notify via Telegram.
    if (!profile?.telegram_id) {
        return;
    }

    // Determine the customer's preferred language. This fixes the legacy bug where the 
    // web api was trying to send the message in the Admin's language.
    const clientLang = resolveTgLang(profile.tg_lang);

    // 1. Delete previous message if it exists to prevent chat clutter
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

    const clientMessage = `${clientLabels.title}\n\n${clientLabels.text}\n\n*${tgEscape(statusLabel)}*\n_${tgEscape(statusDesc)}_`;

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
