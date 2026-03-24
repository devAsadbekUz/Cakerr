/**
 * Centralized configuration for order statuses
 * This ensures consistency between the Web UI (Admin/Client) and the Telegram Bot
 */

export const ORDER_STATUSES = [
    {
        id: 'new',
        label: 'Buyurtma qabul qilindi',
        tgLabel: '🆕 Yangi',
        desc: 'Sizning buyurtmangiz tizimga tushdi',
        nextAction: 'confirmed',
        nextLabel: '✅ Tasdiqlash'
    },
    {
        id: 'confirmed',
        label: 'Tasdiqlandi',
        tgLabel: '✅ Tasdiqlangan',
        desc: 'Buyurtmangiz menejer tomonidan tasdiqlandi',
        nextAction: 'preparing',
        nextLabel: '🍳 Pishirishni boshlash'
    },
    {
        id: 'preparing',
        label: 'Tayyorlanmoqda',
        tgLabel: '🍳 Pishirilmoqda',
        desc: 'Sizning shirinligingiz pishirilmoqda',
        nextAction: 'ready',
        nextLabel: '📦 Tayyor'
    },
    {
        id: 'ready',
        label: 'Tayyor',
        tgLabel: '📦 Tayyor',
        desc: 'Buyurtmangiz qadoqlandi va tayyor holatga keldi',
        nextAction: 'delivering',
        nextLabel: '🚗 Yetkazishni boshlash'
    },
    {
        id: 'delivering',
        label: 'Yo\'lda',
        tgLabel: '🚗 Yo\'lda',
        desc: 'Buyurtmangiz kuryerga topshirildi',
        nextAction: 'completed',
        nextLabel: '✅ Yetkazildi'
    },
    {
        id: 'completed',
        label: 'Yetkazildi',
        tgLabel: '✅ Yetkazildi',
        desc: 'Buyurtmangiz muvaffaqiyatli yetkazildi',
        nextAction: null,
        nextLabel: null
    },
    {
        id: 'cancelled',
        label: 'Bekor qilindi',
        tgLabel: '❌ Bekor qilindi',
        desc: 'Buyurtma bekor qilindi',
        nextAction: null,
        nextLabel: null
    }
];

export type OrderStatus = typeof ORDER_STATUSES[number]['id'];

export const getStatusConfig = (id: string) => {
    return ORDER_STATUSES.find(s => s.id === id) || ORDER_STATUSES[0];
};

/**
 * Gets the next possible status transitions for Telegram buttons
 */
export const getTelegramButtons = (status: string, orderId: string) => {
    const current = getStatusConfig(status);
    if (!current || !current.nextAction) return [];

    const buttons = [
        { text: current.nextLabel!, callback_data: `${current.nextAction}_${orderId}` }
    ];

    // Always allow cancellation if it's a new order
    if (status === 'new') {
        buttons.push({ text: '❌ Bekor qilish', callback_data: `cancel_${orderId}` });
    }

    return [buttons]; // Telegram expects an array of arrays (rows)
};

/**
 * Builds the Telegram message text for an order
 */
export const buildOrderMessage = (order: any, statusLabel: string) => {
    const shortId = order.id.slice(0, 8);
    let messageText = `🎂 *BUYURTMA* [${statusLabel}]\n`;
    messageText += `📋 *ID:* #${shortId}\n\n`;

    if (order.profiles) {
        // Handle both object and array response from Supabase
        const profile = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles;
        if (profile) {
            messageText += `👤 *Mijoz:* ${profile.full_name || 'Noma\'lum'}\n`;
            messageText += `📞 *Telefon:* ${profile.phone_number || 'Noma\'lum'}\n\n`;
        }
    }

    if (order.delivery_address) {
        // Handle delivery_address as both string (legacy) and object
        const addrObj = typeof order.delivery_address === 'string'
            ? { street: order.delivery_address }
            : order.delivery_address;

        let street = addrObj.street || 'Manzil ko\'rsatilmagan';

        // Wrap address in Map link if coordinates exist
        if (addrObj.lat && addrObj.lng) {
            street = `[${street}](https://www.google.com/maps?q=${addrObj.lat},${addrObj.lng})`;
        }
        
        messageText += `📍 *Manzil:* ${street}\n`;
    }

    const dateFormatted = order.delivery_time ? new Date(order.delivery_time).toLocaleDateString('uz-UZ') : 'Noma\'lum';
    messageText += `📅 *Vaqt:* ${dateFormatted}, ${order.delivery_slot || 'Noma\'lum'}\n\n`;

    if (order.order_items?.length) {
        messageText += `🛒 *Mahsulotlar:*\n`;
        order.order_items.forEach((item: any) => {
            const portionText = item.configuration?.portion ? ` (${item.configuration.portion})` : '';
            messageText += `  • ${item.quantity}x ${item.name}${portionText} - ${(item.unit_price * item.quantity).toLocaleString()} so'm\n`;
        });
    }

    if (order.comment) {
        messageText += `\n💬 *Izoh:* "${order.comment}"\n`;
    }

    if (order.total_price) {
        messageText += `\n💰 *Jami:* ${Number(order.total_price).toLocaleString()} so'm`;
    }

    return messageText;
};

