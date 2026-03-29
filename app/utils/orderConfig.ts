/**
 * Centralized configuration for order statuses
 * This ensures consistency between the Web UI (Admin/Client) and the Telegram Bot
 */

export const ORDER_STATUSES = [
    {
        id: 'new',
        labels: { uz: 'Buyurtma qabul qilindi', ru: 'Заказ принят' },
        tgLabels: { uz: '🆕 Yangi', ru: '🆕 Новый' },
        descs: { uz: 'Sizning buyurtmangiz tizimga tushdi', ru: 'Ваш заказ поступил в систему' },
        nextAction: 'confirmed',
        nextLabels: { uz: '✅ Tasdiqlash', ru: '✅ Подтвердить' }
    },
    {
        id: 'confirmed',
        labels: { uz: 'Tasdiqlandi', ru: 'Подтвержден' },
        tgLabels: { uz: '✅ Tasdiqlangan', ru: '✅ Подтвержден' },
        descs: { uz: 'Buyurtmangiz menejer tomonidan tasdiqlandi', ru: 'Ваш заказ подтвержден менеджером' },
        nextAction: 'preparing',
        nextLabels: { uz: '🍳 Pishirishni boshlash', ru: '🍳 Начать готовить' }
    },
    {
        id: 'preparing',
        labels: { uz: 'Tayyorlanmoqda', ru: 'Готовится' },
        tgLabels: { uz: '🍳 Pishirilmoqda', ru: '🍳 Готовится' },
        descs: { uz: 'Sizning shirinligingiz pishirilmoqda', ru: 'Ваша сладость готовится' },
        nextAction: 'ready',
        nextLabels: { uz: '📦 Tayyor', ru: '📦 Готово' }
    },
    {
        id: 'ready',
        labels: { uz: 'Tayyor', ru: 'Готов' },
        tgLabels: { uz: '📦 Tayyor', ru: '📦 Готов' },
        descs: { uz: 'Buyurtmangiz qadoqlandi va tayyor holatga keldi', ru: 'Ваш заказ упакован и готов' },
        nextAction: 'delivering',
        nextLabels: { uz: '🚗 Yetkazishni boshlash', ru: '🚗 Начать доставку' }
    },
    {
        id: 'delivering',
        labels: { uz: 'Yo\'lda', ru: 'В пути' },
        tgLabels: { uz: '🚗 Yo\'lda', ru: '🚗 В пути' },
        descs: { uz: 'Buyurtmangiz kuryerga topshirildi', ru: 'Ваш заказ передан курьеру' },
        nextAction: 'completed',
        nextLabels: { uz: '✅ Yetkazildi', ru: '✅ Доставлено' }
    },
    {
        id: 'completed',
        labels: { uz: 'Yetkazildi', ru: 'Доставлен' },
        tgLabels: { uz: '✅ Yetkazildi', ru: '✅ Доставлен' },
        descs: { uz: 'Buyurtmangiz muvaffaqiyatli yetkazildi', ru: 'Ваш заказ успешно доставлен' },
        nextAction: null,
        nextLabels: null
    },
    {
        id: 'cancelled',
        labels: { uz: 'Bekor qilindi', ru: 'Отменен' },
        tgLabels: { uz: '❌ Bekor qilindi', ru: '❌ Отменен' },
        descs: { uz: 'Buyurtma bekor qilindi', ru: 'Заказ отменен' },
        nextAction: null,
        nextLabels: null
    }
];

export type OrderStatus = typeof ORDER_STATUSES[number]['id'];

export const getStatusConfig = (id: string) => {
    return ORDER_STATUSES.find(s => s.id === id) || ORDER_STATUSES[0];
};

/**
 * Gets the next possible status transitions for Telegram buttons
 */
export const getTelegramButtons = (status: string, orderId: string, lang: 'uz' | 'ru' = 'uz') => {
    const current = getStatusConfig(status);
    if (!current || !current.nextAction) return [];

    const buttons = [
        { text: current.nextLabels![lang], callback_data: `${current.nextAction}_${orderId}_${lang}` }
    ];

    // Always allow cancellation if it's a new order
    if (status === 'new') {
        buttons.push({ text: lang === 'uz' ? '❌ Bekor qilish' : '❌ Отменить', callback_data: `cancel_${orderId}_${lang}` });
    }

    return [buttons]; // Telegram expects an array of arrays (rows)
};

/**
 * Builds the Telegram message text for an order
 */
export const buildOrderMessage = (order: any, lang: 'uz' | 'ru' = 'uz') => {
    const statusConfig = getStatusConfig(order.status);
    const statusLabel = statusConfig.tgLabels[lang];
    const shortId = order.id.slice(0, 8);
    
    const t = {
        uz: {
            order: "BUYURTMA",
            client: "Mijoz",
            phone: "Telefon",
            address: "Manzil",
            noAddress: "Manzil ko'rsatilmagan",
            time: "Vaqt",
            unknown: "Noma'lum",
            products: "Mahsulotlar",
            comment: "Izoh",
            total: "Jami",
            som: "so'm"
        },
        ru: {
            order: "ЗАКАЗ",
            client: "Клиент",
            phone: "Телефон",
            address: "Адрес",
            noAddress: "Адрес не указан",
            time: "Время",
            unknown: "Неизвестно",
            products: "Товары",
            comment: "Комментарий",
            total: "Итого",
            som: "сум"
        }
    }[lang];

    let messageText = `🎂 *${t.order}* [${statusLabel}]\n`;
    messageText += `📋 *ID:* #${shortId}\n\n`;

    if (order.profiles) {
        const profile = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles;
        if (profile) {
            messageText += `👤 *${t.client}:* ${profile.full_name || t.unknown}\n`;
            messageText += `📞 *${t.phone}:* ${profile.phone_number || t.unknown}\n\n`;
        }
    }

    if (order.delivery_address) {
        const addrObj = typeof order.delivery_address === 'string'
            ? { street: order.delivery_address }
            : order.delivery_address;

        let street = addrObj.street || t.noAddress;
        if (addrObj.lat && addrObj.lng) {
            street = `[${street}](https://www.google.com/maps?q=${addrObj.lat},${addrObj.lng})`;
        }
        messageText += `📍 *${t.address}:* ${street}\n`;
    }

    let dateFormatted = t.unknown;
    if (order.delivery_time) {
        const d = new Date(order.delivery_time);
        if (!isNaN(d.getTime())) {
            dateFormatted = d.toLocaleDateString(lang === 'uz' ? 'uz-UZ' : 'ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } else {
            // Fallback for raw strings if needed
            dateFormatted = String(order.delivery_time);
        }
    }
    
    messageText += `📅 *${t.time}:* ${dateFormatted}, ${order.delivery_slot || t.unknown}\n\n`;

    if (order.order_items?.length) {
        messageText += `🛒 *${t.products}:*\n`;
        order.order_items.forEach((item: any) => {
            const portionText = item.configuration?.portion ? ` (${item.configuration.portion})` : '';
            messageText += `  • ${item.quantity}x ${item.name}${portionText} - ${(item.unit_price * item.quantity).toLocaleString()} ${t.som}\n`;
        });
    }

    if (order.comment) {
        messageText += `\n💬 *${t.comment}:* "${order.comment}"\n`;
    }

    if (order.total_price) {
        messageText += `\n💰 *${t.total}:* ${Number(order.total_price).toLocaleString()} ${t.som}`;
    }

    return messageText;
};

/**
 * Robustly parses a language value from various database formats (String, JSONB Object, Quoted String)
 */
export const parseLang = (val: any): 'uz' | 'ru' => {
    if (!val) return 'uz';
    let str = '';
    if (typeof val === 'string') str = val;
    else if (typeof val === 'object') str = val.lang || '';
    
    // Strip quotes and normalize
    str = str.replace(/['"]+/g, '').trim().toLowerCase();
    return (str === 'ru') ? 'ru' : 'uz';
};

/**
 * Resolves the final language for an order based on priority:
 * 1. Saved order preference (delivery_address.lang)
 * 2. Admin's global preference (app_settings.admin_tg_lang)
 * 3. Fallback (callback data or customer choice)
 */
export const resolveOrderLanguage = (params: {
    orderSavedLang?: any;
    adminPreferredLang?: any;
    fallbackLang?: any;
}): 'uz' | 'ru' => {
    // 1. Check common Admin preference (The currently globally selected language in the Dashboard)
    // The user wants the bot to follow the Admin setting primarily.
    const adminRaw = params.adminPreferredLang;
    if (adminRaw) {
        return parseLang(adminRaw);
    }

    // 2. Check saved order preference (Historical context if Admin setting is somehow missing)
    const savedRaw = params.orderSavedLang;
    if (savedRaw) {
        return parseLang(savedRaw);
    }

    // 3. Last resort: use the requested fallback (callback data or client input)
    return parseLang(params.fallbackLang);
};

